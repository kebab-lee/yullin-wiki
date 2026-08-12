// =============================================================
// 댓글 서비스
//
// **이 파일은 신뢰 경계의 바깥을 다룬다.** 지금까지 저장되던 본문(pages.content)
// 은 EDITOR 이상만 쓸 수 있어서 렌더러가 dangerouslySetInnerHTML 을 써도
// 됐지만(editor/renderContent.ts 주석), 댓글은 회원가입만 하면 누구나 쓴다.
//
// 그래서 댓글 본문은 **평문 문자열 하나**다. 리치 텍스트도 아니고 HTML 도
// 아니다. 이 파일에서 본문을 마크업으로 바꾸는 코드(줄바꿈 → <br>, URL → <a>)
// 를 만들면 안 된다 — 줄바꿈은 화면이 CSS(white-space: pre-wrap)로 처리하고,
// 링크는 아예 만들지 않는다(javascript: 스킴 같은 것을 검증할 부담을 지지
// 않기 위해서다).
//
// HTTP 를 모른다. 실패는 도메인 에러로 던지고 Route Handler 가 옮긴다.
// =============================================================

import { canWriteComment } from "@/lib/auth/accountStatus";
import { assertAuthenticated, assertRole } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/roles";
import type { SessionPayload } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import * as commentRepository from "@/lib/repositories/commentRepository";
import * as userRepository from "@/lib/repositories/userRepository";
import type {
  AdminCommentSummary,
  CommentPreview,
  CommentView,
  CommentWithAuthor,
  DashboardComment,
  MyCommentSummary,
} from "@/lib/types";
import {
  COMMENT_DELETE_FORBIDDEN,
  COMMENT_NOT_FOUND,
  PARENT_NOT_FOUND,
  PARENT_TOO_DEEP,
  parseCommentForm,
} from "@/lib/validation/comment";
import { COMMENT_BLOCKED_AUTHOR } from "@/lib/validation/report";

import { assertPageIsPublic } from "./pageService";

/**
 * 마이페이지 "내 댓글 모아보기"에 실을 건수.
 *
 * Figma 1:1047 의 상자가 880x353 이고 한 줄이 62px 이라 다섯 줄이 들어간다.
 * 페이지네이션을 붙이지 않는 것은 시안에 그 UI 가 없고, 넘겨 볼 대상이 되는
 * "내 댓글 전체" 화면도 아직 없기 때문이다 (→ 그 화면이 생기면 여기가
 * 페이지네이션을 받는다).
 */
const MY_COMMENT_LIMIT = 5;

/**
 * 도메인 모델 → 공개 계약.
 *
 * **익명 처리가 여기 있다.** repository 는 실제 작성자명을 그대로 올리고
 * (어드민 화면이 그 값을 봐야 한다), 가리는 판단은 "무엇을 공개하는가"라는
 * 업무 규칙이라 service 가 한다.
 *
 * 익명 댓글은 authorName 뿐 아니라 **authorId 자체를 응답에서 뺀다**
 * (CommentView 에 그 칸이 없다). 같은 사람이 다른 곳에 남긴 실명 댓글과
 * 대조하면 id 하나로 익명이 곧바로 풀리기 때문이다.
 *
 * isMine 은 그 대신 남는 값이다. 삭제 버튼을 그릴지 판단하는 데는 "내
 * 것인가"만 있으면 되고, 그 계산은 id 를 내려보내지 않고도 서버가 할 수 있다.
 * 익명으로 쓴 내 댓글도 나에게는 내 것으로 보여야 하므로 isAnonymous 와
 * 무관하게 계산한다.
 */
function toView(
  comment: CommentWithAuthor,
  viewerId: string | null,
): CommentView {
  return {
    id: comment.id,
    parentId: comment.parentId,
    authorName: comment.isAnonymous ? null : comment.authorName,
    isAnonymous: comment.isAnonymous,
    isMine: viewerId !== null && comment.authorId === viewerId,
    content: comment.content,
    createdAt: comment.createdAt,
  };
}

