import HeroHeaderBar from "@/components/home/HeroHeaderBar";
import SearchBox from "@/components/home/SearchBox";
import LinkBadge from "@/components/home/LinkBadge";
import CategoryButtonRow from "@/components/home/CategoryButtonRow";
import RecentPostCard from "@/components/home/RecentPostCard";
import SectionHeader from "@/components/home/SectionHeader";
import MoreButton from "@/components/common/MoreButton";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody, RecentPageListBody } from "@/lib/api/types";
import { getViewerRole } from "@/lib/auth/viewer";

/** Figma 1:380 기준 카드 3장. */
const RECENT_LIMIT = 3;

export default async function HomePage() {
  // 홈은 (site) 그룹 밖이라 layout 의 헤더를 받지 않는다.
  // HeroHeaderBar 가 헤더를 겸하므로 role 도 여기서 직접 읽는다.
  //
  // 데이터는 service 를 직접 부르지 않고 자기 Route Handler 를 거친다
  // (CLAUDE.md "레이어 규칙"). 두 요청은 서로를 기다릴 이유가 없어 같이 띄운다.
  const [role, categoryBody, recentBody] = await Promise.all([
    getViewerRole(),
    fetchApi<CategoryListBody>("/api/categories", REVALIDATE.categories),
    fetchApi<RecentPageListBody>(
      `/api/pages?limit=${RECENT_LIMIT}`,
      REVALIDATE.pages,
    ),
  ]);

  const categories = categoryBody.categories;
  const recentPages = recentBody.pages;

  return (
    // 홈은 (site) route group 밖이라 SiteHeader 를 받지 않는다.
    // Figma Home(1:318)에 Header 인스턴스가 없고 HeroHeaderBar 가 그 역할을 겸한다.
    // 푸터는 전 페이지 공통이라 루트 layout 이 담당한다.
    <div className="bg-white relative w-full">
      {/* === 히어로 영역 (빨강 배경) — 페이지 최상단에 붙는다 === */}
      <section className="relative w-full h-[732px] mx-auto max-w-page overflow-hidden">
        {/* 빨강 배경 박스 (둥근 하단) — Figma Rectangle 613 (x=316 y=0, 880x732) */}
        <div className="absolute top-0 left-1/2 z-0 -translate-x-1/2 w-hero h-[732px] bg-brand-red rounded-bl-hero rounded-br-hero" />

        {/* 장식용 원 — Figma Ellipse 16 (x=373 y=316, 416) : 중심이 프레임 중앙에서 -175px */}
        <div className="absolute top-[316px] left-1/2 z-0 -translate-x-1/2 -ml-[175px] size-[416px] rounded-full bg-white/10 pointer-events-none" />
        {/* 장식용 원 — Figma Ellipse 17 (x=623 y=227, 505) : 중심이 프레임 중앙에서 +119.5px */}
        <div className="absolute top-[227px] left-1/2 z-0 -translate-x-1/2 ml-[119.5px] size-[505px] rounded-full bg-white/10 pointer-events-none" />

        {/* 히어로 헤더바 — Figma Frame 1304 (x=316 y=79, 880x50) */}
        <HeroHeaderBar role={role} />

        {/* 중앙 콘텐츠 */}
        <div className="absolute top-[199px] left-1/2 z-10 -translate-x-1/2 w-hero-inner flex flex-col items-center gap-[60px]">
          <div className="flex flex-col items-center gap-10 w-full">
            {/* 로고 자리 */}
            <div className="h-[100px] w-[138px] rounded bg-white/30 flex items-center justify-center text-white text-sm">
              LOGO
            </div>

            {/* 타이틀 */}
            <div className="flex flex-col items-center justify-center gap-[30px] whitespace-nowrap">
              <h1 className="text-brand-red-white text-[55px] font-black leading-[22px]">
                열린 위키
              </h1>
              <p className="text-brand-red-pink text-[20px] font-medium leading-[22px]">
                열린교회에 대한 모든 것
              </p>
            </div>

            {/* 검색창 */}
            <SearchBox />
          </div>

          {/* 외부 링크 영역 */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-[10px] text-brand-red-white whitespace-nowrap">
              <div className="text-[18px] leading-[22px] font-semibold">
                <p>열린교회에 대해</p>
                <p>더 알고 싶다면?</p>
              </div>
              <span className="text-[25px] leading-[22px]">→</span>
            </div>

            <LinkBadge topLabel="열린교회" bottomLabel="공식페이지" />
            <LinkBadge topLabel="열린교회" bottomLabel="인스타" />
            <LinkBadge topLabel="열린교회" bottomLabel="문화팀" />
          </div>
        </div>
      </section>

      {/* === 콘텐츠 영역 (Figma 1:366, 895x380) === */}
      <section className="mx-auto max-w-page">
        <div className="mx-auto flex w-content flex-col gap-20 mt-[65px] mb-[160px]">
          {/* 항목별 둘러보기 (Figma 1:367, h=110) */}
          <div className="flex h-[110px] items-center justify-between">
            <SectionHeader emoji="📂" title="항목별로 둘러보기" href="/categories" />
            <CategoryButtonRow categories={categories} />
            <MoreButton href="/categories" />
          </div>

          {/* 최근 추가된 게시물 (Figma 1:380, h=190) */}
          <div className="flex h-[190px] items-center justify-between">
            <SectionHeader emoji="⏰" title="최근 추가된 게시물" href="/pages" />

            <div className="flex items-center gap-[25px]">
              {recentPages.length === 0 ? (
                <p className="text-[16px] text-gray3">
                  아직 등록된 게시물이 없습니다.
                </p>
              ) : (
                recentPages.map((post) => (
                  <RecentPostCard key={post.id} page={post} />
                ))
              )}
            </div>

            <MoreButton href="/pages" />
          </div>
        </div>
      </section>
    </div>
  );
}
