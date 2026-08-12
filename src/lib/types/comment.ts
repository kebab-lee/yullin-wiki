// =============================================================
// comments / comment_reports 도메인 모델
//
// DB 컬럼(snake_case) → camelCase 변환은 repository의 책임이다.
// =============================================================

import type { UserStatus } from "./user";

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

/**
 * comment_reports.status — varchar + CHECK
 *
 * **종결 상태가 둘로 갈려 있는 것이 의도다.** `RESOLVED` 하나로 합치면 "댓글을
 * 지워서 끝난 신고"와 "신고를 무시해서 끝난 신고"가 같은 값이 되어, 같은 댓글이
 * 다시 신고됐을 때 관리자가 이전 판단을 볼 재료가 사라진다.
 *
 * **차단(BLOCKED)은 여기 없다.** 신고 처리 화면의 세 번째 액션이 "작성자 차단"
 * 이지만 그 상태의 정본은 users.status 다 — 신고 쪽에도 값을 두면 같은 사실을
 * 두 컬럼이 주장하게 된다. 차단은 신고를 종결시키지도 않는다(차단 후에도 그
 * 댓글을 지울지 남길지는 따로 정한다).
 */
export type CommentReportStatus =
  | "PENDING"
  | "RESOLVED_DELETED"
  | "RESOLVED_IGNORED";

/** repository 가 신고 한 건을 만들 때 받는 값. */
export interface CreateCommentReportData {
  commentId: string;
  reporterId: string;
  reason: CommentReportReason;
}

/**
 * 어드민 신고 관리 목록 한 줄 (`/admin/reports`).
 *
 * ── 익명 댓글의 실제 작성자를 싣는다 ────────────────────────
 * 공개 계약(CommentView)이 authorId 조차 빼는 것과 정반대다. 근거는 이 화면이
 * 할 수 있는 일에 있다 — 처리 액션 셋 중 하나가 **작성자 차단**인데, 누구를
 * 차단하는지 모르는 채로 누르는 버튼은 만들 수 없다. types 맨 위
 * CommentWithAuthor 주석이 "어드민 화면은 실제 작성자를 봐야 한다"고 미리
 * 못박아 둔 자리가 여기다.
 *
 * **isAnonymous 를 함께 싣는다.** 실명을 보여준다고 익명이었다는 사실까지
 * 지우면 안 된다 — "익명으로 쓴 글"과 "실명으로 쓴 글"은 관리자의 처리 판단이
 * 달라질 수 있는 정보다. 화면은 실명 옆에 익명 표식을 함께 그린다.
 *
 * 이 모델이 나가는 곳은 `GET /api/admin/reports` 하나이고, 그 라우트는
 * reportService 의 assertRole("ADMIN") 뒤에 있다.
 */
export interface AdminReportSummary {
  id: string;
  status: CommentReportStatus;
  reason: CommentReportReason;
  /** 신고 접수 시각. ISO 8601. */
  createdAt: string;

  /** 신고자 표시명. 탈퇴 회원이면 null. */
  reporterName: string | null;

  commentId: string;
  /** 신고당한 댓글 본문. 이미 삭제된 댓글도 그대로 보인다(아래 commentStatus). */
  commentContent: string;
  /**
   * 댓글이 아직 살아 있는가. DELETED 면 "댓글 삭제" 액션이 의미를 잃는다 —
   * 다른 관리자가 이미 지웠거나 작성자가 스스로 거둔 경우다.
   */
  commentStatus: CommentStatus;

  /** 신고당한 댓글의 작성자. 차단 액션의 대상이다. */
  authorId: string;
  authorName: string | null;
  authorStatus: UserStatus;
  isAnonymous: boolean;

  /** 댓글이 달린 게시물. 지워진 게시물이면 title 이 null 이다. */
  pageId: string;
  pageTitle: string | null;
}

/**
 * 어드민 최근 댓글 목록 한 줄 (`/admin/comments`).
 *
 * **AdminReportSummary 를 재사용하지 않는다.** 이 화면이 답하는 질문은 "무슨
 * 댓글이 달렸는가"이지 "누가 무엇을 신고했는가"가 아니다 — 신고자·사유·처리
 * 상태 칸이 통째로 없다. 한 타입으로 묶으면 이 목록의 응답에도 그 칸들이
 * 생겨서 "최근 댓글 목록이 신고 정보를 안다"는 없는 계약이 만들어진다
 * (AdminPageSummary 를 PageSummary 에서 나눈 것과 같은 근거).
 *
 * MyCommentSummary 와도 다르다. 저쪽은 전부 내 댓글이라 작성자 칸이 필요 없다.
 */
