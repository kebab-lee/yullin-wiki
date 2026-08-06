import { notFound } from "next/navigation";

import CategorySideNav from "@/components/page/CategorySideNav";
import PageList from "@/components/page/PageList";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { ApiResponseError, fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody, PagedPageListBody } from "@/lib/api/types";

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
 * 데이터는 service 가 아니라 자기 Route Handler 를 거친다. searchParams 를 읽으므로
 * 이 페이지는 동적 렌더링이고, 그래서 빌드 시점에 자기 자신을 fetch 하지 않는다.
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
      {/* Figma: sidecat x=236(80폭) · lists 1006폭 */}
      <div className="flex items-start gap-[40px] pb-[100px] pl-[236px] pr-[150px] pt-[60px]">
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
