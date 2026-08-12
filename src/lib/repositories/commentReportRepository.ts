// =============================================================
// comment_reports 테이블 접근
//
// DB row(snake_case)를 도메인 모델(AdminReportSummary, camelCase)로 옮기는 것이
// 이 레이어의 책임이다. PostgREST 임베디드 조회의 중첩 모양
// (`comment: { author: { name } }`)도 여기서 평평하게 편다 — 그 모양이 위로
// 새면 Java 백엔드로 갈아끼울 때 프론트까지 흔들린다.
//
// **익명 처리를 여기서 하지 않는다.** commentRepository 와 같은 규칙이다:
// authorName 은 언제나 실제 값이고 가리는 판단은 service 가 한다. 신고 관리
// 화면은 오히려 그 실제 값을 봐야 한다 (types/comment.ts AdminReportSummary 주석).
// =============================================================

import type {
  AdminReportSummary,
  CommentReportReason,
  CommentReportStatus,
  CommentStatus,
  CreateCommentReportData,
  UserStatus,
} from "@/lib/types";

import { getSupabase } from "./supabaseClient";

const TABLE = "comment_reports";

/**
 * 어드민 목록이 읽는 컬럼.
 *
 * 조인이 세 겹이다: 신고 → 댓글 → (작성자 · 게시물), 그리고 신고 → 신고자.
 * 한 왕복에 받는 이유는 목록 20건에 대해 따로 조회하면 요청이 61번이 되기
 * 때문이다 (commentRepository 의 COMMENT_COLUMNS 와 같은 근거).
 *
 * **작성자에서 status 까지 읽는다.** 차단 버튼을 "차단 / 차단 해제" 중 어느
 * 쪽으로 그릴지가 그 값에 달려 있고, 없으면 화면이 눌러 보고 나서야 안다.
 */
/*
 * ⚠️ **한 줄로 유지한다.** 이 문자열은 PostgREST 의 `select=` 쿼리 파라미터로
 * 그대로 나가므로 줄바꿈·들여쓰기를 넣으면 안 된다.
 *
 * ⚠️ **reporter 조인에 FK 이름을 명시하는 것이 필수다.** comment_reports 는
 * users 를 두 번 참조한다(reporter_id · handled_by). 그냥 `users(name)` 이라고
 * 쓰면 PostgREST 가 어느 관계인지 정하지 못하고 PGRST201 로 거절한다.
 * comments 쪽은 users 참조가 author_id 하나뿐이라 이름이 필요 없다.
 */
const REPORT_COLUMNS =
  "id, comment_id, reason, status, created_at, reporter:users!comment_reports_reporter_id_fkey(name), comment:comments(content, status, is_anonymous, author_id, page_id, author:users(name, status), page:pages(title))";

/** userRepository 와 같은 이유로 여기서도 끝낸다 — unique 제약 충돌. */
const PG_UNIQUE_VIOLATION = "23505";

/** commentRepository 와 같은 이유 — uuid 아닌 문자열 비교. */
const PG_INVALID_TEXT_REPRESENTATION = "22P02";

// ── row 타입 ──────────────────────────────────────────────────
/**
 * 임베디드 조회 결과.
 *
 * comment 가 nullable 인 것은 드라이버 사정이다 — comment_id 는 NOT NULL 이고
 * FK 에 `on delete cascade` 가 걸려 있어 부모가 사라지면 이 행도 함께 사라지므로,
 * 실제로 null 인 행은 존재할 수 없다. 그래도 타입에서 단정하지 않는다.
 */
type ReportRow = {
  id: string;
  comment_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: { name: string | null } | null;
  comment: {
    content: string;
    status: string;
    is_anonymous: boolean;
    author_id: string;
    page_id: string;
    author: { name: string | null; status: string } | null;
    page: { title: string } | null;
  } | null;
};

// ── 변환 ──────────────────────────────────────────────────────
/**
 * row → 도메인 모델.
 *
 * comment 조인이 비어 있는 행은 위 주석대로 존재할 수 없지만, 만약 왔다면
 * 목록에서 조용히 빠지는 편이 낫다 — 본문도 작성자도 없는 신고 줄은 관리자가
 * 아무 판단도 할 수 없고, 차단 버튼이 빈 authorId 로 그려지면 위험하다.
 * 그래서 null 을 돌려주고 호출부가 걸러낸다 (아래 findForAdmin).
 */
