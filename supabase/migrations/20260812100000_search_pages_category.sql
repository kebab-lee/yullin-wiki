-- =============================================================
-- 게시물 검색에 항목 필터를 더한다
--
-- 검색(`/search?q=`)과 항목 목록(`/categories/[slug]`)이 서로를 지우는 문제를
-- 없앤다. 두 조건은 공존해야 하므로 검색 질의가 항목으로 좁혀질 수 있어야 한다.
--
-- **필터는 기존 조건을 대체하지 않고 and 로 얹는다.** 공개 조건
-- (`status = 'PUBLISHED' and deleted_at is null`)과 정렬
-- (`word_similarity(q,title)*2 + word_similarity(q,plain_text)`)은 20260807000000
-- 그대로다 — 항목을 골랐다고 해서 순위 규칙이 달라질 이유가 없다.
--
-- **slug 가 아니라 category_id 를 받는다.** service 는 어차피 "없는 항목이면
-- 404" 를 판정하려고 categoryRepository.findBySlug 를 부르고, 그 조회가 id 를
-- 이미 손에 쥐여 준다. 여기서 slug 를 받으면 같은 항목을 두 번 찾게 되고
-- (service 한 번 + 함수 안 join 한 번) 함수가 categories 테이블까지 알아야 한다.
--
-- **null 은 "항목 필터 없음"이다.** 전체 검색은 예전과 완전히 같은 계획으로 돈다
-- (`p_category_id is null` 이 상수 참이라 옵티마이저가 통째로 접는다).
--
-- ⚠️ 시그니처가 3인자 → 4인자로 바뀐다. `create or replace` 는 인자 목록이 다르면
-- **교체가 아니라 오버로드**를 만들어서, 옛 3인자 함수가 남아 인자 없이 부르는
-- 코드가 조용히 필터 없는 판을 계속 쓰게 된다. 그래서 먼저 드롭한다.
--
-- ── 유사도 임계값 0.4 를 어디에 적는가 ────────────────────────
-- 20260807000000 은 이 값을 함수의 `SET pg_trgm.word_similarity_threshold = 0.4`
-- 절로 못박았다. **그 방식을 여기서 버린다** — 마이그레이션 롤에 이 파라미터를
-- 설정할 권한이 없어 push 가 거부된다.
--
-- 대신 임계값을 where 절에 **숫자로 직접 적는다**:
--   `q.raw <% p.title`  →  `word_similarity(q.raw, p.title) >= 0.4`
-- `<%` 연산자는 비교 기준을 세션 GUC 에서 읽으므로, GUC 를 못 박지 못하면 값이
-- 커넥션 상태에 좌우된다(같은 검색어가 커넥션에 따라 다른 결과를 낸다).
-- 부등식으로 적으면 임계값이 함수 본문에 박혀 마이그레이션으로 버전 관리되고,
-- Java 이관 시 native query 에 그대로 실려 간다.
--
-- **0.4 인 근거** (매직넘버가 아니다):
--   · 기본값 0.6 은 오타 한 글자에 이미 걸린다. "청소년부"(트라이그램 5개)에서 한
--     글자가 틀리면 3개가 깨져 0.4 근처로 떨어지므로, 0.6 이면 오타 검색이 통째로
--     빈 결과가 된다 — 트라이그램을 쓰는 이유 자체가 사라진다.
--   · 0.3 이하로 내리면 두세 글자 검색어가 거의 모든 문서와 걸린다. 짧은 질의일수록
--     트라이그램 수가 적어 우연한 일치의 비중이 커지기 때문이다.
--   · 0.4 는 "한 글자 오타는 잡고 무관한 문서는 안 잡는" 구간이다.
--   · **이 값을 낮춰서 검색 품질을 고치려 하지 마라** (CLAUDE.md "검색"): 가운데
--     오타는 임계값 조정으로 해결되지 않는 구조적 한계이며, 개선이 필요하면
--     형태소 분석기나 외부 검색엔진 도입이 별도 과제다.
--
-- ⚠️ **대가: 이 갈래는 더 이상 인덱스를 타지 않는다.** `<%` 는 gin_trgm_ops 가
-- 가속하지만 `word_similarity(...) >= 0.4` 는 평범한 함수 호출이라 그럴 수 없고,
-- OR 로 묶인 ILIKE 갈래까지 함께 순차 스캔이 된다. 공개 게시물 규모(수백 건)에서는
-- 문제되지 않는 비용이라 받아들인다. 규모가 커지면 그때 되돌릴 자리는 GUC 이며,
-- 그것은 권한 문제(위)를 먼저 푸는 일이다.
-- =============================================================

