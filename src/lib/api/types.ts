// =============================================================
// API 응답 계약
//
// 서버(Route Handler)와 클라이언트 폼이 함께 보는 타입이라 여기 따로 둔다.
// handleError.ts 에 두면 클라이언트 컴포넌트가 next/server 를 끌어오게 된다.
//
// 이 모양은 백엔드가 Java 로 바뀌어도 유지된다 — 프론트가 안 바뀌는 지점.
// =============================================================

import type {
  AdminCategorySummary,
  AdminCommentSummary,
  AdminPageSummary,
  AdminReportSummary,
  AdminUserSummary,
  Category,
  CommentPreview,
  CommentReportStatus,
  CommentView,
  MyCommentSummary,
  PageDetail,
  PageStatus,
  PageSummary,
  ReportPreview,
  Role,
  User,
  UserStatus,
} from "@/lib/types";

/** 실패 응답 바디. 4xx/5xx 는 전부 이 모양이다. */
export type ApiErrorBody = {
  /** 폼 단위로 보여줄 문구. 필드별 문구가 있으면 폼은 그쪽을 우선한다. */
  message: string;
  /** 필드명 → 문구. 검증/중복 실패에만 실린다. */
  fields?: Record<string, string>;
};

/**
 * 성공 응답은 배열이 아니라 이름 붙은 객체로 감싼다.
 * 나중에 메타(총건수 등)가 붙어도 클라이언트 파싱이 안 깨진다.
 */

/** GET /api/categories */
export type CategoryListBody = { categories: Category[] };

/**
 * GET /api/admin/categories — 어드민 항목 관리 목록.
 *
 * **CategoryListBody 와 합치지 않는다.** 실리는 모델부터 다르고
 * (AdminCategorySummary 는 문서 수를 달고 있다), 한 타입으로 묶으면 공개 목록
 * 응답에도 그 칸이 생겨서 "홈과 푸터가 문서 수를 안다"는 없는 계약이 만들어진다
 * (AdminPageListBody 를 PagedPageListBody 에서 나눈 것과 같은 근거).
 *
 * total 이 없다. 항목은 세 개 규모라 페이지네이션이 없고, 서버가 접을 page/size 도
 * 없어서 되돌려줄 "적용된 값"이 아예 존재하지 않는다.
 */
export type AdminCategoryListBody = { categories: AdminCategorySummary[] };

/**
 * POST /api/admin/categories — 항목 추가 성공.
 * PATCH /api/admin/categories/[id] — 항목 수정 성공.
 *
 * 만들거나 고친 항목을 통째로 돌려주지 않는다. 화면이 성공 후에 하는 일은
 * 팝업을 닫고 목록을 다시 그리는 것(router.refresh)뿐이고, 목록의 정본은
 * 서버다 — 응답으로 받은 한 줄을 클라이언트가 끼워 넣으면 정렬 순서를 바꾼
 * 경우 그 줄만 제자리에 남는다.
 *
 * 두 응답의 모양이 같지만 별칭으로 합치지 않는다. 우연히 같을 뿐이고 한쪽이
 * 필드를 늘릴 때 다른 쪽 계약이 끌려가면 안 된다 (PageCreatedBody /
 * PageUpdatedBody 와 같은 규칙).
 *
 * DELETE 는 204 라 바디 타입이 없다.
 */
export type CategoryCreatedBody = { id: string };

/** PATCH /api/admin/categories/[id] — 수정 성공. 위 주석 참조. */
export type CategoryUpdatedBody = { id: string };

/** GET /api/pages?limit= — 최근 게시물. 페이지네이션이 없어 total 도 없다. */
export type RecentPageListBody = { pages: PageSummary[] };

/**
 * GET /api/pages?page=&size= — 페이지네이션이 붙은 게시물 목록.
 * `category=` 가 함께 오면 그 항목으로 좁혀진 목록이고, 없으면 전체다.
 *
 * 두 목록이 **같은 타입을 쓰는 것은 의도다.** 전체(`/pages`)와 항목별
 * (`/categories/[slug]`)은 조건만 다른 같은 컬렉션이고, 화면도 같은
 * 컴포넌트(PageList)로 그린다. 타입을 갈라 두면 그 컴포넌트가 둘 중
 * 하나를 골라야 하거나 유니온을 받아야 한다.
 */
export type PagedPageListBody = {
  pages: PageSummary[];
  /** 조건에 맞는 전체 건수. 마지막 페이지 계산에 쓴다. */
  total: number;
  /** 서버가 실제로 적용한 값. 요청값이 접혔을 수 있어 그대로 되돌려준다. */
  page: number;
  size: number;
};

