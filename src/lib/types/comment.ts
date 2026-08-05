// =============================================================
// comments / comment_reports 도메인 모델
//
// DB 컬럼(snake_case) → camelCase 변환은 repository의 책임이다.
// =============================================================

/** comments.status — varchar + CHECK */
export type CommentStatus = "VISIBLE" | "DELETED";

export interface Comment {
  id: string;
  pageId: string;

  /**
   * 익명 댓글도 작성자를 기록한다(NOT NULL).
   * isAnonymous는 화면 표시만 가린다 — 차단·내 댓글 모아보기가 작성자를 요구한다.
   */
  authorId: string;

  /** 대댓글의 부모. 디자인상 1단계까지만 허용하며 깊이 검증은 service가 한다. */
  parentId: string | null;

  content: string;
  isAnonymous: boolean;
  status: CommentStatus;

  createdAt: string;
  updatedAt: string;
}

/** comment_reports.reason — varchar + CHECK */
export type CommentReportReason =
  | "SPAM"
  | "ABUSE"
  | "OBSCENE"
  | "PRIVACY"
  | "FALSE_INFO"
  | "ETC";

/** comment_reports.status — varchar + CHECK */
export type CommentReportStatus =
  | "PENDING"
  | "RESOLVED_DELETED"
  | "RESOLVED_IGNORED";

/**
 * 어드민 대시보드 "최근 달린 댓글" 카드용 요약 모델.
 * 카드가 필요로 하는 값만 담는다 (작성자 표시명·게시물 제목은 조인 결과).
 */
export interface CommentPreview {
  id: string;

  /** 표시용 작성자명. 익명 댓글이면 service가 가린 값을 내려준다. */
  author: string;

  /** 표시용으로 포맷된 작성 시각 문자열 */
  date: string;

  content: string;

  /** 댓글이 달린 게시물 제목 */
  postTitle: string;

  /** 해당 게시물의 댓글 수 */
  commentCount: number;
}

/**
 * 어드민 대시보드 "댓글 신고 관리" 카드용 요약 모델.
 */
export interface ReportPreview {
  id: string;

  /** 신고당한 댓글의 표시용 작성자명 */
  author: string;

  /** 신고당한 댓글 내용 */
  content: string;
  /**
   * 사람이 읽을 신고 사유 문자열.
   * 여러 건이 모이면 "A, B 외 1" 형태로 service가 합쳐서 내려준다.
   * 원시 코드값이 필요하면 CommentReportReason을 쓴다.
   */
  reason: string;

  /** 아직 처리하지 않은 신고(status === 'PENDING') 표시 */
  isNew: boolean;
}
