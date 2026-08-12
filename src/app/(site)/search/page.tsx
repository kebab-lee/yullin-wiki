import { notFound } from "next/navigation";

import CategorySideNav from "@/components/page/CategorySideNav";
import SearchResultList from "@/components/search/SearchResultList";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { ApiResponseError, fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody, PageSearchListBody } from "@/lib/api/types";
import { readCategoryParam, searchHref } from "@/lib/search/searchUrl";
import { validateSearchQuery } from "@/lib/validation/search";

/**
 * 검색 결과 — `/search?q=&category=` (Figma 검색 결과 1:939)
 *
 * **검색어와 항목은 둘 다 searchParams 가 정본이다.** 클라이언트 상태로 들고
 * 있으면 결과 화면의 링크를 공유·북마크할 수 없고, 뒤로가기가 검색 이전으로
 * 돌아가지 않는다. 입력창(SearchInput)이 하는 일도 상태를 올리는 것이 아니라 이
 * URL 로 이동하는 것뿐이고, 좌측 네비의 항목 칩도 마찬가지다.
 *
 * **두 조건은 서로를 지우지 않는다.** 항목 칩은 현재 q 를 유지한 채 이동하고
 * (CategorySideNav 의 query prop), 검색 입력은 현재 항목을 유지한 채 제출한다
 * (SearchInput 이 URL 에서 읽는다). 조건 조립 규칙의 정본은 lib/search/searchUrl.
 *
 * **항목만 있고 검색어가 없는 상태는 이 라우트가 아니다.** 그건 최신순 컬렉션인
 * `/categories/[slug]` 이고, 그래서 기존 링크가 그대로 살아 있다.
 *
 * 좌측 네비는 목록 페이지와 **같은 CategorySideNav** 이고 페이지네이션도 같은
 * 컴포넌트다. 검색 전용으로 다시 그린 것은 결과 줄(88px 고정 + 발췌 강조)뿐이다.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const { q, category: categoryParam, page: pageParam } = await searchParams;
  const keyword = (q ?? "").trim();
  const categorySlug = readCategoryParam(categoryParam);

  // **검색어 규칙을 화면에서도 확인한다.** service 와 같은 순수 함수를 쓰므로
  // 두 벌이 아니다 (CLAUDE.md "검증"). 여기서 먼저 보는 이유는 400 응답을
  // 받아 문구를 되꺼내는 것보다 짧고, 무엇보다 **애초에 요청을 보내지 않기**
  // 위해서다 — 1글자 검색은 서버까지 갈 이유가 없다.
  const validation = keyword ? validateSearchQuery(keyword) : null;

  const query = new URLSearchParams({ q: keyword });
  if (categorySlug) query.set("category", categorySlug);
  if (pageParam) query.set("page", pageParam);

  const [categoryBody, resultBody] = await Promise.all([
    fetchApi<CategoryListBody>("/api/categories", REVALIDATE.categories),
    validation?.valid
      ? // 없는 항목 slug 만 not-found 로 옮기고 나머지 실패는 그대로 터뜨린다 —
        // 전부 삼키면 장애가 "없는 항목"으로 위장된다 (`/categories/[slug]` 와
        // 같은 처리). 오타 난 항목을 결과 0건으로 답하지 않는 이유가 이것이다:
        // 사용자가 항목이 틀린 줄 모르고 검색어만 계속 고치게 된다.
        fetchApi<PageSearchListBody>(
          `/api/pages/search?${query.toString()}`,
          REVALIDATE.pages,
        ).catch((error: unknown) => {
          if (error instanceof ApiResponseError && error.status === 404) {
            return null;
          }
          throw error;
        })
      : null,
  ]);

  if (validation?.valid && !resultBody) notFound();

  // 화면이 보는 것은 요청한 값이 아니라 **서버가 실제로 적용한 값**이다.
  // 검색어(query)와 마찬가지로 항목도 응답이 정본이라, 제목·해제 링크·네비의
  // 활성 표시가 결과와 같은 조건을 가리킨다.
  const appliedCategory = resultBody?.category ?? null;
  const category = appliedCategory
    ? categoryBody.categories.find((c) => c.slug === appliedCategory)
    : undefined;

  return (
    <div className="mx-auto max-w-page">
      {/* 목록 페이지와 같은 컨테이너다 (sidecat x=236(80폭) · 결과 프레임 1006폭). */}
      <div className="flex flex-col gap-[24px] px-4 pb-[60px] pt-[24px] lg:flex-row lg:items-start lg:gap-[40px] lg:pb-[100px] lg:pl-[236px] lg:pr-[150px] lg:pt-[60px]">
        {/* 검색어를 넘겨서 항목 칩이 그것을 유지한 채 이동하게 한다. 검색어가
            아직 성립하지 않은 화면(빈 검색·너무 짧음)에서는 넘기지 않는다 —
            그 값으로 이동해 봐야 같은 안내 화면이 다시 나온다. */}
        <CategorySideNav
          current={{ type: "search", slug: appliedCategory ?? undefined }}
          query={resultBody?.query}
        />

        {resultBody ? (
          <SearchResultList
            query={resultBody.query}
            category={category}
            pages={resultBody.pages}
            total={resultBody.total}
            categories={categoryBody.categories}
            // 페이지를 넘겨도 **두 조건이 모두** 유지되도록 기준 경로에 남긴다.
            // Pagination 이 여기에 `&page=` 를 잇는다.
            basePath={searchHref({
              query: resultBody.query,
              category: resultBody.category,
            })}
            currentPage={resultBody.page}
            size={resultBody.size}
          />
        ) : (
          // **검색어가 없거나 너무 짧은 것은 에러가 아니다.** 헤더 검색창을
          // 그냥 눌렀거나 URL 을 직접 연 상태이므로, 화면을 실패로 칠하지 않고
          // 무엇을 하면 되는지만 알려준다. 문구의 정본은 validation 모듈이다.
          <section className="min-w-0 flex-1">
            <header className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] lg:flex-nowrap lg:gap-[20px]">
              <span className="text-[32px] leading-[32px] lg:text-[45px] lg:leading-[45px]" aria-hidden>
                🔍
              </span>
              <h1 className="min-w-0 text-[22px] font-bold leading-[34px] text-black lg:text-[28px]">
                전체 검색
              </h1>
            </header>

            <p className="mt-[24px] text-[16px] leading-[26px] text-gray4 lg:mt-[40px] lg:text-[18px]">
              {validation && !validation.valid
                ? validation.message
                : "찾고 싶은 내용을 검색창에 입력해보세요."}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