/**
 * GET /api/pages/search?q=&page=&size= — 검색 결과.
 *
 * PagedPageListBody 를 그대로 쓰지 않고 `query` 를 더한 별도 타입이다. 검색
 * 화면의 제목이 "검색어"를 그려야 하는데, 그 값은 URL 이 아니라 **서버가 실제로
 * 검색에 쓴 문자열**이어야 한다(앞뒤 공백이 접힌다). page/size 를 되돌려주는 것과
 * 같은 이유다 — 요청값이 아니라 적용값이 화면의 정본이다.
 *
 * pages 의 excerpt 는 목록과 달리 **검색어가 보이는 자리**가 잘려 온다.
 * 타입이 같아도 내용의 규칙이 다르다는 점에서, 두 응답을 한 타입으로 합치면
 * 이 차이가 계약에서 사라진다.
 */
export type PageSearchListBody = PagedPageListBody & { query: string };

/** GET /api/pages/[id] — 상세. 여기서만 content(ProseMirror JSON)가 실린다. */
export type PageDetailBody = { page: PageDetail };

/**
 * GET /api/pages/[id]/comments — 한 게시물의 댓글 전부.
 *
 * **페이지네이션이 없다.** Figma 의 댓글 목록(1:545)에 페이지 UI 가 없고,
 * 댓글은 위에서 아래로 한 줄기로 읽는 대화라 잘라 놓으면 답글이 부모와 다른
 * 페이지로 갈라진다. 그래서 total 도 없다 — `comments.length` 가 곧 전체다.
 *
 * **평면 배열이다.** 대댓글도 같은 배열에 parentId 를 달고 들어 있다
 * (근거는 commentRepository.findByPageId 주석). 화면이 한 번 묶는다.
 *
 * CommentView 에 authorId 가 없는 것은 익명 댓글 때문이다 — 근거는
 * types/comment.ts 에 있다.
 */
export type CommentListBody = { comments: CommentView[] };

/**
 * POST /api/pages/[id]/comments — 댓글 작성 성공.
 *
 * 방금 만든 댓글을 통째로 돌려준다. 게시물 작성이 id 만 돌려주는 것과 다른
 * 이유는 성공 후에 하는 일이 다르기 때문이다 — 에디터는 `/pages/[id]` 로
 * 이동하지만, 댓글 폼은 제자리에 남아 방금 쓴 댓글이 목록에 나타나야 한다.
 * 그 한 줄을 그리는 데 필요한 값(작성자 표시·익명 여부·isMine)은 서버만 안다.
 */
export type CommentCreatedBody = { comment: CommentView };

/**
 * GET /api/users/me/comments — 마이페이지 "내 댓글 모아보기".
 *
 * **경로에 userId 가 없다.** 대상은 언제나 세션의 주인이다
 * (`/api/users/me` 와 같은 규칙).
 */
export type MyCommentListBody = { comments: MyCommentSummary[] };

/** GET /api/auth/me — 현재 로그인한 사용자. */
export type CurrentUserBody = { user: User };

/**
 * GET · PATCH /api/users/me — 마이페이지의 내 회원정보.
 *
 * 모양이 CurrentUserBody 와 같지만 별칭으로 합치지 않는다. 두 응답이 답하는
 * 질문이 다르다 — /api/auth/me 는 "지금 누가 로그인했는가"(헤더·가드용)이고
 * 이쪽은 "내 회원정보를 보여달라"(화면용)다. 마이페이지에 표시 항목이 늘어
 * 계약이 두꺼워질 때 인증 쪽 응답까지 끌려가면 안 된다.
 */
export type MyProfileBody = { user: User };

/**
 * GET /api/admin/pages?status=&page=&size= — 어드민 위키 관리 목록.
 *
 * **PagedPageListBody 와 합치지 않는다.** 실리는 모델부터 다르고
 * (AdminPageSummary vs PageSummary — 그 둘을 나눈 근거는 types/page.ts 에 있다),
 * 이쪽만 status 를 되돌려준다. 한 타입으로 묶으면 공개 목록 응답에도 status 칸이
 * 생겨서 "공개 목록에 상태 필터가 있다"는 없는 계약이 만들어진다.
 *
 * `status: null` 은 "필터 없음(전체)" 이다. 요청한 값이 아니라 **서버가 실제로
 * 적용한 값**이라 `?status=오타` 로 들어와도 화면의 필터 탭이 서버와 같은 것을
 * 가리킨다 (page/size 를 되돌려주는 것과 같은 규칙).
 */
