// =============================================================
// 댓글 신고 검증
//
// 신고 사유·처리 상태라는 **닫힌 목록**을 좁히는 자리다. 값의 정본은
// comment_reports 의 CHECK 제약이고, 여기는 그 목록을 TS 로 옮긴 사본이다 —
// 둘이 어긋나면 신고가 23514(check_violation)로 떨어진다.
//
// validation/userAdmin 과 같은 결의 파일이다. 라우트가 `as CommentReportReason`
// 으로 단정하지 않도록 좁히기를 검증 쪽에 모은다.
//
// React·DOM 을 모른다. 신고 팝업(클라이언트)과 reportService(서버)가 같은
// 목록을 쓴다 — 폼이 선택지를 손으로 적으면 사유가 하나 늘 때 조용히 빠진다.
// =============================================================

import type {
  CommentReportReason,
  CommentReportStatus,
  UserStatus,
} from "@/lib/types";

/**
 * 관리자가 바꿀 수 있는 계정 상태.
 *
 * UserStatus 에서 WITHDRAWN 을 뺀 것이다 — 근거는 parseBlockChange 주석에 있다.
 */
export type BlockableStatus = Extract<UserStatus, "ACTIVE" | "BLOCKED">;

// ── 사유 ──────────────────────────────────────────────────────
/**
 * 신고 사유. **Figma 신고 팝업(1:1246)의 6개 항목과 1:1 이다.**
 *
 * 순서가 곧 팝업의 표시 순서다 (시안 Frame 1525: 항목 6개 × 32px, 간격 36).
 * 화면이 자기 배열을 따로 만들지 않고 이 상수를 그대로 map 한다.
 */
export const COMMENT_REPORT_REASONS: readonly CommentReportReason[] = [
  "SPAM",
  "ABUSE",
  "OBSCENE",
  "PRIVACY",
  "FALSE_INFO",
  "ETC",
];

/**
 * 사유의 표시 문구.
 *
 * ── 문구와 코드값을 가르는 이유 ─────────────────────────────
 * DB 에는 코드값(SPAM …)만 들어간다. 문구를 저장하면 시안이 한 글자 바뀔 때마다
 * 기존 신고 행을 전부 UPDATE 해야 하고, Java 이관 시 enum 상수명이 한글이 된다
 * (categories 가 slug 와 표시명을 가른 것과 같은 규칙 — 분기 조건에 표시명을
 * 쓰지 않는다).
 *
 * ⚠️ **SPAM · ABUSE · PRIVACY 세 문구만 Figma 확정이다.** 어드민 대시보드에
 * 남아 있던 시안 mock 에서 그대로 옮겼다. 나머지 셋(OBSCENE / FALSE_INFO / ETC)
 * 은 확정 문구를 확인하지 못해 같은 세트의 통상 표현으로 채웠다. Figma MCP
 * 호출 한도가 풀리면 1:1246 을 읽어 대조하되, **고칠 곳은 이 객체 하나다** —
 * 코드값·DB·API 계약은 문구가 바뀌어도 그대로다.
 */
export const REASON_LABEL: Record<CommentReportReason, string> = {
  SPAM: "스팸홍보/도배글",
  ABUSE: "욕설/생명경시/혐오/차별적 표현",
  OBSCENE: "음란물/불건전한 대화",
  PRIVACY: "개인정보 노출 우려",
  FALSE_INFO: "사실과 다른 정보",
  ETC: "기타",
};

// ── 처리 상태 ─────────────────────────────────────────────────
/** 상태 필터 탭의 목록. USER_STATUSES 와 같은 용도다. */
export const COMMENT_REPORT_STATUSES: readonly CommentReportStatus[] = [
  "PENDING",
  "RESOLVED_DELETED",
  "RESOLVED_IGNORED",
];

/** 처리 상태의 표시 문구. admin/users 의 USER_STATUS_LABEL 과 짝이다. */
export const REPORT_STATUS_LABEL: Record<CommentReportStatus, string> = {
  PENDING: "미처리",
  RESOLVED_DELETED: "삭제 처리",
  RESOLVED_IGNORED: "무시",
};

// ── 문구 ──────────────────────────────────────────────────────
export const REASON_UNKNOWN = "⚠️ 신고 사유를 선택해주세요.";
export const REPORT_SELF_COMMENT = "본인이 작성한 댓글은 신고할 수 없습니다.";
export const REPORT_ALREADY_FILED = "이미 신고한 댓글입니다.";
export const REPORT_NOT_FOUND = "신고 내역을 찾을 수 없습니다.";
export const REPORT_ALREADY_HANDLED = "이미 처리된 신고입니다.";

/** 차단된 사용자가 댓글을 쓰려 할 때. 시안 문구(1:2516)와 같은 사실을 가리킨다. */
export const COMMENT_BLOCKED_AUTHOR =
  "댓글 작성이 제한된 계정입니다. 문화팀으로 문의해주세요.";

