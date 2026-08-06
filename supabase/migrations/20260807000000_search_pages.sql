-- =============================================================
-- 게시물 검색 (pg_trgm)
--
-- init 마이그레이션은 검색을 `search_text` 생성 컬럼(title || ' ' || plain_text)
-- 하나에 GIN 트라이그램 인덱스를 걸어 두는 방식으로 잡아 두었다. 그 모양으로는
-- **제목 일치를 본문 일치보다 위로 올릴 수 없다** — 두 값이 한 문자열로 합쳐져
-- 있어서 어느 쪽에서 맞았는지 질의가 알 수 없기 때문이다.
--
-- 그래서 title 과 plain_text 에 각각 인덱스를 걸고, 합쳐 둔 컬럼과 그 인덱스는
-- 버린다. 남겨 두면 같은 텍스트에 GIN 인덱스가 셋(제목·본문·합본)이 되어 게시물
-- 저장·수정마다 쓰기 비용만 늘고, 아무 질의도 그 인덱스를 쓰지 않는다.
--
-- FTS(to_tsvector)를 쓰지 않는 이유는 init 의 주석 그대로다: 한국어는 기본 사전이
-- 형태소 분석을 못 해 조사를 떼어내지 못하고, 사전을 설치하는 순간 플랫폼 종속이
-- 생긴다. pg_trgm 은 표준 contrib 이라 RDS 로 옮겨도 그대로 동작한다.
-- =============================================================

-- pg_trgm 은 init 에서 이미 만들어져 있다. 이 파일 단독으로도 적용 가능하도록
-- 멱등하게 한 번 더 선언해 둔다.
create extension if not exists pg_trgm;

-- ── 인덱스 교체 ───────────────────────────────────────────────
drop index if exists pages_search_idx;

alter table pages drop column if exists search_text;

-- 제목 일치는 본문 일치보다 위로 올라가야 하므로 인덱스도 따로 간다.
create index pages_title_trgm_idx     on pages using gin (title      gin_trgm_ops);
create index pages_plain_text_trgm_idx on pages using gin (plain_text gin_trgm_ops);


-- ── 검색 질의 ─────────────────────────────────────────────────
-- 이 질의를 RPC 로 내리는 이유 (CLAUDE.md "DB 안에 넣는 로직은 최소로" 예외):
--   ① 유사도 정렬(word_similarity)은 PostgREST 로 표현할 수 없다. select 절에
--      계산식을 넣고 그 결과로 order by 를 걸어야 하는데 REST 문법에 그 자리가 없다.
--   ② 결과를 애플리케이션에서 정렬하면 정렬 전에 전체 후보를 다 실어 와야 해서
--      페이지네이션과 total 이 성립하지 않는다.
--   ③ Java 이관 시 이 함수 본문이 그대로 native query 가 된다. TS 쪽에 조합 로직을
--      두면 그 로직을 Java 로 다시 옮겨 적어야 한다.
--
-- ── 임계값과 회수(recall) 전략 ────────────────────────────────
-- similarity(a, b) 는 **두 문자열 전체**의 트라이그램 집합을 비교한다. 그래서
-- 짧은 검색어를 긴 본문과 재면 값이 0 에 수렴한다 — 본문에 검색어가 통째로 들어
-- 있어도 0.01 같은 수가 나온다. 임계값을 어떻게 잡아도 "본문 일치"를 못 잡는다.
--
-- 그래서 similarity() 대신 **word_similarity(질의, 대상)** 를 쓴다. 이쪽은 질의를
-- 대상의 **가장 비슷한 연속 구간** 하고만 비교하므로 대상 길이에 휘둘리지 않는다.
-- 검색어가 본문에 그대로 들어 있으면 1.0 이 나온다.
--
-- 회수는 두 갈래다:
--   ⓐ ILIKE '%검색어%'  — 정확히 들어 있는 문서. gin_trgm_ops 인덱스가 LIKE/ILIKE 를
--                        가속하므로 인덱스를 그대로 탄다. 오타가 없는 대부분의
--                        검색이 여기서 잡힌다.
--   ⓑ 질의 <% 대상      — 오타·활용형. word_similarity 연산자이며 역시 인덱스를 탄다.
--
-- **임계값은 0.4 다** (`pg_trgm.word_similarity_threshold`).
--   · 기본값 0.6 은 오타 한 글자에 이미 걸린다. "청소년부"(트라이그램 5개) 에서 한
--     글자가 틀리면 3개가 깨져 0.4 근처로 떨어지므로, 0.6 이면 오타 검색이 통째로
--     빈 결과가 된다 — 트라이그램을 쓰는 이유 자체가 사라진다.
--   · 0.3 이하로 내리면 두세 글자 검색어가 거의 모든 문서와 걸린다. 짧은 질의일수록
--     트라이그램 수가 적어 우연한 일치의 비중이 커지기 때문이다.
--   · 0.4 는 "한 글자 오타는 잡고 무관한 문서는 안 잡는" 구간이다.
-- GUC 를 세션에 의존하지 않고 함수의 SET 절로 못박는다 — 임계값이 검색 규칙의
-- 일부이므로 마이그레이션에 버전 관리되어야 하고, 커넥션 상태에 좌우되면 안 된다.
--
-- ── 정렬 ──────────────────────────────────────────────────────
--   score = word_similarity(질의, title) * 2 + word_similarity(질의, plain_text)
-- 제목에 가중치 2 를 준다. 검색어가 그대로 들어 있으면 각 항이 1.0 이므로
--   제목+본문 = 3.0  >  제목만 = 2.0  >  본문만 = 1.0
-- 이 되어 세 부류의 순서가 가중치 하나로 확정된다. 동점이면 최신순.
create or replace function search_pages(
  p_query  text,
  p_limit  integer,
  p_offset integer
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
set pg_trgm.word_similarity_threshold = 0.4
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
      and (
        p.title ilike q.pattern
        or p.plain_text ilike q.pattern
        or q.raw <% p.title
        or q.raw <% p.plain_text
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
    -- 전체 건수가 나온다. total 을 위해 같은 조건을 한 번 더 세지 않는다.
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

comment on function search_pages(text, integer, integer) is
  '공개 게시물 트라이그램 검색. 제목 가중치 2, word_similarity 임계값 0.4.';