export type AdminPageListBody = {
  pages: AdminPageSummary[];
  total: number;
  page: number;
  size: number;
  status: PageStatus | null;
};

/**
 * POST /api/admin/pages — 발행 성공.
 *
 * 방금 만든 게시물을 통째로 돌려주지 않는다. 에디터가 성공 후에 하는 일은
 * `/pages/[id]` 로 이동하는 것뿐이라 필요한 값은 id 하나이고, 본문 JSON 을
 * 되돌려 보내는 것은 방금 올린 것을 그대로 다시 내려받는 낭비다.
 */
export type PageCreatedBody = { id: string };

/**
 * POST /api/admin/uploads — 본문 이미지 업로드 성공.
 *
 * 저장 경로(버킷 안의 path)를 함께 내려주지 않는다. 에디터가 하는 일은 이
 * URL 을 이미지 노드의 src 에 넣는 것뿐이고, 경로는 스토리지의 사정이라
 * 계약에 실리면 S3 로 갈아끼울 때 프론트까지 흔들린다 — 그때도 URL 은 URL 이다.
 */
export type ImageUploadedBody = { url: string };

/**
 * PATCH /api/admin/pages/[id] — 수정 성공.
 *
 * 모양이 PageCreatedBody 와 같지만 별칭으로 합치지 않는다. 두 응답이 우연히
 * 같을 뿐이고(둘 다 "이동할 곳의 id"만 필요하다), 한쪽이 필드를 늘릴 때
 * 다른 쪽까지 계약이 끌려가면 안 된다.
 *
 * DELETE 는 204 라 바디 타입이 없다.
 */
export type PageUpdatedBody = { id: string };

/**
 * PATCH /api/admin/pages/[id]/status — 상태 전환 성공.
 *
 * 여기만 id 외에 값을 하나 더 싣는다. 목록에서 버튼 하나를 누른 화면은 이동하지
 * 않고 제자리에서 배지를 다시 그려야 하는데, 그 값을 응답에서 받지 못하면
 * 클라이언트가 "PUBLISHED 를 보냈으니 PUBLISHED 겠지"라고 **추측**해서 그린다.
 * 상태의 정본은 서버다 — 적용된 값을 그대로 돌려준다.
 */
export type PageStatusChangedBody = { id: string; status: PageStatus };

/**
 * GET /api/admin/users?role=&status=&page=&size= — 어드민 사용자 관리 목록.
 *
 * **User 가 아니라 AdminUserSummary 를 싣는다.** 목록이 그리는 다섯 칸만 나가고
 * 전화번호·생년월일·성별은 계약에 없다 — 근거는 types/user.ts 에 있다.
 *
 * `/admin/users` 와 `/admin/admins` 가 **같은 응답을 쓴다.** 두 화면은 role 필터의
 * 기본값과 제목만 다른 같은 목록이라, 계약을 갈라 두면 없는 차이가 생긴다.
 *
 * `role: null` · `status: null` 은 "필터 없음(전체)" 이다. 요청한 값이 아니라
 * 서버가 실제로 적용한 값이라 `?role=오타` 로 들어와도 화면의 필터 탭이 서버와
 * 같은 것을 가리킨다 (AdminPageListBody 와 같은 규칙).
 */
export type AdminUserListBody = {
  users: AdminUserSummary[];
  total: number;
  page: number;
  size: number;
  role: Role | null;
  status: UserStatus | null;
};

/**
 * PATCH /api/admin/users/[id]/role — 역할 변경 성공.
 *
 * 적용된 역할을 되돌려준다. 목록에서 셀렉트를 바꾼 화면은 이동하지 않고 제자리에
 * 남는데, 이 값이 없으면 클라이언트가 "ADMIN 을 보냈으니 ADMIN 이겠지"라고
 * 추측해서 그린다 — 역할의 정본은 서버다 (PageStatusChangedBody 와 같은 근거).
 *
 * 바뀐 사용자를 통째로 돌려주지 않는다. 목록이 다시 그려야 하는 칸은 역할 하나뿐이고,
 * 그 외의 필드를 실으면 목록 응답에서 애써 뺀 PII 가 이쪽으로 새어 나간다.
 */
export type UserRoleChangedBody = { id: string; role: Role };

