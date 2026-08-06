import { notFound } from "next/navigation";

import Pagination from "@/components/common/Pagination";
import CategoryButtonRow from "@/components/home/CategoryButtonRow";
import RecentPostCard from "@/components/home/RecentPostCard";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { ApiResponseError, fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody, CategoryPageListBody } from "@/lib/api/types";

/**
 * 항목별 게시물 목록 — `/categories/[slug]`
 *
 * (site) 그룹 안이라 헤더는 layout 이 붙인다. 어드민용으로 화면을 따로 그리지
 * 않는다 — 헤더만 role 에 따라 갈리고 이 라우트는 하나다
 * (CLAUDE.md "화면 중복").
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
    fetchApi<CategoryPageListBody>(
      `/api/pages?${query.toString()}`,
      REVALIDATE.pages,
    ).catch((error: unknown) => {
      if (error instanceof ApiResponseError && error.status === 404) return null;
      throw error;
    }),
  ]);

  if (!listBody) notFound();

  const category = categoryBody.categories.find((c) => c.slug === slug);
  const lastPage = Math.max(Math.ceil(listBody.total / listBody.size), 1);

  return (
    <div className="mx-auto max-w-page">
      <div className="mx-auto w-content py-[60px]">
        {/* 항목 전환 — 홈과 같은 컴포넌트를 쓰고 현재 항목만 강조한다. */}
        <div className="flex justify-center">
          <CategoryButtonRow
            categories={categoryBody.categories}
            activeSlug={slug}
          />
        </div>

        <div className="mt-[50px] flex items-baseline gap-[10px]">
          {/* 목록 제목에는 짧은 형(name). 긴 형은 푸터 전용이다. */}
          <h1 className="text-[28px] font-bold leading-[34px] text-black">
            {category ? `${category.icon} ${category.name}` : slug}
          </h1>
          <span className="text-[16px] text-gray3">{listBody.total}개</span>
        </div>

        {listBody.pages.length === 0 ? (
          <p className="mt-[40px] text-[16px] text-gray3">
            아직 등록된 게시물이 없습니다.
          </p>
        ) : (
          <div className="mt-[30px] flex flex-wrap gap-[25px]">
            {listBody.pages.map((post) => (
              <RecentPostCard key={post.id} page={post} />
            ))}
          </div>
        )}

        <Pagination
          basePath={`/categories/${slug}`}
          currentPage={listBody.page}
          lastPage={lastPage}
        />
      </div>
    </div>
  );
}
