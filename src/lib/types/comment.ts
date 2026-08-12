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

/**
 * 작성자 표시명이 붙은 댓글. repository 가 users 조인으로 채워서 돌려준다.
 *
 * **name 은 익명 여부와 무관하게 실제 값이다.** 가리는 일은 service 가 한다 —
 * 어드민 화면은 같은 repository 결과에서 실제 작성자를 봐야 하고, 조회 시점에
 * 이미 지워 버리면 그 화면이 다시 조회할 방법이 없다.
 *
 * 탈퇴 회원은 users.name 이 NULL 이다. "(탈퇴한 사용자)" 같은 문구는 여기서
 * 만들지 않는다 — 그건 화면의 몫이다 (ArticleHeader 와 같은 규칙).
 */
export interface CommentWithAuthor extends Comment {
  authorName: string | null;
}

/**
 * 공개 화면에 내려보내는 댓글. `GET /api/pages/[id]/comments` 의 계약이다.
 *
 * **authorId 가 없다.** 익명 댓글이 authorId 를 달고 나가면, 같은 사람이 다른
 * 글에 남긴 실명 댓글과 대조하는 것만으로 익명이 곧바로 풀린다. "표시만 익명"의
 * 표시 범위는 화면이 아니라 **응답**이어야 한다.
 *
 * 대신 isMine 을 싣는다. 삭제 버튼을 그릴지 판단하려면 "내 댓글인가"만 알면
 * 되는데, 그 답은 authorId 를 내려보내지 않고도 서버가 계산해 줄 수 있다.
 * 이건 표시용 판정이고 실제 차단은 commentService 의 삭제 권한 검사가 한다.
 */
export interface CommentView {
  id: string;
  /** 최상위 댓글이면 null. 대댓글은 1단계까지만 존재한다. */
  parentId: string | null;

  /**
   * 표시용 작성자명. **익명 댓글과 탈퇴 회원이 둘 다 null 이다** —
   * 두 경우를 가르는 것은 isAnonymous 이며, 문구("익명" / "(탈퇴한 사용자)")는
   * 화면이 정한다.
   */
  authorName: string | null;
  isAnonymous: boolean;

  /** 지금 요청한 사람이 쓴 댓글인가. 비로그인 요청에서는 전부 false 다. */
  isMine: boolean;

  /** 평문이다. 리치 텍스트가 아니며 HTML 로 해석하지 않는다. */
  content: string;
  createdAt: string;
}

/** repository 가 댓글 한 건을 만들 때 받는 값. */
export interface CreateCommentData {
  pageId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  isAnonymous: boolean;
}

/**
 * 마이페이지 "내 댓글 모아보기" 한 줄 (Figma 1:1047).
 *
 * CommentView 를 재사용하지 않는다. 이 목록이 답하는 질문은 "누가 썼는가"가
 * 아니라 **"어느 글에 썼는가"** 라서 작성자 칸이 통째로 필요 없고, 대신
 * 게시물 제목·링크가 필요하다. 익명 여부도 싣지 않는다 — 내 댓글 목록에서
 * 나에게 나를 가릴 이유가 없다.
 */
export interface MyCommentSummary {
  id: string;
  pageId: string;
  /** 댓글이 달린 게시물 제목. 지워진 게시물이면 null. */
  pageTitle: string | null;
  content: string;
  createdAt: string;
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