/**
 * 한 게시물의 댓글 목록.
 *
 * **권한 검증이 없다. assertAuthenticated 를 넣지 마라** — 댓글 읽기는
 * 비로그인 사용자도 쓰는 공개 기능이다(검색이 그런 것과 같다). session 을
 * 받기는 하지만 그것은 **차단이 아니라 표시**를 위해서다: 어느 댓글에 삭제
 * 버튼을 붙일지(isMine) 계산하는 데만 쓰이고, null 이면 전부 false 가 되어
 * 목록 자체는 똑같이 내려간다.
 *
 * 대상 게시물이 공개인지는 확인한다. 안 하면 숨긴 글·초안의 댓글이 URL 만
 * 알면 열리는데, 그건 상세 화면에서 막아 둔 것을 댓글 API 로 우회하는 길이다.
 * 판정 규칙은 pageService 가 갖는다(assertPageIsPublic) — 여기 다시 적으면
 * 사본이 하나 더 생긴다.
 *
 * **평면 배열 그대로 내려간다.** 부모-자식 조립은 repository 도 service 도
 * 하지 않는다(근거는 commentRepository.findByPageId 주석). 화면이 parentId 로
 * 한 번 묶는다.
 *
 * 지워진 댓글은 목록에 없다. 그래서 **부모가 지워진 답글은 부모를 잃는다** —
 * 화면은 그런 답글을 최상위 자리에 그대로 그린다. 답글까지 함께 감추면 남의
 * 발언이 내 삭제로 사라지고, 반대로 지운 댓글을 "삭제된 댓글입니다"로 남겨
 * 두는 방식은 지운 사람이 기대한 것과 다르다.
 */
export async function listComments(
  session: SessionPayload | null,
  pageId: string,
): Promise<CommentView[]> {
  await assertPageIsPublic(pageId);

  const comments = await commentRepository.findByPageId(pageId);

  return comments.map((comment) => toView(comment, session?.userId ?? null));
}

/**
 * 이 사용자가 댓글을 쓸 수 있는 상태인가. 아니면 ForbiddenError.
 *
 * 계정이 사라진 경우(조회 실패)도 함께 막는다 — 세션은 남아 있는데 행이 없는
 * 상태이고, 그때 통과시키면 FK 위반으로 insert 가 터진다.
 *
 * **판정 규칙 자체는 여기 없다.** auth/accountStatus 의 canWriteComment 가
 * 갖는다 — "차단이 무엇을 막는가"는 계정 상태의 규칙이라 로그인 판정
 * (canSignIn)과 나란히 있어야 읽힌다.
 */
async function assertCanWriteComment(userId: string): Promise<void> {
  const user = await userRepository.findById(userId);

  if (!user || !canWriteComment(user.status)) {
    throw new ForbiddenError(COMMENT_BLOCKED_AUTHOR);
  }
}

/**
 * 답글을 달 수 있는 대상인가.
 *
 * 세 가지를 본다. 셋 다 DB 를 봐야 아는 질문이라 validation 모듈이 아니라
 * 여기 있다.
 *   ① 실재하고 지워지지 않았는가 — 지워진 댓글 밑에 새 답글이 붙으면 목록에서
 *      부모 없는 답글로 떠오른다.
 *   ② 같은 게시물의 댓글인가 — 아니면 남의 글 댓글에 답글을 달아 이 글에
 *      끼워 넣을 수 있다.
 *   ③ 그 자체가 답글은 아닌가 — **1단계 제한이 강제되는 유일한 자리다.**
 *      자기참조 깊이는 CHECK 제약으로 표현할 수 없어서(마이그레이션 주석)
 *      DB 가 막아주지 않는다.
 *
 * 셋 다 ValidationError 로 답한다. 요청 바디의 parentId 가 잘못됐다는 뜻이라
 * 화면이 문구를 붙일 자리가 있다.
 */
