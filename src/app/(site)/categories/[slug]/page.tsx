import { notFound } from "next/navigation";

import CategorySideNav from "@/components/page/CategorySideNav";
import PageList from "@/components/page/PageList";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { ApiResponseError, fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody, PagedPageListBody } from "@/lib/api/types";

/**
 * ── 이 라우트는 정적 생성되지 않는다. generateStaticParams 를 넣지 마라 ──
 *
 * 홈·게시물 상세를 정적으로 돌리면서 여기도 같이 해 봤고, **측정 결과 안 된다.**
 * 원인은 아래 `searchParams` 한 줄이다 — Next 는 searchParams 를 읽는 페이지를
 * 요청 시점 렌더로 고정한다. `generateStaticParams` 를 달면 빌드 표에는
 * `● /categories/[slug]` 로 slug 넷이 찍히지만(그래서 속기 쉽다) `.next` 에
 * HTML 도 prerender-manifest 항목도 생기지 않고, 응답 헤더는
 * `Cache-Control: private, no-store` 다. searchParams 를 읽지 않게 고치면 같은
 * 빌드에서 곧바로 HTML 넷이 생기는 것으로 원인을 확인했다.
 *
 * **그래서 페이지네이션을 포기하지 않는다.** `?page=` 로 페이지 상태가 URL 에
 * 드러나야 뒤로가기·공유가 유지된다는 것은 이 프로젝트가 무한 스크롤을 쓰지
 * 않는 이유이기도 하다 (CLAUDE.md "반응형/모바일"). 정적 생성과 맞바꿀 값이
 * 아니다.
 *
 * 잃는 것도 크지 않다. 목록 데이터는 여전히 fetch 캐시(REVALIDATE.pages)를
 * 타므로 DB 까지 내려가지 않고, `revalidatePath("/", "layout")` 이 그 캐시도
 * 함께 턴다(측정으로 확인). 함수가 한 번 깨어나는 비용만 남는다.
 */

/**
 * 항목별 게시물 목록 — `/categories/[slug]` (Figma 항목-공간 1:598)
 *
 * (site) 그룹 안이라 헤더는 layout 이 붙인다. 어드민용으로 화면을 따로 그리지
 * 않는다 — 헤더만 role 에 따라 갈리고 이 라우트는 하나다
 * (CLAUDE.md "화면 중복").
 *
 * 목록 본문은 전체 목록(`/pages`)과 같은 PageList 다. 이 파일이 아는 것은
 * "어떤 조건의 목록인가"뿐이다.
 *
 * 데이터는 service 가 아니라 자기 Route Handler 를 거친다. 이 페이지가 요청
 * 시점에 렌더되는 이유는 바로 위 블록에 적어 두었다.
 */
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;

  // 잘못된 page 값은 여기서 판정하지 않는다. 그대로 넘기면 service 가 안전한
  // 값으로 접고, 실제로 적용된 값을 응답에 되돌려준다.
  const query = new URLSearchParams({ category: slug });
  if (pageParam) query.set("page", pageParam);

  const [categoryBody, listBody] = await Promise.all([
    fetchApi<CategoryListBody>("/api/categories", REVALIDATE.categories),
    // 없는 slug 만 not-found 로 옮기고, DB 장애 같은 나머지 실패는 그대로
    // 터뜨린다. 전부 삼키면 장애가 "없는 항목"으로 위장된다.
    fetchApi<PagedPageListBody>(
      `/api/pages?${query.toString()}`,
      REVALIDATE.pages,
    ).catch((error: unknown) => {
      if (error instanceof ApiResponseError && error.status === 404) return null;
      throw error;
    }),
  ]);

  if (!listBody) notFound();

  const category = categoryBody.categories.find((c) => c.slug === slug);

  return (
    <div className="mx-auto max-w-page">
      {/* 전체 목록(`/pages`)과 같은 컨테이너다. lg 이상 Figma 그대로,
          lg 미만은 좌우 16px 패딩 + 네비가 목록 위로. */}
      <div className="flex flex-col gap-[24px] px-4 pb-[60px] pt-[24px] lg:flex-row lg:items-start lg:gap-[40px] lg:pb-[100px] lg:pl-[236px] lg:pr-[150px] lg:pt-[60px]">
        <CategorySideNav current={{ type: "category", slug }} />

        {/* 목록 제목에는 짧은 형(name). 긴 형(fullName)은 푸터 전용이다.
            카테고리를 못 찾는 경우는 목록 응답이 200 인데(= slug 는 존재한다)
            캐시된 목록에만 아직 없는 상태라, 제목 자리에 slug 를 그대로 둔다.

            categories 를 넘기지 않는다 — 이미 한 항목으로 좁혀진 목록이라
            모든 줄에 같은 배지가 반복될 뿐이다. */}
        <PageList
          emoji={category?.icon ?? "📂"}
          title={category?.name ?? slug}
          pages={listBody.pages}
          total={listBody.total}
          basePath={`/categories/${slug}`}
          currentPage={listBody.page}
          size={listBody.size}
        />
      </div>
    </div>
  );
}
