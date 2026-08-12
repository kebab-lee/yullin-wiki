// =============================================================
// 신고·댓글 관리 화면의 표시 문구
//
// admin/users/labels.ts 와 짝이 되는 파일이다. 값(DB)과 표시명을 잇는 자리를
// 한 곳으로 둔다 — 필터 탭·상태 배지·목록이 각자 문자열을 적으면 같은 값이
// 화면마다 다른 모양으로 그려진다.
//
// **사유·상태의 문구 자체는 여기 없다.** 그것은 validation/report 가 소유한다
// (REASON_LABEL / REPORT_STATUS_LABEL) — 신고 팝업(클라이언트)과 관리 화면이
// 같은 문구를 써야 하고, 팝업은 어드민 컴포넌트를 import 할 수 없기 때문이다.
// 여기 있는 것은 **관리 화면에서만 쓰는** 색과 대체 문구다.
// =============================================================

import type { CommentReportStatus } from "@/lib/types";

/**
 * 처리 상태 배지의 색.
 *
 * 미처리만 눈에 띄는 색이다 — 이 화면에서 관리자가 찾아야 하는 것은 아직
 * 처리하지 않은 신고이고, 종결된 둘은 이력으로 남아 있을 뿐이다
 * (USER_STATUS_BADGE_CLASS 가 탈퇴만 회색으로 둔 것과 같은 결).
 */
export const REPORT_STATUS_BADGE_CLASS: Record<CommentReportStatus, string> = {
  PENDING: "bg-brand-red text-white",
  RESOLVED_DELETED: "bg-gray2 text-gray4",
  RESOLVED_IGNORED: "bg-gray2 text-gray4",
};

/**
 * 익명으로 작성된 댓글임을 알리는 표식.
 *
 * **실명을 대체하는 문구가 아니라 실명 옆에 붙는 꼬리표다.** 관리 화면은 실제
 * 작성자를 보여주지만(처리에 필요하다), 그 사람이 익명으로 썼다는 사실도
 * 판단 재료라 함께 그린다 — 공개 화면의 "익명"(CommentItem)과 역할이 다르다.
 */
export const ANONYMOUS_BADGE = "익명";

/**
 * 탈퇴 회원.
 *
 * **다시 적지 않고 admin/users 에서 빌려 온다.** 같은 사실을 가리키는 문구라
 * 두 벌이 되면 한쪽만 고쳐진다 (ArticleHeader·CommentItem 도 같은 값을 쓴다).
 * 여기서 re-export 하는 것은 이 폴더의 화면들이 labels 하나만 import 하면 되게
 * 하려는 것이고, 정본은 저쪽이다.
 */
export { WITHDRAWN_USER_NAME } from "@/components/admin/users/labels";

/** 댓글이 달렸던 게시물이 지워진 경우. 신고·댓글 목록이 함께 쓴다. */
export const DELETED_PAGE_TITLE = "(삭제된 게시물)";

/** 이미 지워진 댓글. 관리 목록은 삭제분도 싣는다. */
export const DELETED_COMMENT_BADGE = "삭제됨";