async function assertRepliable(parentId: string, pageId: string): Promise<void> {
  const parent = await commentRepository.findById(parentId);

  if (!parent || parent.status !== "VISIBLE" || parent.pageId !== pageId) {
    throw new ValidationError({ parentId: PARENT_NOT_FOUND });
  }

  if (parent.parentId !== null) {
    throw new ValidationError({ parentId: PARENT_TOO_DEEP });
  }
}

/**
 * 댓글을 단다.
 *
 * 순서에 규칙이 있다.
 *   ① assertAuthenticated — 첫 줄. **비로그인 댓글은 없다.** 익명 댓글도
 *      로그인이 필요하다 — "표시만 익명"이지 작성자 미상이 아니다
 *      (CLAUDE.md "확정된 도메인 결정": comments.author_id 는 NOT NULL).
 *   ② 대상 게시물 확인 — 공개 글이 아니면 404. DRAFT·HIDDEN·삭제분에는
 *      댓글이 달리지 않는다.
 *   ③ 본문 검증 — 폼과 같은 규칙(parseCommentForm)이다. 두 벌로 짜지 않는다.
 *   ④ 답글 대상 확인 — 최상위 댓글이면 건너뛴다.
 *
 * **authorId 는 세션에서 온다.** 요청 바디에 authorId 가 있어도 읽지 않는다
 * (parseCommentForm 이 애초에 그 칸을 만들지 않는다) — 받으면 남의 이름으로
 * 댓글을 쓸 수 있다. pageService.createPage 와 같은 규칙이다.
 *
 * ── ①.5 차단 확인이 이 함수의 새 관문이다 ───────────────────
 * **users.status = 'BLOCKED' 이 실제 효과를 갖는 유일한 자리다.** 로그인도
 * 조회도 막지 않고 여기만 막는다 — 시안(1:2516)이 약속한 "댓글 기능이
 * 제한됩니다"가 문자 그대로 구현된 지점이며, 근거는 auth/accountStatus.ts 에
 * 있다. 차단 규칙을 늘리고 싶어지면 그 파일에 함수를 더하고 여기는 부르기만
 * 한다.
 *
 * **세션의 값을 믿지 않고 DB 를 읽는다.** 토큰은 7일 살아 있어서 발급 뒤에
 * 차단된 사용자가 status 없는 payload 로 계속 댓글을 쓸 수 있다 —
 * authService.getCurrentUser 가 role 을 DB 에서 다시 읽는 것과 같은 이유다.
 * 그래서 조회가 한 번 더 붙는데, 댓글 작성은 목록 조회와 달리 요청이 드물고
 * 되돌릴 수 없는 쓰기라 그 비용을 치를 자리가 맞다.
 *
 * 거절은 ForbiddenError 다 — 누구인지는 알지만 허용되지 않는 조작이고,
 * 401 로 답하면 화면이 로그인 페이지로 보내서 이미 로그인한 사용자가
 * 무한히 되돌아온다.
 */
export async function createComment(
  session: SessionPayload | null,
  pageId: string,
  input: unknown,
): Promise<CommentView> {
  assertAuthenticated(session);

  await assertCanWriteComment(session.userId);

  await assertPageIsPublic(pageId);

  const parsed = parseCommentForm(input);
  if (!parsed.ok) throw new ValidationError(parsed.errors);

  if (parsed.value.parentId !== null) {
    await assertRepliable(parsed.value.parentId, pageId);
  }

  const created = await commentRepository.create({
    pageId,
    authorId: session.userId,
    parentId: parsed.value.parentId,
    content: parsed.value.content,
    isAnonymous: parsed.value.isAnonymous,
  });

  return toView(created, session.userId);
}

