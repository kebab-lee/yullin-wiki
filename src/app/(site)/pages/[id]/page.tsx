import { notFound } from "next/navigation";

import CommentSection from "@/components/comment/CommentSection";
import CommentsProvider from "@/components/comment/CommentsProvider";
import ArticleAdminActions from "@/components/page/ArticleAdminActions";
import ArticleBody from "@/components/page/ArticleBody";
import ArticleHeader from "@/components/page/ArticleHeader";
import ArticleToc from "@/components/page/ArticleToc";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { ApiResponseError, fetchApi } from "@/lib/api/serverFetch";
import type {
  CategoryListBody,
  PageDetailBody,
  PagedPageListBody,
} from "@/lib/api/types";
import { buildToc } from "@/lib/editor/toc";

/**
 * 빌드 시점에 미리 만들어 둘 게시물.
 *
 * **`/api/pages` 를 그대로 쓴다.** repository 를 직접 부르지 않는 이유는 다른
 * 서버 컴포넌트와 같다 (CLAUDE.md "레이어 규칙") — 여기만 예외로 두면 공개
 * 목록의 조건("PUBLISHED 이고 deleted_at 이 null")이 두 곳에 생기고, 한쪽만
 * 고쳐지면 **초안이 미리 생성되어 공개된다.** 그 조건은 이미 이 API 안에 있다
 * (pageFilters.publicPages).
 *
 * **한 번에 한 페이지(50건)만 읽는다.** 50 은 pageService 의 MAX_LIMIT 이라
 * 더 달라고 해도 잘린다. 지금 공개 문서는 10건 안쪽이라 전부 덮지만, 문서가
 * 50건을 넘으면 **최신 50건만 미리 만들어지고 나머지는 첫 요청 때 만들어진다**
 * (dynamicParams). 그건 사고가 아니라 이 함수가 스스로 갖는 상한이다 — 문서가
 * 수백 건이 되면 빌드 시간이 그만큼 늘어나므로, 그때 여기를 "최근 N건"으로
 * 명시할지 페이지네이션을 돌려 전부 채울지 정하면 된다.
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  const body = await fetchApi<PagedPageListBody>(
    "/api/pages?page=1&size=50",
    REVALIDATE.pages,
  );

  return body.pages.map((page) => ({ id: page.id }));
}

/**
 * 미리 만들어 두지 않은 id 로 들어오면 어떻게 할 것인가.
 *
 * **true — 첫 요청 때 만들고 그 뒤로는 캐시한다(ISR).** false 면 빌드 이후에
 * 발행된 글이 전부 404 가 되는데, 그건 "아직 빌드를 안 돌렸다"는 배포 사정을
 * 사용자에게 없는 글로 보여주는 것이다. 새 글은 발행 즉시 열려야 하고, 목록에
 * 실리는 것도 이미 revalidatePath 가 맡고 있다 (POST /api/admin/pages).
 *
 * 없는 id 는 여기서도 notFound() 로 떨어진다 — 미리 만들지 않는다는 것이
 * 아무 id 나 열어 준다는 뜻은 아니다. 초안·숨김·삭제분도 마찬가지로 service 가
 * 404 로 답하므로(pageService.getPage), 미리 만들지 않았다고 해서 새는 경로는
 * 생기지 않는다.
 */
export const dynamicParams = true;

/**
 * 게시물 상세 — `/pages/[id]` (Figma Article 1:457)
 *
 * (site) 그룹 안이라 헤더는 layout 이 붙인다. 데이터는 service 가 아니라 자기
 * Route Handler 를 거친다 (CLAUDE.md "레이어 규칙").
 *
 * ── 정적으로 생성된다 ───────────────────────────────────────
 * 예전에는 `export const dynamic = "force-dynamic"` 이 붙어 있었고 근거는
 * "빌드 시점에는 API 를 받아 줄 서버가 없어 self-fetch 가 깨진다"였다.
 * **그건 사실이 아니었다** — 빌드는 이미 떠 있는 배포(NEXT_PUBLIC_SITE_URL /
 * VERCEL_URL, getBaseUrl 참고)를 향해 fetch 하고, 홈이 그렇게 프리렌더되어
 * 실제 데이터를 담은 채 배포되고 있다. 그래서 그 줄을 지웠다.
 *
 * 대신 **세션을 읽는 것이 금지된다.** 쿠키를 한 번이라도 읽으면 이 페이지는
 * 다시 동적 렌더가 되고, 정적으로 생성하면 그 값이 빌드 시점으로 굳어 전원이
 * 같은 화면을 본다. 세션이 필요한 조각 둘은 브라우저에서 스스로 묻는다:
 *   · ArticleAdminActions — EDITOR 이상에게만 보이는 수정·삭제 버튼
 *   · 댓글 — CommentsProvider (목록·isMine) + CommentSection (역할)
 * 화면 접근 차단이 약해지는 것이 아니다. 애초에 이 화면은 아무것도 막은 적이
 * 없고, 차단은 service 의 assertRole 이 한다 (CLAUDE.md "권한").
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

  const [detail, categoryBody] = await Promise.all([
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
  ]);

  if (!detail) notFound();

  const { page } = detail;
  // 배지에 필요한 것은 아이콘·짧은 이름·slug 다. 게시물 응답에 그 셋을 다시
  // 싣는 대신 이미 캐시된 목록(1시간)에서 찾는다.
  const category = categoryBody.categories.find((c) => c.id === page.categoryId);

  return (
    <div className="mx-auto max-w-page">
      {/* lg 이상은 Figma 그대로(목차 x=209(245폭) · 본문 x=503(800폭) → 간격 49px).
          lg 미만은 좌우 16px 패딩에 목차가 본문 위 접이식으로 내려온다. */}
      <div className="flex flex-col gap-[20px] px-4 py-[24px] lg:flex-row lg:items-start lg:gap-[49px] lg:px-[209px] lg:py-[40px]">
        <ArticleToc entries={buildToc(page.content)} />

        <article className="min-w-0 flex-1">
          {/* 헤더의 말풍선과 댓글 섹션이 **같은 수**를 말해야 해서 둘을 함께
              감싼다. 사이에 낀 본문·버튼은 서버 컴포넌트 그대로다 —
              클라이언트 Provider 의 children 으로 들어가도 서버에서 렌더된다. */}
          <CommentsProvider pageId={page.id} initialCount={page.commentCount}>
            <ArticleHeader page={page} category={category} />
            <ArticleBody content={page.content} />

            <ArticleAdminActions pageId={page.id} title={page.title} />

            <CommentSection pageId={page.id} />
          </CommentsProvider>
        </article>
      </div>
    </div>
  );
}
