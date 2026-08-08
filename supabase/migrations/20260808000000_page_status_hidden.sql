-- =============================================================
-- pages.status 2단계(DRAFT/PUBLISHED) → 3단계(DRAFT/PUBLISHED/HIDDEN)
--
-- 임시저장과 숨김은 다른 축이 아니라 **같은 status 축의 다른 값**이다.
--   DRAFT      작성 중. 아직 발행 전. 공개 노출 없음.
--   PUBLISHED  발행됨. 공개 목록·검색·상세에 노출된다.
--   HIDDEN     발행됐으나 운영상 감춤. 공개 노출 제외, 어드민 목록에는 보인다.
--
-- **삭제는 여기 넣지 않는다.** deleted_at(timestamptz)이 이미 있고 그것이 정본이다.
-- users 가 쓰는 규칙(status = 'WITHDRAWN' + deleted_at)과 같은 결이며, "언제
-- 지웠나"는 status 로 표현할 수 없다. status 는 상태, deleted_at 은 시각 기록이라
-- 플래그가 두 벌이 되는 것도 아니다.
--
-- 값은 대문자를 유지한다 (role·status 와 같은 규칙, @Enumerated(EnumType.STRING)).
--
-- ── 이 파일이 하지 않는 일과 그 이유 ─────────────────────────
-- ① deleted_at 추가 없음 — init(20260804000000)에 이미 있다.
-- ② 기존 데이터 변환 없음 — 적용 시점의 pages 는 PUBLISHED 11건(그 중 삭제분 2건)
--    뿐이고 DRAFT 는 0건이다. DRAFT/PUBLISHED 는 새 CHECK 에서도 그대로 유효하다.
-- ③ search_pages() 재정의 없음 — 20260807000000 의 함수 본문이 이미
--    `status = 'PUBLISHED' and deleted_at is null` 로 좁히고 있어서, HIDDEN 은
--    값이 추가되는 것만으로 검색에서 자동으로 빠진다. 같은 본문을 한 번 더
--    적으면 정본이 두 마이그레이션으로 갈린다.
-- ④ 인덱스 변경 없음 — pages_public_idx / pages_recent_idx / pages_draft_idx 는
--    전부 status 를 명시한 partial 이라 HIDDEN 행이 끼어들지 않는다.
-- =============================================================

alter table pages drop constraint pages_status_chk;

alter table pages add constraint pages_status_chk
  check (status in ('DRAFT', 'PUBLISHED', 'HIDDEN'));

-- pages_published_at_chk 는 그대로 둔다.
--   check (status <> 'PUBLISHED' or published_at is not null)
-- HIDDEN 은 "발행된 적 있는 글"이므로 published_at 을 지우지 않는다. 숨김을 풀면
-- 원래 발행 시각 그대로 목록의 제자리로 돌아가야 하고, 지웠다가 되살리면
-- 숨김 해제가 곧 "새 글로 올라오기"가 된다. 그래서 이 제약은 HIDDEN 에 대해
-- 아무 말도 하지 않는 편이 맞다 — 값이 있어도 없어도 통과한다.

comment on column pages.status is
  'DRAFT(작성 중) / PUBLISHED(공개) / HIDDEN(발행 후 운영상 감춤). 삭제는 deleted_at.';