/**
 * 댓글을 지운다 — soft delete 다.
 *
 * ── 왜 여기서는 소유권을 보는가 ──
 * 게시물(pageService)은 소유권을 보지 않는다. 위키 문서는 공동 편집물이라
 * "내 글"이라는 개념 자체를 두지 않았고, 대신 모든 수정·삭제가
 * page_revisions 에 남는 것으로 값을 치렀다.
 *
 * **댓글은 공동 편집물이 아니라 개인의 발언이다.** 남의 발언을 지우는 것은
 * 편집이 아니라 삭제이고, 되돌릴 재료도 없다 — 댓글에는 page_revisions 에
 * 해당하는 이력 테이블이 없어서 "누가 무엇을 지웠는가"가 아무 데도 남지
 * 않는다. 문서 쪽의 규칙을 그대로 가져오면 막지도 않고 남기지도 않는
 * 상태가 된다.
 *
 * 그래서 지울 수 있는 사람은 둘이다.
 *   · **작성자 본인** — 자기 발언을 거두는 것.
 *   · **ADMIN** — 부적절한 댓글을 내리는 것. 커뮤니티 운영 책임이고, 다음
 *     세션의 신고 처리(comment_reports 의 RESOLVED_DELETED)가 결국 이
 *     경로로 들어온다.
 *
 * **EDITOR 는 포함하지 않는다.** EDITOR 는 문서를 쓰고 고치는 권한이지
 * 남의 발언을 내리는 권한이 아니다. hasRole 계층 비교를 그대로 쓰면 EDITOR
 * 가 딸려 들어오므로 기준을 ADMIN 으로 못박는다.
 *
 * 없는 댓글과 이미 지워진 댓글은 둘 다 404 다 — 삭제 여부가 상태 코드로
 * 새어나가지 않게 한다(errors.ts 의 규칙).
 *
 * **권한 검사가 대상 확인보다 뒤에 있다.** createPage 계열은 assertRole 이
 * 첫 줄이지만 여기서는 그럴 수 없다 — 지울 자격이 있는지는 그 댓글을 누가
 * 썼는지 알아야만 답할 수 있는 질문이다. 로그인 여부만 먼저 본다.
 */
export async function deleteComment(
  session: SessionPayload | null,
  id: string,
): Promise<void> {
  assertAuthenticated(session);

  const comment = await commentRepository.findById(id);
  if (!comment || comment.status !== "VISIBLE") {
    throw new NotFoundError(COMMENT_NOT_FOUND);
  }

  const isAuthor = comment.authorId === session.userId;
  const isModerator = hasRole(session.role, "ADMIN");

  if (!isAuthor && !isModerator) {
    throw new ForbiddenError(COMMENT_DELETE_FORBIDDEN);
  }

  await commentRepository.softDelete(id);
}

/**
 * 내가 쓴 최근 댓글 (마이페이지).
 *
 * 대상은 언제나 세션의 주인이다. authorId 를 인자로 받지 않는 것이 그
 * 장치다 — 받을 자리가 없으면 남의 id 를 넣을 수도 없다
 * (`/api/users/me` 에 userId 가 없는 것과 같은 규칙).
 */
export async function listMyComments(
  session: SessionPayload | null,
): Promise<MyCommentSummary[]> {
  assertAuthenticated(session);

  return commentRepository.findRecentByAuthorId(
    session.userId,
    MY_COMMENT_LIMIT,
  );
}

// ── 관리자용 ──────────────────────────────────────────────────
// 여기부터는 위와 달리 **모든 댓글**을 다룬다. 그래서 구역을 갈라 두고, 모든
// 함수가 assertRole 로 시작한다 (userService 의 관리자 구역과 같은 규칙).

/** 어드민 댓글 목록 한 페이지의 기본 건수. 다른 관리 목록과 같은 20 이다. */
const DEFAULT_ADMIN_COMMENT_PAGE_SIZE = 20;

/** 한 번에 실어 나를 수 있는 최대 건수. 임의로 큰 size 를 막는다. */
const MAX_ADMIN_COMMENT_PAGE_SIZE = 50;