function toReport(row: ReportRow): AdminReportSummary | null {
  if (!row.comment) return null;

  return {
    id: row.id,
    // varchar + CHECK 제약이 값을 보증한다. 도메인 유니온으로 좁혀서 올린다.
    status: row.status as CommentReportStatus,
    reason: row.reason as CommentReportReason,
    createdAt: row.created_at,

    reporterName: row.reporter?.name ?? null,

    commentId: row.comment_id,
    commentContent: row.comment.content,
    commentStatus: row.comment.status as CommentStatus,

    authorId: row.comment.author_id,
    authorName: row.comment.author?.name ?? null,
    // 작성자 행은 FK(on delete restrict)가 보증하므로 조인이 빌 수 없다.
    // 그래도 드라이버가 null 을 줄 여지를 남겨 두고 ACTIVE 로 접는다 —
    // "모르면 차단되지 않은 것으로 본다"가 안전한 기본값이다(차단 버튼이 그려진다).
    authorStatus: (row.comment.author?.status ?? "ACTIVE") as UserStatus,
    isAnonymous: row.comment.is_anonymous,

    pageId: row.comment.page_id,
    // 게시물이 지워지면 조인 결과가 없다. 화면이 문구를 정한다.
    pageTitle: row.comment.page?.title ?? null,
  };
}

// ── 조회 ──────────────────────────────────────────────────────
/**
 * 어드민 신고 관리 목록 한 페이지 + 전체 건수.
 *
 * status 를 optional 로 받는다:
 *   undefined → 전체
 *   값이 있으면 → 그 값만
 * 기본값을 여기서 정하지 않는다 — "이 화면의 기본 필터가 무엇이냐"는 화면의
 * 규칙이다 (findUsersForAdmin 과 같은 구분).
 *
 * 정렬은 신고 접수 시각 내림차순이다. 관리 화면에서 먼저 봐야 할 것은 새로
 * 들어온 신고이고, comment_reports_created_idx 가 이 조회 그대로의 인덱스다
 * (미처리만 볼 때는 comment_reports_pending_idx 가 받는다).
 *
 * **처리된 신고를 거르지 않는다.** 종결된 신고가 목록에서 사라지면 "이 댓글을
 * 전에 어떻게 판단했는가"를 볼 방법이 화면에 남지 않는다. 보고 싶지 않으면
 * status 필터로 좁히면 된다 (findUsersForAdmin 이 탈퇴 계정을 거르지 않는 것과
 * 같은 근거).
 */
export async function findForAdmin({
  status,
  page,
  size,
}: {
  status?: CommentReportStatus;
  page: number;
  size: number;
}): Promise<{ items: AdminReportSummary[]; total: number }> {
  const from = (page - 1) * size;

  const query = getSupabase()
    .from(TABLE)
    .select(REPORT_COLUMNS, { count: "exact" });

  if (status) query.eq("status", status);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + size - 1)
    .returns<ReportRow[]>();

  if (error) throw new Error(`신고 목록 조회 실패: ${error.message}`);

  // total 은 서버가 센 값을 그대로 쓴다. 아래 filter 로 빠지는 행은 위 주석대로
  // 존재할 수 없으므로, 여기서 length 로 다시 세면 정상 상황에서 같은 값을
  // 두 번 계산하는 것일 뿐이고 페이지 수만 어긋날 여지가 생긴다.
  const items = (data ?? [])
    .map(toReport)
    .filter((report): report is AdminReportSummary => report !== null);

  return { items, total: count ?? 0 };
}

/**
 * 대시보드 카드용 최근 미처리 신고.
 *
 * **findForAdmin 을 limit 만 바꿔 부르지 않는다.** 저쪽은 `count: "exact"` 로
 * 전체 건수를 매번 세는데(페이지네이션이 그 값을 쓴다) 대시보드는 카드 3장만
 * 그리므로 그 비용이 통째로 낭비다. 조건도 PENDING 으로 고정이라 필터 인자가
 * 필요 없다 — 대시보드가 보여주는 것은 "지금 처리해야 할 것"이다.
 */
export async function findRecentPending(
  limit: number,
): Promise<AdminReportSummary[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(REPORT_COLUMNS)
    .eq("status", "PENDING" satisfies CommentReportStatus)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ReportRow[]>();

  if (error) throw new Error(`최근 신고 조회 실패: ${error.message}`);

  return (data ?? [])
    .map(toReport)
    .filter((report): report is AdminReportSummary => report !== null);
}