export interface AdminCommentSummary {
  id: string;
  content: string;
  createdAt: string;
  status: CommentStatus;

  /** 실제 작성자. 익명 댓글도 실명이 실린다 (AdminReportSummary 와 같은 근거). */
  authorId: string;
  authorName: string | null;
  isAnonymous: boolean;

  pageId: string;
  /** 지워진 게시물이면 null. 문구는 화면이 정한다. */
  pageTitle: string | null;
}

/**
 * 대시보드 카드의 **repository 쪽 모델**. service 가 CommentPreview 로 옮긴다.
 *
 * CommentPreview 와 나눠 둔 것은 CommentWithAuthor / CommentView 를 나눈 것과
 * 똑같은 이유다 — repository 는 실제 작성자명과 익명 여부를 그대로 올리고,
 * "익명을 가린다"는 업무 규칙은 service 가 적용한다. 여기서 미리 가려 버리면
 * 같은 조회를 쓰는 다른 화면이 실제 값을 볼 방법이 없어진다.
 */
export interface DashboardComment {
  id: string;
  content: string;
  createdAt: string;
  /** 실제 작성자명. 탈퇴 회원이면 null. */
  authorName: string | null;
  isAnonymous: boolean;
  pageId: string;
  /** 지워진 게시물이면 빈 문자열이 아니라 null 이다. 문구는 화면이 정한다. */
  pageTitle: string | null;
  commentCount: number;
}

/**
 * 어드민 대시보드 "최근 달린 댓글" 카드 (Figma 1:2184).
 *
 * **AdminCommentSummary 와 나눠 둔다.** 카드는 목록과 그리는 칸이 다르다 —
 * 게시물의 댓글 수(commentCount)가 카드에만 있고, 반대로 status·isAnonymous 는
 * 카드가 쓰지 않는다(대시보드는 조작이 없는 미리보기라 지워진 댓글이 애초에
 * 실리지 않는다).
 */
export interface CommentPreview {
  id: string;

  /**
   * 표시용 작성자명. **익명 댓글과 탈퇴 회원이 둘 다 null 이다** — CommentView
   * 와 같은 계약이다. 문구("익명" / "(탈퇴한 사용자)")는 화면이 정하고, 두
   * 경우를 가르는 것은 isAnonymous 다.
   *
   * 관리 목록(AdminReportSummary · AdminCommentSummary)이 실명을 그대로 싣는
   * 것과 반대인 이유는 화면이 할 수 있는 일에 있다 — 저쪽은 작성자를 상대로
   * 차단·삭제를 하는 화면이라 누구인지 알아야 하지만, 대시보드 카드는 조작이
   * 없는 미리보기다. 볼 이유가 없는 자리에서는 안 보이는 편이 맞다.
   */
  authorName: string | null;
  isAnonymous: boolean;

  /** 작성 시각. ISO 8601 — 포맷은 화면이 한다 (format/date 가 정본). */
  createdAt: string;

  content: string;

  /** 댓글이 달린 게시물. 카드 전체가 이 글로 가는 링크다. */
  pageId: string;
  /** 지워진 게시물이면 null. 대체 문구는 화면의 몫이다. */
  pageTitle: string | null;

  /** 해당 게시물의 댓글 수. 카드의 말풍선 배지에 들어간다. */
  commentCount: number;
}

/**
 * 어드민 대시보드 "댓글 신고 관리" 카드 (Figma 1:2208).
 */
export interface ReportPreview {
  id: string;

  /** 신고당한 댓글의 작성자 표시명. 익명은 가린다 (CommentPreview 와 같은 규칙). */
  author: string;

  /** 신고당한 댓글 내용 */
  content: string;

  /**
   * 사람이 읽을 신고 사유 문구.
   *
   * **한 건당 하나다.** 시안 mock 에 있던 "A, B 외 1" 같은 합침 문자열을 만들지
   * 않는다 — 그러려면 댓글 단위로 신고를 묶어야 하는데, 목록(`/admin/reports`)은
   * 신고 한 건이 한 줄인 화면이라 대시보드만 다른 단위로 세면 "미처리 3건"이
   * 가리키는 대상이 두 화면에서 달라진다. 코드값은 CommentReportReason 이고
   * 문구로 옮기는 것은 화면 레이어(validation/report 의 REASON_LABEL)다.
   */
  reason: string;

  /** 아직 처리하지 않은 신고(status === 'PENDING') 표시 */
  isNew: boolean;
}
