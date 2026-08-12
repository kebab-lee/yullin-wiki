// =============================================================
// 댓글 신고 서비스
//
// ── 왜 commentService 가 아니라 별도 파일인가 ────────────────
// service 는 라우트가 아니라 **도메인**으로 나눈다 (CLAUDE.md "레이어 규칙").
// 신고는 자기 테이블(comment_reports)과 자기 수명주기(접수 → 종결)를 가진
// 별개의 도메인이고, 댓글은 신고의 대상일 뿐이다.
//
// 더 결정적인 것은 **처리 액션이 두 도메인을 오케스트레이션한다**는 점이다:
// 신고 처리는 댓글을 지우거나(commentService) 사용자를 차단한다(userService).
// 이 함수들을 commentService 에 넣으면 그 파일이 사용자 도메인을 부르게 되고,
// userService 에 넣으면 반대가 된다. 둘 다 부르는 쪽은 위층인 여기다.
//
// HTTP 를 모른다. 실패는 도메인 에러로 던지고 Route Handler 가 옮긴다.
//
// **모든 관리자 함수가 assertRole(session, "ADMIN") 으로 시작한다.** 신고 처리는
// 사용자 차단과 한 화면에 있어 사용자 관리와 같은 층위다 — EDITOR 가 아니다.
// =============================================================

import { assertAuthenticated, assertRole } from "@/lib/auth/guards";
import type { SessionPayload } from "@/lib/auth/session";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import * as commentReportRepository from "@/lib/repositories/commentReportRepository";
import * as commentRepository from "@/lib/repositories/commentRepository";
import * as commentService from "@/lib/services/commentService";
import type {
  AdminReportSummary,
  CommentReportStatus,
  ReportPreview,
} from "@/lib/types";
import {
  REPORT_ALREADY_FILED,
  REPORT_ALREADY_HANDLED,
  REPORT_NOT_FOUND,
  REPORT_SELF_COMMENT,
  parseReportReason,
  parseReportStatusFilter,
  type ReportAction,
} from "@/lib/validation/report";
import { COMMENT_NOT_FOUND } from "@/lib/validation/comment";

/** 신고 목록 한 페이지의 기본 건수. 다른 관리 목록과 같은 20 이다. */
const DEFAULT_REPORT_PAGE_SIZE = 20;

/** 한 번에 실어 나를 수 있는 최대 건수. 임의로 큰 size 를 막는다. */
const MAX_REPORT_PAGE_SIZE = 50;

/** 대시보드 "댓글 신고 관리" 카드 수. Figma 1:2208 기준 3장. */
const DASHBOARD_REPORT_LIMIT = 3;

function positiveInt(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(Math.trunc(value), 1);
}

// ── 사용자: 신고 접수 ─────────────────────────────────────────
/**
 * 댓글을 신고한다.
 *
 * 순서에 규칙이 있다.
 *   ① assertAuthenticated — 첫 줄. **비로그인 신고는 없다.** 신고는 누가 했는지
 *      기록되어야 하는 행위다 — 익명 신고를 받으면 같은 사람이 한 댓글을 몇
 *      번이고 신고할 수 있고(중복 제약이 reporter_id 에 걸려 있다), 악의적
 *      신고를 추적할 재료도 없다.
 *   ② 사유 검증 — 선택지 6개 중 하나여야 한다. 자유 텍스트는 받지 않는다
 *      (근거는 validation/report 의 parseReportReason 주석).
 *   ③ 대상 댓글 확인 — 실재하고 지워지지 않았는가. 이미 지워진 댓글을 신고해
 *      봐야 관리자가 할 일이 없다.
 *   ④ 자기 댓글인가 — 거절.
 *   ⑤ INSERT. 중복이면 ConflictError.
 *
 * ── ④ 자기 댓글을 신고할 수 없는 이유 ──────────────────────
 * 자기 발언에 대한 조치는 신고가 아니라 삭제이고, 그 경로는 이미 있다
 * (deleteComment 의 작성자 본인 규칙). 자기 신고를 허용하면 관리자의 미처리
 * 목록에 처리할 것이 없는 줄이 쌓인다.
 *
 * **익명으로 쓴 자기 댓글도 막힌다.** 화면에는 "익명"으로 보여도 authorId 는
 * 그대로 기록되어 있어서 판정에 문제가 없다 — 익명은 표시일 뿐이라는 도메인
 * 결정이 여기서도 값을 한다. 이 응답으로 익명 작성자가 드러나지는 않는다:
 * 신고 버튼은 애초에 자기 댓글에 그려지지 않고(isMine), 그 판정도 서버가 한다.
 *
 * ── ⑤ 중복을 SELECT 로 미리 세지 않는다 ────────────────────
 * unique 제약(comment_reports_unique)에 맡기고 23505 를 repository 가 boolean
 * 으로 옮긴다. 미리 세면 그 조회와 INSERT 사이에 같은 요청이 두 번 왔을 때 둘
 * 다 통과한다(TOCTOU) — 역할 변경·탈퇴에서 관리자 수를 세지 않기로 한 것과
 * 같은 판단이다.
 *
 * **돌려주는 값이 없다.** 신고자가 받는 것은 "신고가 접수되었습니다"(Figma
 * 1:1255) 하나뿐이다. 신고 내역을 되돌려 보내면 그 응답으로 남이 이 댓글을
 * 몇 번 신고했는지, 처리가 됐는지를 들여다보는 경로가 생긴다 — **신고 사실은
 * 신고자 본인 외에는 아무에게도 보이면 안 된다**(관리자 제외).
 */
