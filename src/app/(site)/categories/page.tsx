import { notFound } from "next/navigation";

import CategoryRow from "@/components/category/CategoryRow";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { ApiResponseError, fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody, PagedPageListBody } from "@/lib/api/types";

/**
 * ── 이 줄에 적혀 있던 근거는 사실이 아니었다 ────────────────
 * 예전 주석은 "빌드 시점에는 API 를 받아줄 서버가 없어 self-fetch 가 깨진다"
 * 였다. **아니다** — 빌드는 이미 떠 있는 배포를 향해 fetch 하고(getBaseUrl:
 * NEXT_PUBLIC_SITE_URL / VERCEL_URL), 홈과 게시물 상세가 그렇게 실제 데이터를
 * 담은 채 프리렌더되고 있다. 같은 문장이 `/pages/[id]` 에도 있었고 거기서는
 * 지웠다.
 *
 * **그래서 이 줄은 지금 근거 없이 남아 있다.** 이 화면에는 동적이어야 할 이유가
 * 없다 — 세션도 `searchParams` 도 읽지 않고, 데이터는 캐시되는 fetch 둘
 * (`/api/categories` · 항목마다 `/api/pages?category=…`)뿐이며 그 캐시는
 * `revalidatePath("/", "layout")` 이 턴다. 지우면 정적이 된다는 것도 확인했다 —
 * 이 줄만 빼고 빌드하면 `○ /categories` (Revalidate 5m)로 찍히고
 * `.next/server/app/categories.html` 이 실제 항목·게시물을 담은 채 생성된다.
 *
 * 정적으로 돌리면 아래 N+1 요청(항목 수만큼)이 요청 시점이 아니라 빌드 시점에
 * 한 번만 일어난다는 점에서 이득도 크다. **그럼에도 이번 작업의 범위가 아니라서
 * 그대로 둔다** — 지울 때는 위 측정을 다시 확인하고 지워라.
 */
export const dynamic = "force-dynamic";

/**
 * 항목 줄 하나에 올릴 카드 수 — Figma Frame 1317(620px = 190×3 + 25×2).
 *
 * 홈의 RECENT_LIMIT 과 같은 3 이지만 상수를 공유하지 않는다. 근거가 다른 시안
 * 두 개(1:380 / 1:584)라 한쪽이 바뀌어도 다른 쪽이 끌려가면 안 된다.
 */
const ROW_CARD_LIMIT = 3;

/**
 * 항목별 게시물 — `/categories` (Figma 1:572)
 *
 * 홈의 "📂 항목별로 둘러보기 → 더보기"가 오는 곳이다. **예전에는 첫 항목으로
 * 리다이렉트했다.** 항목이 셋뿐이고 홈 버튼 줄이 그 셋을 전부 그리던 때에는
 * 이 화면이 홈과 같은 일을 하는 중복이었기 때문이다. 지금은 홈이 앞의 셋만
 * 그리므로(HOME_CATEGORY_LIMIT) 나머지 항목에 닿는 유일한 길이 여기다 —
 * 리다이렉트로 두면 넷째 항목부터는 주소를 직접 치는 수밖에 없다.
 *
 * 화면은 시안 그대로 항목마다 한 줄(CategoryRow)을 쌓는다. 홈의 원형 버튼 줄과
 * 달리 이 줄은 각 항목의 최근 게시물까지 보여주므로 "같은 화면 둘"이 아니다.
 *
 * 항목 사이 이동은 여전히 `/categories/[slug]` 좌측 세로 네비가 담당한다.
 * 그래서 이 화면에는 네비를 붙이지 않는다 (자기 자신으로 가는 칸이 없다).
 */
export default async function CategoriesPage() {
  const { categories } = await fetchApi<CategoryListBody>(
    "/api/categories",
    REVALIDATE.categories,
  );

  // 항목이 하나도 없으면 그릴 것이 없다. 빈 화면보다 404 가 낫다 — 시드가 빠진
  // 상태이지 "항목이 없는 것이 정상"인 화면이 아니다.
  if (categories.length === 0) notFound();

  // 항목마다 최근 N 건. 서로 기다릴 이유가 없어 같이 띄운다. 항목 수만큼 요청이
  // 늘지만(N+1) 항목은 페이지네이션이 없는 규모이고, 이걸 한 방에 받으려면
  // "항목별 최근 N건"이라는 API 를 새로 파야 한다 — 화면 하나를 위해 계약을
  // 늘리지 않는다 (categoryService.listCategoriesForAdmin 과 같은 판단).
  const rows = await Promise.all(
    categories.map(async (category) => {
      const query = new URLSearchParams({
        category: category.slug,
        size: String(ROW_CARD_LIMIT),
      });

      // 목록을 받는 사이에 항목이 지워졌으면 404 가 온다. 그 한 줄만 비우고
      // 화면은 그린다 — 나머지 실패(DB 장애 등)는 그대로 터뜨린다.
      const body = await fetchApi<PagedPageListBody>(
        `/api/pages?${query.toString()}`,
        REVALIDATE.pages,
      ).catch((error: unknown) => {
        if (error instanceof ApiResponseError && error.status === 404) return null;
        throw error;
      });

      return { category, pages: body?.pages ?? [] };
    }),
  );

  return (
    <div className="mx-auto max-w-page">
      {/* lg 이상은 Figma 그대로(헤더 x=253 · Frame 1461 x=356, 880폭).
          lg 미만은 좌우 16px 패딩. */}
      <div className="px-4 pb-[60px] pt-[24px] lg:pb-[100px] lg:pl-[253px] lg:pr-[276px] lg:pt-[60px]">
        {/* 화면 헤더 — Figma 1:579 (이모지 45px + 제목 x=65). 목록 화면들과 같은 모양. */}
        <header className="flex items-center gap-[12px] lg:gap-[20px]">
          <span
            className="text-[32px] leading-[32px] lg:text-[45px] lg:leading-[45px]"
            aria-hidden
          >
            📂
          </span>
          <h1 className="text-[22px] font-bold leading-[34px] text-black lg:text-[28px]">
            항목별 게시물
          </h1>
        </header>

        {/* 줄 사이 구분선(Figma Line 6/5, 800폭)은 `divide-y` 가 아니라 gap 과
            border 로 낸다 — 항목 수만큼 줄이 늘어나므로 높이를 고정하지 않고,
            마지막 줄 아래에 선이 남지 않게 첫 줄을 뺀 나머지에만 붙인다. */}
        <div className="mt-[40px] flex flex-col lg:mt-[61px] lg:pl-[103px]">
          {rows.map(({ category, pages }, index) => (
            <div
              key={category.slug}
              className={
                index === 0
                  ? ""
                  : "mt-[40px] border-t border-gray2 pt-[40px] lg:mt-[60px] lg:pt-[60px]"
              }
            >
              <CategoryRow category={category} pages={pages} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