/** id 로 신고 한 건. 없으면 null. 처리 액션이 대상을 확인할 때 쓴다. */
export async function findById(
  id: string,
): Promise<AdminReportSummary | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(REPORT_COLUMNS)
    .eq("id", id)
    .maybeSingle<ReportRow>();

  if (error) {
    if (error.code === PG_INVALID_TEXT_REPRESENTATION) return null;
    throw new Error(`신고 조회 실패: ${error.message}`);
  }

  return data ? toReport(data) : null;
}

// ── 생성 ──────────────────────────────────────────────────────
/**
 * 신고 한 건을 만든다. 이미 신고한 댓글이면 false.
 *
 * ── 왜 예외가 아니라 boolean 인가 ────────────────────────────
 * 중복 신고는 오류가 아니라 **예상된 결과**다. unique 제약이 막아 주는 값이고
 * (comment_reports_unique), service 가 미리 SELECT 해서 거르는 방식은
 * 그 조회와 INSERT 사이에 같은 요청이 두 번 오면 둘 다 통과한다(TOCTOU).
 * 제약에 맡기고 23505 를 여기서 도메인 사실로 옮긴다 — 위 레이어는 Postgres
 * 에러 코드를 모른다 (userRepository.create 와 같은 규칙).
 *
 * status 를 넘기지 않는다. 새 신고는 언제나 PENDING 이고 그건 DB 기본값이
 * 이미 답하는 사실이다 — 여기서 다시 적으면 정본이 둘이 된다.
 *
 * 만들어진 행을 돌려주지 않는다. 신고자가 받는 것은 "접수되었습니다" 하나뿐이고
 * (Figma 1:1255), 신고 내용을 되돌려 보내면 그 응답으로 남의 신고 상태를
 * 들여다보는 경로가 생긴다.
 */
export async function create(
  data: CreateCommentReportData,
): Promise<boolean> {
  const { error } = await getSupabase().from(TABLE).insert({
    comment_id: data.commentId,
    reporter_id: data.reporterId,
    reason: data.reason,
  });

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) return false;
    throw new Error(`신고 접수 실패: ${error.message}`);
  }

  return true;
}

// ── 처리 ──────────────────────────────────────────────────────
/**
 * 신고를 종결 처리한다 — 상태 · 처리자 · 처리 시각을 한 번에 쓴다.
 *
 * **UPDATE 한 문장이다.** 셋을 나눠 쏘면 중간에 실패했을 때 "상태는 종결인데
 * 처리자는 비어 있는" 반쪽 행이 남는다. 단일 문이면 Postgres 가 문 단위로
 * 원자성을 보장하므로 트랜잭션을 따로 열 필요도 없다
 * (userRepository.withdraw 와 같은 규칙).
 *
 * PENDING 으로 되돌리는 경로가 아니다 — handled_by/handled_at 을 언제나 채우므로
 * 종결 전용이다. 되돌리기 UI 는 없다.
 */
export async function resolve(
  id: string,
  status: CommentReportStatus,
  handlerId: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .update({
      status,
      handled_by: handlerId,
      handled_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`신고 처리 실패: ${error.message}`);
}

/**
 * 한 댓글에 걸린 미처리 신고를 **모두** 같은 상태로 종결한다.
 *
 * 댓글 삭제로 신고를 처리할 때 쓴다. 누른 신고 한 건만 종결하면 같은 댓글에
 * 달린 다른 신고들이 PENDING 으로 남아서, 이미 지워진 댓글이 미처리 목록에
 * 계속 뜨고 관리자가 그걸 또 처리해야 한다 — 신고의 대상은 댓글이고 그 댓글이
 * 사라졌으면 걸려 있던 신고들의 답은 다 같다.
 *
 * **무시(IGNORE)에는 쓰지 않는다.** 그쪽은 신고 한 건에 대한 판단이라 같은
 * 댓글의 다른 사유까지 함께 무시할 근거가 없다 (reportService 주석 참조).
 */
export async function resolveAllPendingForComment(
  commentId: string,
  status: CommentReportStatus,
  handlerId: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .update({
      status,
      handled_by: handlerId,
      handled_at: new Date().toISOString(),
    })
    .eq("comment_id", commentId)
    .eq("status", "PENDING" satisfies CommentReportStatus);

  if (error) throw new Error(`신고 일괄 처리 실패: ${error.message}`);
}