/** 대시보드 "최근 달린 댓글" 카드 수. Figma 1:2184 기준 3장. */
const DASHBOARD_COMMENT_LIMIT = 3;

function positiveInt(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(Math.trunc(value), 1);
}

/**
 * 어드민 최근 댓글 목록 (`/admin/comments`).
 *
 * **assertRole 이 첫 줄이다.** 파라미터를 다듬는 것조차 그 뒤다 — 권한 없는
 * 요청에 응답 모양이 조금이라도 새어나가면 안 된다.
 *
 * **기준이 EDITOR 다.** 사용자 관리(ADMIN)와 선이 다르다 — 이 화면이 할 수
 * 있는 일은 댓글을 읽고 지우는 것뿐이고 계정을 건드리지 않는다. 위키를 운영
 * 하는 사람이 자기 문서에 달린 부적절한 댓글을 내리지 못하면 운영이 성립하지
 * 않는다.
 *
 * ⚠️ **그런데 삭제는 여전히 ADMIN 만 할 수 있다** (deleteComment 의 기준).
 * EDITOR 는 이 목록을 보고 해당 글로 이동할 수 있지만 삭제 버튼은 눌러도
 * 403 이다. 두 기준이 다른 것은 의도이며 — 읽는 것과 남의 발언을 내리는 것은
 * 다른 권한이다 — 화면은 role 로 버튼을 감춰서 그 차이를 미리 보여준다.
 *
 * 목록은 **지워진 댓글도 싣는다** (findForAdmin). 근거는 repository 주석에 있다.
 */
export async function listCommentsForAdmin(
  session: SessionPayload | null,
  params: { page?: number; size?: number } = {},
): Promise<{
  items: AdminCommentSummary[];
  total: number;
  page: number;
  size: number;
}> {
  assertRole(session, "EDITOR");

  const window = {
    page: positiveInt(params.page, 1),
    size: Math.min(
      positiveInt(params.size, DEFAULT_ADMIN_COMMENT_PAGE_SIZE),
      MAX_ADMIN_COMMENT_PAGE_SIZE,
    ),
  };

  const { items, total } = await commentRepository.findForAdmin(window);

  return { items, total, ...window };
}

/**
 * 대시보드 "최근 달린 댓글" 카드 (Figma 1:2184).
 *
 * ── 여기서 익명을 가린다 ────────────────────────────────────
 * 관리 목록(listCommentsForAdmin)이 실명을 그대로 싣는 것과 **반대**다.
 * 근거는 화면이 할 수 있는 일에 있다 — 신고 관리와 댓글 관리는 작성자를 상대로
 * 조치(차단·삭제)를 하는 화면이라 누구인지 알아야 하지만, 대시보드 카드는
 * 조작이 없는 미리보기다. 볼 이유가 없는 자리에서는 안 보이는 편이 맞다.
 *
 * 가리는 방식은 공개 목록(toView)과 **같다** — 표시 문구를 만들지 않고
 * authorName 을 null 로 접는다. "익명" / "(탈퇴한 사용자)" 를 고르는 것은
 * 화면의 몫이고, service 가 문자열을 만들면 같은 문구가 컴포넌트와 두 벌이 된다.
 */
export async function listRecentCommentsForDashboard(
  session: SessionPayload | null,
): Promise<CommentPreview[]> {
  assertRole(session, "EDITOR");

  const comments = await commentRepository.findRecentForDashboard(
    DASHBOARD_COMMENT_LIMIT,
  );

  return comments.map(toPreview);
}

/** 대시보드 카드 한 장. 익명이면 이름을 지운다 (toView 와 같은 규칙). */
function toPreview(comment: DashboardComment): CommentPreview {
  return {
    id: comment.id,
    authorName: comment.isAnonymous ? null : comment.authorName,
    isAnonymous: comment.isAnonymous,
    createdAt: comment.createdAt,
    content: comment.content,
    pageId: comment.pageId,
    pageTitle: comment.pageTitle,
    commentCount: comment.commentCount,
  };
}
