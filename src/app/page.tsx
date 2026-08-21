import HeroHeaderBar from "@/components/home/HeroHeaderBar";
import SearchInput from "@/components/common/SearchInput";
import LinkBadge from "@/components/home/LinkBadge";
import {
  GlobeIcon,
  InstagramIcon,
  YoutubeIcon,
} from "@/components/home/LinkBadgeIcons";
import CategoryButtonRow from "@/components/home/CategoryButtonRow";
import RecentPostCard from "@/components/home/RecentPostCard";
import SectionHeader from "@/components/home/SectionHeader";
import MoreButton from "@/components/common/MoreButton";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody, RecentPageListBody } from "@/lib/api/types";
import Image from "next/image";

/** Figma 1:380 기준 카드 3장. */
const RECENT_LIMIT = 3;

/**
 * 홈에 노출할 항목 버튼 수.
 *
 * **홈은 전체 목록이 아니라 "일부 + 더보기"다.** Figma 카테고리 줄(1:373)이
 * 510px 고정 폭이고 그 안이 110px 버튼 3개 + 구분선 2개(110×3 + 44.5×4 + 1×2
 * = 510)로 짜여 있다. 그 오른쪽에 더보기(1:379)가 이미 붙어 있는 것이 시안이
 * 전부 그리지 않는다는 증거다. 전부 그리면 항목이 늘 때마다 이 줄이
 * 가로로 밀려 나가고, 데스크톱에서는 같은 줄의 섹션 헤더·더보기를 눌러
 * 찌그러뜨린다.
 *
 * 넘치는 항목은 사라지지 않는다 — 더보기(`/categories`)가 전부 보여준다.
 * 값을 키우려면 시안의 510px 폭도 함께 바뀌어야 한다.
 */
const HOME_CATEGORY_LIMIT = 3;