export async function createReport(
  session: SessionPayload | null,
  commentId: string,
  input: unknown,
): Promise<void> {
  assertAuthenticated(session);

  const parsed = parseReportReason(input);
  if (!parsed.ok) throw new ValidationError({ reason: parsed.message });

  const comment = await commentRepository.findById(commentId);
  if (!comment || comment.status !== "VISIBLE") {
    throw new NotFoundError(COMMENT_NOT_FOUND);
  }

  if (comment.authorId === session.userId) {
    throw new ForbiddenError(REPORT_SELF_COMMENT);
  }

  const created = await commentReportRepository.create({
    commentId,
    reporterId: session.userId,
    reason: parsed.reason,
  });

  // 값 자체는 올바르나 이미 점유된 상태다 → 409 (errors.ts 의 ConflictError 규칙).
  // 필드 문구로 주는 것은 팝업이 사유 라디오 아래에 그대로 띄울 수 있어서다.
  if (!created) {
    throw new ConflictError({ reason: REPORT_ALREADY_FILED });
  }
}

// ── 관리자: 조회 ──────────────────────────────────────────────
/**
 * 신고 관리 목록 (`/admin/reports`).
 *
 * **assertRole 이 첫 줄이다.** 파라미터를 다듬는 것조차 그 뒤다 — 권한 없는
 * 요청에 응답 모양이 조금이라도 새어나가면 안 된다.
 *
 * **기준이 ADMIN 이다. EDITOR 가 아니다.** 이 화면에는 사용자 차단이 걸려 있어
 * 계정을 다루는 화면이고, 그건 글을 다루는 권한과 층위가 다르다
 * (listUsersForAdmin 과 같은 선). 화면 가드 requireRole("ADMIN") 와 같은
 * 기준이며, 그쪽이 이 가드를 대체하지 않는다 — API 는 화면을 거치지 않는다.
 *
 * 필터 값을 여기서 던지지 않고 접는 이유와, 적용된 값을 되돌려주는 이유는
 * validation/report 의 parseReportStatusFilter 주석에 있다.
 */
export async function listReportsForAdmin(
  session: SessionPayload | null,
  params: { status?: unknown; page?: number; size?: number } = {},
): Promise<{
  items: AdminReportSummary[];
  total: number;
  page: number;
  size: number;
  status: CommentReportStatus | null;
}> {
  assertRole(session, "ADMIN");

  const status = parseReportStatusFilter(params.status);
  const window = {
    page: positiveInt(params.page, 1),
    size: Math.min(
      positiveInt(params.size, DEFAULT_REPORT_PAGE_SIZE),
      MAX_REPORT_PAGE_SIZE,
    ),
  };

  const { items, total } = await commentReportRepository.findForAdmin({
    ...window,
    status,
  });

  // "필터 없음"은 undefined 가 아니라 null 로 답한다. JSON 은 undefined 를
  // 직렬화하며 키를 통째로 지워버려, 클라이언트가 "전체"와 "이 서버는 status 를
  // 모른다"를 구분할 수 없게 된다 (listUsersForAdmin 과 같은 규칙).
  return { items, total, ...window, status: status ?? null };
}

/**
 * 대시보드 "댓글 신고 관리" 카드 (Figma 1:2208).
 *
 * 미처리 신고만 싣는다 — 대시보드가 답하는 질문은 "지금 처리할 것이 있는가"다.
 *
 * **익명을 가리지 않는다.** 댓글 대시보드(listRecentCommentsForDashboard)와
 * 반대이고, 그 이유는 이 카드를 볼 수 있는 사람이 ADMIN 뿐이기 때문이다 —
 * 카드를 누르면 가는 곳이 실명과 차단 버튼이 있는 신고 관리 화면이라, 여기서만
 * 가려 봐야 한 클릭 뒤에 드러난다. 대신 댓글 쪽은 EDITOR 도 보는 화면이다.
 */
