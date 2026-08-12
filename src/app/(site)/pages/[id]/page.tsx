import { notFound } from "next/navigation";

import CommentSection from "@/components/comment/CommentSection";
import ArticleAdminActions from "@/components/page/ArticleAdminActions";
import ArticleBody from "@/components/page/ArticleBody";
import ArticleHeader from "@/components/page/ArticleHeader";
import ArticleToc from "@/components/page/ArticleToc";
import { REVALIDATE } from "@/lib/api/baseUrl";
import {
  ApiResponseError,
  fetchApi,
  fetchApiAsUser,
} from "@/lib/api/serverFetch";
import type {
  CategoryListBody,
  CommentListBody,
  PageDetailBody,
} from "@/lib/api/types";
import { hasRole } from "@/lib/auth/roles";
import { getViewerRole } from "@/lib/auth/viewer";
import { buildToc } from "@/lib/editor/toc";

/**
 * **프리렌더 금지.**
 *
 * 이 페이지는 자기 Route Handler 를 fetch 한다(레이어 규칙). 그런데 params 만
 * 읽는 라우트는 Next 가 기본적으로 정적 생성 대상으로 보고 빌드 시점에
 * 미리 렌더하려 든다. 그 시점에는 API 를 받아줄 서버가 떠 있지 않아 fetch 가
 * 깨지고, 실패가 빈 페이지나 404 로 굳어 배포된다.
 *
 * 항목별 목록 페이지는 searchParams 를 읽어서 자동으로 동적이 되지만 여기는
 * 그런 신호가 없으므로 명시한다. 데이터 캐시는 그대로 살아 있다 —
 * fetchApi 가 넘기는 revalidate 가 페이지 단위가 아니라 fetch 단위이기 때문이다.
 */
export const dynamic = "force-dynamic";

/**
 * 게시물 상세 — `/pages/[id]` (Figma Article 1:457)
 *
 * (site) 그룹 안이라 헤더는 layout 이 붙인다. 데이터는 service 가 아니라 자기
 * Route Handler 를 거친다 (CLAUDE.md "레이어 규칙").
 *
 * EDITOR 이상에게는 수정·삭제 버튼이 붙는다. **버튼 노출은 표시용 판정일 뿐**
 * 이고 실제 차단은 pageService 의 assertRole 이 한다 — API 는 이 화면을 거치지
 * 않고 직접 호출된다. 조회수는 아직 범위가 아니다.
 *
 * 댓글은 로그인한 사용자가 쓴다 — **이 화면에서 처음으로 신뢰 경계 밖의 값이
 * 그려진다.** 그래서 댓글 본문은 평문이고 JSX 텍스트로 렌더된다
 * (CommentItem 주석). 본문(ArticleBody)만 innerHTML 을 쓴다.
 */
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [viewerRole, detail, categoryBody, commentBody] = await Promise.all([
    getViewerRole(),
    // 404 만 not-found 로 옮기고 나머지 실패(DB 장애 등)는 그대로 터뜨린다.
    // 전부 삼키면 장애가 "없는 게시물"로 위장된다.
    fetchApi<PageDetailBody>(`/api/pages/${id}`, REVALIDATE.pages).catch(
      (error: unknown) => {
        if (error instanceof ApiResponseError && error.status === 404)
          return null;
        throw error;
      },
    ),
    fetchApi<CategoryListBody>("/api/categories", REVALIDATE.categories),
    // **fetchApi(캐시)가 아니라 fetchApiAsUser(no-store + 쿠키)다.** 이유가 둘이다.
    //   · 응답이 보는 사람마다 다르다 — isMine 이 실린다. 초 단위라도 캐싱하면
    //     남의 댓글에 내 삭제 버튼이 붙는다.
    //   · 방금 쓴 댓글이 바로 보여야 한다(router.refresh 뒤).
    // 게시물이 없을 때(위 404)는 이 응답도 404 지만, 그 판정은 detail 이 이미
    // 내렸으므로 여기서는 조용히 빈 목록으로 접는다.
    fetchApiAsUser<CommentListBody>(`/api/pages/${id}/comments`).catch(
      (error: unknown) => {
        if (error instanceof ApiResponseError && error.status === 404)
          return null;
        throw error;
      },
    ),
  ]);

  if (!detail) notFound();

  const { page } = detail;
  // 배지에 필요한 것은 아이콘·짧은 이름·slug 다. 게시물 응답에 그 셋을 다시
  // 싣는 대신 이미 캐시된 목록(1시간)에서 찾는다.
  const category = categoryBody.categories.find((c) => c.id === page.categoryId);

  // GUEST 는 저장되는 role 이 아니라 화면 상태라 hasRole 에 넘기지 않는다
  // (types/auth.ts: ROLE_LEVEL 에 GUEST 를 끼우지 않는 이유와 같다).
  // 소유권은 보지 않는다 — EDITOR 이상이면 누가 쓴 글이든 고치고 지운다.
  const canEdit = viewerRole !== "GUEST" && hasRole(viewerRole, "EDITOR");

  // 댓글은 조작 주체가 둘로 갈린다. 쓰는 것은 로그인한 누구나이고, 남의 댓글을
  // 내리는 것은 ADMIN 뿐이다 — EDITOR 는 문서 권한이지 발언을 내리는 권한이
  // 아니다(commentService.deleteComment 주석). canEdit 을 재사용하지 않는 이유다.
  const isLoggedIn = viewerRole !== "GUEST";
  const canModerate = isLoggedIn && hasRole(viewerRole, "ADMIN");
  const comments = commentBody?.comments ?? [];

  return (
    <div className="mx-auto max-w-page">
      {/* lg 이상은 Figma 그대로(목차 x=209(245폭) · 본문 x=503(800폭) → 간격 49px).
          lg 미만은 좌우 16px 패딩에 목차가 본문 위 접이식으로 내려온다. */}
      <div className="flex flex-col gap-[20px] px-4 py-[24px] lg:flex-row lg:items-start lg:gap-[49px] lg:px-[209px] lg:py-[40px]">
        <ArticleToc entries={buildToc(page.content)} />

        <article className="min-w-0 flex-1">
          <ArticleHeader
            page={page}
            category={category}
            commentCount={comments.length}
          />
          <ArticleBody content={page.content} />

          {canEdit && (
            <ArticleAdminActions pageId={page.id} title={page.title} />
          )}

          <CommentSection
            pageId={page.id}
            comments={comments}
            canModerate={canModerate}
            isLoggedIn={isLoggedIn}
          />
        </article>
      </div>
    </div>
  );
}