export default async function HomePage() {
  // 홈은 (site) 그룹 밖이라 layout 의 헤더를 받지 않는다.
  // HeroHeaderBar 가 헤더를 겸한다.
  //
  // **여기서 세션을 읽지 않는다.** 예전에는 getViewerRole() 로 role 을 읽어
  // HeroHeaderBar 에 넘겼는데, 그 쿠키 읽기 하나가 홈 전체를 동적 렌더로
  // 만든다. 로그인 표시는 브라우저가 정한다 (ViewerAuthActions).
  //
  // 데이터는 service 를 직접 부르지 않고 자기 Route Handler 를 거친다
  // (CLAUDE.md "레이어 규칙"). 두 요청은 서로를 기다릴 이유가 없어 같이 띄운다.
  const [categoryBody, recentBody] = await Promise.all([
    fetchApi<CategoryListBody>("/api/categories", REVALIDATE.categories),
    fetchApi<RecentPageListBody>(
      `/api/pages?limit=${RECENT_LIMIT}`,
      REVALIDATE.pages,
    ),
  ]);

  // 앞의 HOME_CATEGORY_LIMIT 개만 그린다. 정렬은 여기서 다시 하지 않는다 —
  // GET /api/categories 가 이미 sortOrder 오름차순이고(categoryService.listCategories),
  // 화면이 같은 규칙을 한 번 더 적으면 정렬 기준이 두 곳으로 갈린다.
  const categories = categoryBody.categories.slice(0, HOME_CATEGORY_LIMIT);
  const recentPages = recentBody.pages;

  return (
    // 홈은 (site) route group 밖이라 SiteHeader 를 받지 않는다.
    // Figma Home(1:318)에 Header 인스턴스가 없고 HeroHeaderBar 가 그 역할을 겸한다.
    // 푸터는 전 페이지 공통이라 루트 layout 이 담당한다.
    <div className="bg-white relative w-full">
      {/* === 히어로 영역 (빨강 배경) — 페이지 최상단에 붙는다 ===

          시안 좌표(top-[199px] 등)를 절대 배치로 옮겨 두면 폭이 줄어도 값이
          그대로라 좁은 화면에서 통째로 깨진다. 그래서 빨강 박스 자체를 흐름
          위의 컨테이너로 두고 내부를 세로 flex 로 쌓는다.

          데스크톱 픽셀은 그대로다:
            상단 79 + 헤더바(35+15+1=51) = 130  →  mt-69  →  콘텐츠 top 199 */}
      <section className="mx-auto max-w-page px-4 lg:px-0">
        {/* Figma Rectangle 613 (x=316 y=0, 880x732) */}
        <div className="relative mx-auto w-full max-w-hero overflow-hidden rounded-bl-hero rounded-br-hero bg-brand-red">
          {/* 장식용 원. 흐름에 참여하지 않는 순수 장식이라 절대 배치를 유지한다 —
              flex 로 옮길 수 있는 요소가 아니다. 좌표는 빨강 박스 기준이고
              시안값(프레임 중앙 기준 -175 / +119.5)이 그대로 성립한다.
              lg 미만에서는 박스보다 원이 커져 붉은 면이 얼룩져 보이므로 감춘다. */}
          <div className="pointer-events-none absolute left-1/2 top-[316px] z-0 -ml-[175px] hidden size-[416px] -translate-x-1/2 rounded-full bg-white/10 lg:block" />
          <div className="pointer-events-none absolute left-1/2 top-[227px] z-0 ml-[119.5px] hidden size-[505px] -translate-x-1/2 rounded-full bg-white/10 lg:block" />

          <div className="relative z-10 flex flex-col items-center px-4 pb-[50px] pt-[30px] lg:h-[732px] lg:px-10 lg:pb-0 lg:pt-[79px]">
            {/* 히어로 헤더바 — Figma Frame 1304 (x=316 y=79, 880x50) */}
            <HeroHeaderBar />

            {/* 중앙 콘텐츠 — Figma 기준 top=199 */}
            <div className="mt-[40px] flex w-full flex-col items-center gap-[40px] lg:mt-[69px] lg:w-hero-inner lg:gap-[60px]">
              <div className="flex w-full flex-col items-center gap-[24px] lg:gap-10">
                <Image
                  src="/brand/logo-footer.svg"
                  alt="열린 위키"
                  width={137}
                  height={100}
                  className="h-auto w-[100px] lg:w-[137px]"
                />

                {/* 타이틀 */}
                <div className="flex flex-col items-center justify-center gap-[20px] whitespace-nowrap lg:gap-[30px]">
                  <h1 className="text-brand-red-white text-[40px] font-black leading-[22px] lg:text-[55px]">
                    열린 위키
                  </h1>
                  <p className="text-brand-red-pink text-[16px] font-medium leading-[22px] lg:text-[20px]">
                    열린교회에 대한 모든 것
                  </p>
                </div>

                {/* 검색창 */}
                <SearchInput variant="hero" />
              </div>

              {/* 외부 링크 영역 — 좁은 화면에서는 배지가 다음 줄로 접힌다 */}
              <div className="flex w-full flex-wrap items-center justify-center gap-[16px] lg:flex-nowrap lg:justify-between lg:gap-0">
                <div className="flex w-full items-center justify-center gap-[10px] text-brand-red-white whitespace-nowrap lg:w-auto lg:justify-start">
                  <div className="text-[16px] leading-[22px] font-semibold lg:text-[18px]">
                    <p>열린교회에 대해</p>
                    <p>더 알고 싶다면?</p>
                  </div>
                  <span className="text-[25px] leading-[22px]">→</span>
                </div>

                <LinkBadge
                  topLabel="열린교회"
                  bottomLabel="공식페이지"
                  href="https://www.yullin.org"
                  icon={<GlobeIcon />}
                />
                <LinkBadge
                  topLabel="청년부"
                  bottomLabel="인스타그램"
                  href="https://www.instagram.com/yullin_yct"
                  icon={<InstagramIcon />}
                />
                <LinkBadge
                  topLabel="청년부"
                  bottomLabel="Youtube"
                  href="https://youtube.com/@yullinyouth?si=7_STglS5ddSmRXuT"
                  icon={<YoutubeIcon />}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === 콘텐츠 영역 (Figma 1:366, 895x380) === */}
      <section className="mx-auto max-w-page">
        <div className="mx-auto mb-[80px] mt-[40px] flex w-full max-w-content flex-col gap-[50px] px-4 lg:mb-[160px] lg:mt-[65px] lg:gap-20 lg:px-0">
          {/* 항목별 둘러보기 (Figma 1:367, h=110)

              lg 미만에서는 한 줄에 셋이 들어가지 않는다. 헤더 · 버튼줄 · 더보기를
              세로로 쌓고, 버튼줄만 가로 스크롤로 남긴다 (항목 수가 늘어도 깨지지
              않는 쪽이 줄바꿈보다 낫다). */}
          <div className="flex flex-col gap-[20px] lg:h-[110px] lg:flex-row lg:items-center lg:justify-between lg:gap-0">
            <SectionHeader
              emoji="📂"
              title="항목별로 둘러보기"
              href="/categories"
            />

            {/* `-mx-4 px-4` 는 컨테이너 좌우 패딩을 상쇄해 화면 끝까지 흐르게 한다 */}
            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:overflow-x-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
              <CategoryButtonRow categories={categories} />
            </div>

            <MoreButton href="/categories" />
          </div>

          {/* 최근 추가된 게시물 (Figma 1:380, h=190) */}
          <div className="flex flex-col gap-[20px] lg:h-[190px] lg:flex-row lg:items-center lg:justify-between lg:gap-0">
            <SectionHeader
              emoji="⏰"
              title="최근 추가된 게시물"
              href="/pages"
            />

            <div className="-mx-4 flex items-center gap-[15px] overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:gap-[25px] lg:overflow-x-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
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
