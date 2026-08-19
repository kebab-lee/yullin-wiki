import { notFound } from "next/navigation";

import CategorySideNav from "@/components/page/CategorySideNav";
import SearchResultList from "@/components/search/SearchResultList";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody, PageSearchListBody } from "@/lib/api/types";
import { NotFoundError } from "@/lib/errors";
import { readCategoryParam, searchHref } from "@/lib/search/searchUrl";
import * as pageService from "@/lib/services/pageService";
import { validateSearchQuery } from "@/lib/validation/search";

/**
 * 검색 결과 — `/search?q=&category=` (Figma 검색 결과 1:939)
 *
 * ─────────────────────────────────────────────────────────────
 * **이 화면은 self-fetch 를 쓰지 않는다** (`src/lib/api/serverFetch.ts`).
 * 검색 결과만 `fetchApi("/api/pages/search?…")` 대신 `pageService.searchPages()`
 * 를 직접 부른다. (같은 화면의 항목 목록은 그대로 self-fetch 다 — 직접 부르는
 * 것은 검색 결과 한 호출뿐이다.) **공개 화면 중에서는 여기 하나이지만 전체로는
 * 하나가 아니다** — 어드민 화면들이 같은 기준으로 직접 호출한다.
 *
 * 예외 사유 — **검색은 캐시도 정적화도 불가능해 왕복 비용을 매 요청 낸다.**
 * 검색 RPC 자체는 14.5ms 다(explain analyze, 인덱스 정상). 그런데도 매 요청
 * 느렸으므로 콜드 스타트가 아니라 self-fetch 왕복이라는 구조적 비용이다.
 * 다른 공개 페이지(홈 · `/pages/[id]` · `/categories`)는 정적 생성이라 그 비용을
 * 빌드 시점 1회로 흡수했지만, `/search` 는 쿼리마다 URL 이 달라 fetch 캐시가
 * 걸리지 않고 `searchParams` 를 읽어 정적화도 안 된다(CLAUDE.md "읽기 페이지는
 * 정적으로 생성된다"). 공개 페이지 중 이 비용을 매번 내는 화면은 여기뿐이다.
 *
 * **다만 "캐시가 전혀 안 걸린다"는 아니다 — 측정해 보면 같은 검색어를 연달아
 * 치는 경우는 걸린다.** 로컬 프로덕션 빌드에서 같은 검색어 3회는 46ms → 7ms →
 * 7ms 였다(self-fetch 의 fetch 캐시, REVALIDATE.pages=300). 직접 호출은 그
 * 히트를 포기하는 대신 **모든 첫 요청을 균일하게 낮춘다** — 서로 다른 검색어
 * 3개는 29~36ms → 26~28ms 였다. 검색은 같은 문자열이 되풀이되는 조회가 아니라
 * 대부분이 첫 요청이므로 이 교환이 이득이다. 로컬 수치가 작은 것은 loopback
 * 이라 그렇고, 서버리스에서는 그 왕복이 함수 간 호출이라 차이가 더 크다.
 *
 * **`GET /api/pages/search` 는 그대로 살아 있다.** 클라이언트·외부 소비자의
 * 계약이고, Java 이관 시 남아야 할 계약도 그쪽이다. 이 파일이 그 라우트를
 * 부르지 않을 뿐 라우트를 지운 것이 아니다.
 *
 * **Java 이관 시 이 파일의 import 를 `fetchApi` 로 되돌려야 한다.** service 가
 * 사라지면 직접 호출도 사라진다. 다른 페이지는 무변경이지만 이 파일 하나는
 * 손대야 한다 — 되돌리는 자리가 아래 `searchResult()` 하나로 모여 있고, 응답을
 * `PageSearchListBody`(라우트와 같은 계약)로 맞춰 두었으므로 화면 코드는 그때도
 * 그대로다.
 *
 * **기준 없이 늘리지 마라.** 갈림길은 "왕복 비용을 캐시가 흡수하는가" 하나이고
 * (CLAUDE.md "서버 컴포넌트의 self-fetch"), 새로 옮기려면 같은 수준의 측정
 * 근거(쿼리 자체 시간 · 매 요청 재현 · 캐시/정적화 불가 사유)가 필요하다.
 * ─────────────────────────────────────────────────────────────
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

/**
 * `?page=` → 숫자. 없거나 숫자가 아니면 undefined 로 넘겨 "기본값을 써라"는 뜻을
 * service 에 그대로 전달한다. 라우트 핸들러가 쿼리스트링에 하던 변환과 같다 —
 * 그 자리를 이 파일이 대신 맡았으므로 변환도 함께 넘어왔다.
 */
function readPageParam(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;

  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * 검색 결과 한 페이지. **self-fetch 예외가 사는 자리는 여기 하나다.**
 *
 * 없는 항목 slug 만 not-found 로 옮기고 나머지 실패는 그대로 터뜨린다 — 전부
 * 삼키면 장애가 "없는 항목"으로 위장된다 (`/categories/[slug]` 와 같은 처리).
 * 오타 난 항목을 결과 0건으로 답하지 않는 이유가 이것이다: 사용자가 항목이 틀린
 * 줄 모르고 검색어만 계속 고치게 된다. 라우트를 거칠 때는 이 판정이 404 였고,
 * 직접 부르는 지금은 service 가 던지는 NotFoundError 다. **같은 판정의 다른
 * 표현일 뿐이므로 화면 동작은 이전과 같다.**
 *
 * 반환 타입을 `PageSearchListBody` 로 두는 것도 의도다. 라우트 핸들러가
 * 내려주던 것과 같은 모양이라 화면 코드가 예외를 눈치채지 못하고, Java 이관 시
 * 이 함수 본문만 `fetchApi` 로 되돌리면 끝난다.
 */
async function searchResult(
  keyword: string,
  categorySlug: string | null,
  pageParam: string | undefined,
): Promise<PageSearchListBody | null> {
  try {
    const result = await pageService.searchPages(
      keyword,
      { page: readPageParam(pageParam) },
      categorySlug ?? undefined,
    );

    return {
      pages: result.items,
      total: result.total,
      page: result.page,
      size: result.size,
      query: result.query,
      category: result.category,
    };
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const { q, category: categoryParam, page: pageParam } = await searchParams;
  const keyword = (q ?? "").trim();
  const categorySlug = readCategoryParam(categoryParam);

  // **검색어 규칙을 화면에서도 확인한다.** service 와 같은 순수 함수를 쓰므로
  // 두 벌이 아니다 (CLAUDE.md "검증"). 여기서 먼저 보는 이유는 service 가 던지는
  // ValidationError 를 되받아 문구를 꺼내는 것보다 짧고, 무엇보다 **애초에
  // 검색을 시작하지 않기** 위해서다 — 1글자 검색은 DB 까지 갈 이유가 없다.
  const validation = keyword ? validateSearchQuery(keyword) : null;

  const [categoryBody, resultBody] = await Promise.all([
    // 항목 목록은 그대로 self-fetch 다. 쿼리와 무관해 캐시(1시간)가 걸리므로
    // 위의 예외 사유가 여기엔 해당하지 않는다.
    fetchApi<CategoryListBody>("/api/categories", REVALIDATE.categories),
    validation?.valid ? searchResult(keyword, categorySlug, pageParam) : null,
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
