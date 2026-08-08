import CategorySideNav from "@/components/page/CategorySideNav";
import PageList from "@/components/page/PageList";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody, PagedPageListBody } from "@/lib/api/types";

/**
 * 전체 게시물 목록 — `/pages`
 *
 * 홈의 "최근 추가된 게시물 → 더보기"가 오는 곳이다. 정렬은 홈 카드와 같은
 * 최신순이고 다른 것은 페이지네이션이 붙는다는 점뿐이다.
 *
 * 항목별 목록(`/categories/[slug]`)과 **같은 PageList 를 쓴다.** 이 파일이 아는
 * 것은 "어떤 조건의 목록인가"뿐이고 목록의 모양은 컴포넌트가 갖는다.
 *
 * searchParams 를 읽으므로 동적 렌더링이다 — 그래서 빌드 시점에 자기 자신을
 * fetch 하지 않는다 (`/pages/[id]` 가 force-dynamic 을 명시해야 했던 이유의 반대).
 */
export default async function AllPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;

  // 잘못된 page 값을 여기서 판정하지 않는다. 그대로 넘기면 service 가 안전한
  // 값으로 접고, 실제로 적용된 값을 응답에 되돌려준다 (중복 검증을 두지 않는다).
  const query = new URLSearchParams();
  if (pageParam) query.set("page", pageParam);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  // 카테고리는 목록 항목의 배지 표시명에 쓴다. 두 요청은 서로를 기다릴 이유가
  // 없어 같이 띄운다.
  const [categoryBody, listBody] = await Promise.all([
    fetchApi<CategoryListBody>("/api/categories", REVALIDATE.categories),
    fetchApi<PagedPageListBody>(`/api/pages${suffix}`, REVALIDATE.pages),
  ]);

  return (
    <div className="mx-auto max-w-page">
      {/* lg 이상은 Figma 그대로(sidecat x=236(80폭) · lists 1006폭).
          lg 미만은 좌우 16px 패딩에 네비가 목록 위로 올라간다 —
          검색 결과·항목별 목록과 같은 컨테이너다. */}
      <div className="flex flex-col gap-[24px] px-4 pb-[60px] pt-[24px] lg:flex-row lg:items-start lg:gap-[40px] lg:pb-[100px] lg:pl-[236px] lg:pr-[150px] lg:pt-[60px]">
        <CategorySideNav current={{ type: "recent" }} />

        <PageList
          emoji="⏰"
          title="최근 추가된 게시물"
          pages={listBody.pages}
          total={listBody.total}
          categories={categoryBody.categories}
          basePath="/pages"
          currentPage={listBody.page}
          size={listBody.size}
        />
      </div>
    </div>
  );
}