/** 차단 대상이 될 수 없는 계정. userAdmin 의 역할 변경 규칙과 같은 판단이다. */
export const BLOCK_SELF = "본인 계정은 차단할 수 없습니다.";
export const BLOCK_ADMIN_TARGET = "관리자 계정은 차단할 수 없습니다.";
export const BLOCK_WITHDRAWN_TARGET = "탈퇴한 계정은 차단할 수 없습니다.";

// ── 좁히기 ────────────────────────────────────────────────────
/** 밖에서 들어온 값이 신고 사유인가. */
export function isCommentReportReason(
  value: unknown,
): value is CommentReportReason {
  return (
    typeof value === "string" &&
    (COMMENT_REPORT_REASONS as readonly string[]).includes(value)
  );
}

/** 밖에서 들어온 값이 처리 상태인가. */
export function isCommentReportStatus(
  value: unknown,
): value is CommentReportStatus {
  return (
    typeof value === "string" &&
    (COMMENT_REPORT_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * `?status=` 를 좁힌다. 없거나 모르는 값이면 undefined = 전체.
 *
 * ValidationError 로 던지지 않는다 — 사용자가 채운 입력 칸이 아니라 화면이
 * 붙이는 파라미터라 틀렸을 때 문구를 띄울 자리가 없다 (parseUserStatusFilter 와
 * 같은 판단). 서버가 실제로 적용한 값은 응답에 되돌려준다.
 */
export function parseReportStatusFilter(
  value: unknown,
): CommentReportStatus | undefined {
  return isCommentReportStatus(value) ? value : undefined;
}

export type ReportReasonParseResult =
  | { readonly ok: true; readonly reason: CommentReportReason }
  | { readonly ok: false; readonly message: string };

/**
 * `POST /api/comments/[id]/reports` 의 바디를 좁힌다.
 *
 * **자유 텍스트 칸이 없다.** 사유는 선택지 6개뿐이고 "기타"에도 설명을 받지
 * 않는다 — 받는 순간 신뢰 경계 밖의 문자열이 어드민 화면에 그려지는 경로가
 * 하나 더 생기고(댓글 본문과 같은 부담), 그 값을 검증·저장·렌더할 규칙을
 * 통째로 더 만들어야 한다. 선택지만으로 처리 판단이 안 되는 신고는 관리자가
 * 원문을 직접 읽으면 된다 — 목록이 이미 댓글 본문을 싣는다.
 */
export function parseReportReason(body: unknown): ReportReasonParseResult {
  const source: Record<string, unknown> =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  return isCommentReportReason(source.reason)
    ? { ok: true, reason: source.reason }
    : { ok: false, message: REASON_UNKNOWN };
}

/**
 * 신고 처리 액션. `PATCH /api/admin/reports/[id]` 의 바디다.
 *
 * **차단(BLOCK)이 여기 없다.** 차단은 신고를 종결시키는 조작이 아니라 사용자
 * 상태를 바꾸는 별개의 일이라 `PATCH /api/admin/users/[id]/status` 로 간다 —
 * 한 요청에 묶으면 "차단했지만 댓글은 남긴다"는 정상적인 처리를 표현할 수 없고,
 * 사용자 관리 화면의 차단 버튼과 규칙이 두 벌이 된다.
 */
export const REPORT_ACTIONS = ["DELETE_COMMENT", "IGNORE"] as const;

export type ReportAction = (typeof REPORT_ACTIONS)[number];

export const ACTION_UNKNOWN = "⚠️ 알 수 없는 처리 방식입니다.";

export type ReportActionParseResult =
  | { readonly ok: true; readonly action: ReportAction }
  | { readonly ok: false; readonly message: string };

export function parseReportAction(body: unknown): ReportActionParseResult {
  const source: Record<string, unknown> =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  return typeof source.action === "string" &&
    (REPORT_ACTIONS as readonly string[]).includes(source.action)
    ? { ok: true, action: source.action as ReportAction }
    : { ok: false, message: ACTION_UNKNOWN };
}

// ── 사용자 차단 바디 ──────────────────────────────────────────
export type BlockChangeParseResult =
  | { readonly ok: true; readonly status: BlockableStatus }
  | { readonly ok: false; readonly message: string };

export const BLOCK_STATUS_UNKNOWN = "⚠️ 알 수 없는 계정 상태입니다.";

/**
 * `PATCH /api/admin/users/[id]/status` 의 바디를 좁힌다.
 *
 * **WITHDRAWN 을 받지 않는다.** 탈퇴는 본인만 할 수 있는 되돌릴 수 없는 종점이고
 * (userService.withdrawMe), 관리자가 남을 탈퇴시키는 경로는 화면에도 정책에도
 * 없다. 목록을 UserStatus 전체로 열어 두면 그 경로가 이 라우트로 생긴다 —
 * 받을 자리가 없으면 그 요청 자체가 성립하지 않는다 (UpdateUserData 에 role 이
 * 없는 것과 같은 장치).
 */
export function parseBlockChange(body: unknown): BlockChangeParseResult {
  const source: Record<string, unknown> =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  return source.status === "ACTIVE" || source.status === "BLOCKED"
    ? { ok: true, status: source.status }
    : { ok: false, message: BLOCK_STATUS_UNKNOWN };
}