export async function listRecentReportsForDashboard(
  session: SessionPayload | null,
): Promise<ReportPreview[]> {
  assertRole(session, "ADMIN");

  const reports = await commentReportRepository.findRecentPending(
    DASHBOARD_REPORT_LIMIT,
  );

  return reports.map((report) => ({
    id: report.id,
    // 탈퇴 회원의 대체 문구는 화면이 정한다. 카드의 author 는 문자열 한 칸짜리
    // 계약이라 빈 값으로 두고 화면이 채운다 — 여기서 "(탈퇴한 사용자)" 를 적으면
    // 같은 문구가 컴포넌트와 두 벌이 된다.
    author: report.authorName ?? "",
    content: report.commentContent,
    // 코드값 → 문구 변환은 화면 레이어(REASON_LABEL)가 한다. service 가 옮기면
    // 시안 문구가 바뀔 때 서버 코드를 고치게 된다.
    reason: report.reason,
    isNew: report.status === "PENDING",
  }));
}

// ── 관리자: 처리 ──────────────────────────────────────────────
/**
 * 신고를 처리한다 — 댓글 삭제 또는 무시.
 *
 * **차단은 여기 없다.** 차단은 신고를 종결시키는 조작이 아니라 사용자 상태를
 * 바꾸는 별개의 일이라 userService.blockUser 로 간다 (근거는 validation/report
 * 의 REPORT_ACTIONS 주석). 한 요청에 묶으면 "차단하되 댓글은 남긴다"는 정상적인
 * 처리를 표현할 수 없다.
 *
 * 순서에 규칙이 있다.
 *   ① 권한 — ADMIN 만.
 *   ② 대상 신고가 있는가 — 없으면 404.
 *   ③ 이미 처리됐는가 — 거절. 두 관리자가 같은 신고를 동시에 열었을 때 뒤늦은
 *      쪽이 앞선 판단을 조용히 덮어쓰지 않게 한다. handled_by 가 남는 값이라
 *      덮어쓰면 "누가 처리했는가"가 바뀐다.
 *   ④ 액션 수행.
 *
 * ── 두 액션의 종결 범위가 다르다 ────────────────────────────
 * · **DELETE_COMMENT** — 댓글을 지우고, 그 댓글에 걸린 **미처리 신고를 모두**
 *   종결한다. 신고의 대상이 사라졌으면 걸려 있던 신고들의 답이 다 같기
 *   때문이다. 한 건만 종결하면 이미 지워진 댓글이 미처리 목록에 계속 뜬다.
 * · **IGNORE** — **이 신고 한 건만** 종결한다. 무시는 "이 사유로는 조치하지
 *   않는다"는 판단이라, 같은 댓글에 달린 다른 사유의 신고까지 함께 무시할
 *   근거가 없다 (스팸 신고를 기각했다고 개인정보 노출 신고도 기각되는 것은
 *   아니다).
 *
 * 삭제는 commentService 를 거친다. repository 를 직접 부르면 삭제 권한 규칙이
 * 두 곳에 생긴다 — 그쪽이 "누가 남의 발언을 내릴 수 있는가"의 정본이다.
 * 이미 지워진 댓글(다른 관리자가 먼저 지웠거나 작성자가 거둔 경우)에 대해서는
 * 삭제를 건너뛰고 신고만 종결한다 — 그 상황에서 404 를 던지면 관리자가 목록에
 * 남은 신고를 영영 정리할 수 없다.
 */
export async function resolveReport(
  session: SessionPayload | null,
  reportId: string,
  action: ReportAction,
): Promise<void> {
  assertRole(session, "ADMIN");

  const report = await commentReportRepository.findById(reportId);
  if (!report) throw new NotFoundError(REPORT_NOT_FOUND);

  if (report.status !== "PENDING") {
    throw new ForbiddenError(REPORT_ALREADY_HANDLED);
  }

  if (action === "IGNORE") {
    await commentReportRepository.resolve(
      reportId,
      "RESOLVED_IGNORED",
      session.userId,
    );
    return;
  }

  // 이미 지워진 댓글이면 삭제를 건너뛴다 (위 주석 참조).
  if (report.commentStatus === "VISIBLE") {
    await commentService.deleteComment(session, report.commentId);
  }

  await commentReportRepository.resolveAllPendingForComment(
    report.commentId,
    "RESOLVED_DELETED",
    session.userId,
  );
}