/**
 * PATCH /api/admin/users/[id]/status — 차단 · 차단 해제 성공.
 *
 * UserRoleChangedBody 와 모양이 닮았지만 별칭으로 합치지 않는다. 두 응답이
 * 답하는 질문이 다르고(무슨 권한인가 / 어떤 상태인가), 실리는 타입도 다르다.
 *
 * status 는 UserStatus 전체다 — BlockableStatus 로 좁히지 않는다. 요청으로는
 * ACTIVE·BLOCKED 만 보낼 수 있지만 **응답은 서버가 실제로 읽어온 값**이고,
 * 계약을 좁히면 클라이언트가 "WITHDRAWN 은 올 수 없다"고 믿게 된다.
 */
export type UserStatusChangedBody = { id: string; status: UserStatus };

/**
 * GET /api/admin/reports?status=&page=&size= — 어드민 신고 관리 목록.
 *
 * **사용자용 신고 접수에는 대응하는 응답 타입이 없다.** `POST
 * /api/comments/[id]/reports` 는 204 로 답한다 — 신고 내역을 되돌려 보내면 그
 * 응답으로 남이 이 댓글을 몇 번 신고했는지 들여다볼 수 있고, 신고 사실을
 * 신고자 밖으로 내보내지 않는 것이 이 기능의 전제다.
 *
 * AdminReportSummary 에는 **익명 댓글의 실제 작성자가 실린다.** 공개 계약
 * (CommentView)이 authorId 조차 빼는 것과 정반대이며, 근거는 types/comment.ts
 * 에 있다 — 이 화면의 처리 액션 중 하나가 작성자 차단이다. 그래서 이 계약은
 * assertRole("ADMIN") 뒤에서만 나간다.
 *
 * `status: null` 은 "필터 없음(전체)" 이다. 요청한 값이 아니라 서버가 실제로
 * 적용한 값이라 `?status=오타` 로 들어와도 화면의 필터 탭이 서버와 같은 것을
 * 가리킨다 (AdminUserListBody 와 같은 규칙).
 */
export type AdminReportListBody = {
  reports: AdminReportSummary[];
  total: number;
  page: number;
  size: number;
  status: CommentReportStatus | null;
};

/**
 * GET /api/admin/comments?page=&size= — 어드민 최근 댓글 목록.
 *
 * **CommentListBody 와 합치지 않는다.** 실리는 모델부터 다르고
 * (AdminCommentSummary 는 게시물 제목과 작성자를 함께 단다), 저쪽은
 * 페이지네이션이 없어서 total/page/size 가 아예 없다. 한 타입으로 묶으면 공개
 * 댓글 목록 응답에도 그 칸들이 생겨서 "게시물 상세의 댓글에 페이지네이션이
 * 있다"는 없는 계약이 만들어진다 (AdminPageListBody 와 같은 근거).
 *
 * status 필터를 되돌려주지 않는다 — 이 목록에는 필터가 없다. 서버가 접을 값이
 * 없으면 되돌려줄 "적용된 값"도 존재하지 않는다 (AdminCategoryListBody 와 같은
 * 판단).
 *
 * `PATCH`/`DELETE` 에 대응하는 타입이 없는 것은 댓글 삭제가 기존
 * `DELETE /api/comments/[id]` 를 그대로 쓰기 때문이다 — 관리 화면용 삭제
 * 라우트를 새로 만들면 삭제 권한 규칙이 두 곳에 생긴다.
 */
export type AdminCommentListBody = {
  comments: AdminCommentSummary[];
  total: number;
  page: number;
  size: number;
};

/**
 * GET /api/admin/dashboard — 대시보드 카드 두 줄.
 *
 * 두 목록이 한 응답에 있는 이유는 대시보드가 둘을 **언제나 함께** 그리기
 * 때문이다 (라우트 주석 참조). total 이 없다 — 카드는 고정 3장이고 넘겨 볼
 * 페이지가 없다. "몇 건인가"는 각 관리 화면이 답한다.
 *
 * **reports 가 빈 배열인 것과 신고가 없는 것을 구분하지 않는다.** EDITOR 의
 * 요청에는 언제나 빈 배열이 온다 — 신고 조회는 ADMIN 만이라(reportService)
 * 물어보지 않기 때문이다. 화면은 어차피 두 경우에 같은 것을 그린다(섹션 없음).
 * 구분이 필요해지면 그때 플래그를 더한다.
 *
 * 카드 모델이 목록 모델과 다른 이유는 types/comment.ts 의 CommentPreview /
 * ReportPreview 주석에 있다 — 익명 처리와 실리는 칸이 갈린다.
 */
export type AdminDashboardBody = {
  comments: CommentPreview[];
  reports: ReportPreview[];
};
