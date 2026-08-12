-- =============================================================
-- comment_reports 조회 인덱스 보강
--
-- ── 이 파일이 테이블을 만들지 않는 이유 ──────────────────────
-- comment_reports 는 init(20260804000000)에 이미 있다. 신고 슬라이스를 시작하며
-- 다시 확인한 결과 컬럼·제약이 전부 그대로 쓸 수 있는 상태였다:
--
--   · reason  varchar + CHECK 6값 (SPAM / ABUSE / OBSCENE / PRIVACY /
--             FALSE_INFO / ETC). native ENUM 이 아니므로 JPA
--             @Enumerated(EnumType.STRING) 로 그대로 매핑된다.
--   · status  varchar + CHECK 3값 (PENDING / RESOLVED_DELETED /
--             RESOLVED_IGNORED). **차단은 여기 없다** — 차단의 정본은
--             users.status 이고, 신고 상태에도 넣으면 같은 사실을 두 컬럼이
--             주장하게 된다 (CLAUDE.md "상태 플래그를 두 벌 만들지 않는다").
--   · unique (comment_id, reporter_id) — 같은 사람이 같은 댓글을 두 번 신고할
--             수 없다. service 에서 세어 막지 않고 DB 제약으로 두는 이유는
--             SELECT 와 INSERT 사이에 같은 요청이 두 번 오면 둘 다 통과하기
--             때문이다(TOCTOU). 제약이 있으면 두 번째가 23505 로 떨어진다.
--   · handled_by / handled_at — 누가 언제 처리했는가. 신고 처리는 되돌리는
--             UI 가 없는 종점이라 "누가 눌렀는가"가 남지 않으면 추적할 재료가
--             아무 데도 없다 (댓글에는 page_revisions 같은 이력 테이블이 없다).
--
-- 그래서 이번에 실제로 모자란 것은 인덱스 둘뿐이다.
-- =============================================================

-- ① FK 컬럼 인덱스.
-- Postgres 는 참조하는 쪽 컬럼에 인덱스를 자동 생성하지 않는다 (init 의
-- idx_pages_category_id 와 같은 이유). 이게 없으면 두 경로가 full scan 이다:
--   · "이 댓글에 달린 신고들" — 신고 처리 화면이 댓글 단위로 상태를 옮길 때.
--   · comments 삭제 시의 on delete cascade 검사.
create index comment_reports_comment_idx on comment_reports (comment_id);

-- ② 전체·처리완료 목록 정렬.
-- 기존 comment_reports_pending_idx 는 `where status = 'PENDING'` partial 이라
-- 미처리 목록만 커버한다. 어드민 신고 관리는 상태 필터가 "전체 / 미처리 /
-- 삭제 종결 / 무시 종결" 넷이고 나머지 셋은 인덱스 없이 정렬된다.
-- partial 을 상태별로 세 벌 만들지 않고 정렬 컬럼 하나로 덮는다 — 신고는
-- 게시물·사용자보다 훨씬 적은 테이블이라 status 조건은 필터로 충분하다.
create index comment_reports_created_idx on comment_reports (created_at desc);
