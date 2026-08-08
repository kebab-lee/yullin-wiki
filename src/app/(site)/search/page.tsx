import CategorySideNav from "@/components/page/CategorySideNav";
import SearchResultList from "@/components/search/SearchResultList";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody, PageSearchListBody } from "@/lib/api/types";
import { validateSearchQuery } from "@/lib/validation/search";

/**
 * 검색 결과 — `/search?q=` (Figma 검색 결과 1:939)
 *
 * **검색어는 searchParams 가 정본이다.** 클라이언트 상태로 들고 있으면 결과
 * 화면의 링크를 공유·북마크할 수 없고, 뒤로가기가 검색 이전으로 돌아가지 않는다.
 * 입력창(SearchInput)이 하는 일도 상태를 올리는 것이 아니라 이 URL 로 이동하는
 * 것뿐이다.
 *
 * 좌측 네비는 목록 페이지와 **같은 CategorySideNav** 이고 페이지네이션도 같은
 * 컴포넌트다. 검색 전용으로 다시 그린 것은 결과 줄(88px 고정 + 발췌 강조)뿐이다.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const keyword = (q ?? "").trim();

  // **검색어 규칙을 화면에서도 확인한다.** service 와 같은 순수 함수를 쓰므로
  // 두 벌이 아니다 (CLAUDE.md "검증"). 여기서 먼저 보는 이유는 400 응답을
  // 받아 문구를 되꺼내는 것보다 짧고, 무엇보다 **애초에 요청을 보내지 않기**
  // 위해서다 — 1글자 검색은 서버까지 갈 이유가 없다.
  const validation = keyword ? validateSearchQuery(keyword) : null;

  const query = new URLSearchParams({ q: keyword });
  if (pageParam) query.set("page", pageParam);

  const [categoryBody, resultBody] = await Promise.all([
    fetchApi<CategoryListBody>("/api/categories", REVALIDATE.categories),
    validation?.valid
      ? fetchApi<PageSearchListBody>(
          `/api/pages/search?${query.toString()}`,
          REVALIDATE.pages,
        )
      : null,
  ]);

  return (
    <div className="mx-auto max-w-page">
      {/* 목록 페이지와 같은 컨테이너다 (sidecat x=236(80폭) · 결과 프레임 1006폭). */}
      <div className="flex flex-col gap-[24px] px-4 pb-[60px] pt-[24px] lg:flex-row lg:items-start lg:gap-[40px] lg:pb-[100px] lg:pl-[236px] lg:pr-[150px] lg:pt-[60px]">
        <CategorySideNav current={{ type: "search" }} />

        {resultBody ? (
          <SearchResultList
            query={resultBody.query}
            pages={resultBody.pages}
            total={resultBody.total}
            categories={categoryBody.categories}
            // 페이지를 넘겨도 검색어가 유지되도록 q 를 기준 경로에 남긴다.
            basePath={`/search?q=${encodeURIComponent(resultBody.query)}`}
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