drop function if exists search_pages(text, integer, integer);

-- 항목으로 좁힌 검색이 category_id 로 먼저 걸러지도록 하는 인덱스는 이미 있다
-- (init 의 idx_pages_category_id). 새로 만들지 않는다.

create or replace function search_pages(
  p_query       text,
  p_category_id uuid,
  p_limit       integer,
  p_offset      integer
)
returns table (
  id            uuid,
  title         varchar(200),
  category_id   uuid,
  plain_text    text,
  published_at  timestamptz,
  tags          text[],
  comment_count bigint,
  total_count   bigint
)
language sql
stable
as $$
  with q as (
    select
      p_query as raw,
      -- 검색어는 사용자 입력이라 LIKE 메타문자(%, _)를 그대로 두면 "%" 한 글자가
      -- 전체 문서와 걸린다. 이스케이프해서 순수 문자열로 만든다.
      '%' || replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
        as pattern
  ),
  matched as (
    select
      p.id,
      p.title,
      p.category_id,
      p.plain_text,
      p.published_at,
      word_similarity(q.raw, p.title)      as title_sim,
      word_similarity(q.raw, p.plain_text) as body_sim
    from pages p
    cross join q
    -- 목록 조회와 **같은 공개 조건**이다. 임시저장·삭제분은 검색에도 안 나온다.
    where p.status = 'PUBLISHED'
      and p.deleted_at is null
      -- 항목 필터. 위 공개 조건에 얹히는 것이지 대체하는 것이 아니다.
      -- null 이면 상수 참이라 전체 검색과 같은 계획이 된다.
      and (p_category_id is null or p.category_id = p_category_id)
      -- 회수(recall)는 두 갈래다:
      --   ⓐ ILIKE '%검색어%'  정확히 들어 있는 문서. 오타 없는 대부분의 검색.
      --   ⓑ word_similarity >= 0.4  오타·활용형. 임계값의 근거는 파일 상단.
      and (
        p.title ilike q.pattern
        or p.plain_text ilike q.pattern
        or word_similarity(q.raw, p.title) >= 0.4
        or word_similarity(q.raw, p.plain_text) >= 0.4
      )
  )
  select
    m.id,
    m.title,
    m.category_id,
    m.plain_text,
    m.published_at,
    -- tags.name 은 varchar(30) 이라 그냥 모으면 varchar[] 가 된다. 반환 타입이
    -- text[] 이므로 여기서 맞춰 둔다 — 안 맞으면 "structure of query does not
    -- match function result type" 으로 함수 자체가 거절된다.
    coalesce(
      array_agg(t.name::text order by t.name) filter (where t.name is not null),
      '{}'::text[]
    ) as tags,
    -- 목록 카드와 같은 규칙: 삭제된 댓글은 개수에 넣지 않는다.
    (
      select count(*)
      from comments c
      where c.page_id = m.id and c.status = 'VISIBLE'
    ) as comment_count,
    -- 창(window) 함수는 group by 뒤 · limit 앞에 계산되므로 잘라내기 전의
    -- 전체 건수가 나온다. 항목 필터가 걸린 경우 **그 항목 안에서의** 건수다 —
    -- 화면의 "N개"와 마지막 페이지 계산이 같은 조건을 본다.
    count(*) over () as total_count
  from matched m
  left join page_tags pt on pt.page_id = m.id
  left join tags      t  on t.id = pt.tag_id
  group by
    m.id, m.title, m.category_id, m.plain_text, m.published_at,
    m.title_sim, m.body_sim
  order by
    (m.title_sim * 2 + m.body_sim) desc,
    m.published_at desc nulls last,
    -- 마지막 tiebreak. 없으면 동점 문서의 순서가 요청마다 흔들려 페이지 경계에서
    -- 같은 글이 두 번 보이거나 빠진다.
    m.id
  limit p_limit
  offset p_offset;
$$;

comment on function search_pages(text, uuid, integer, integer) is
  '공개 게시물 트라이그램 검색. 제목 가중치 2, word_similarity 임계값 0.4(본문에 상수로 박혀 있음 — 세션 GUC 에 의존하지 않는다). p_category_id 가 null 이면 전체 검색.';
