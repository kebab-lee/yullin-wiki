import HeroHeaderBar from "@/components/home/HeroHeaderBar";
import SearchBox from "@/components/home/SearchBox";
import LinkBadge from "@/components/home/LinkBadge";
import CategoryButtonRow from "@/components/home/CategoryButtonRow";
import RecentPostCard from "@/components/home/RecentPostCard";
import SectionHeader from "@/components/home/SectionHeader";
import MoreButton from "@/components/common/MoreButton";
import type { Category, PagePreview, ViewerRole } from "@/lib/types";

// TODO: 인증 연동 시 세션에서 주입. 퍼블리싱용 임시값.
// (site)/layout.tsx 의 role 과 같은 자리에서 교체된다.
const role: ViewerRole = "GUEST";

// TODO: GET /api/categories 연동 시 제거
// 값은 supabase/migrations/20260804000000_init.sql 의 seed와 동일하다.
const CATEGORIES: Category[] = [
  {
    id: "1",
    slug: "space",
    name: "공간",
    fullName: "열린교회 속 공간",
    icon: "⛪️",
    sortOrder: 1,
  },
  {
    id: "2",
    slug: "serving",
    name: "섬김",
    fullName: "열린교회 내 섬김",
    icon: "🤲",
    sortOrder: 2,
  },
  {
    id: "3",
    slug: "youth",
    name: "열청",
    fullName: "열린교회 청년부",
    icon: "🌱",
    sortOrder: 3,
  },
];

// TODO: GET /api/pages?sort=recent&limit=3 연동 시 제거
const RECENT_POSTS: PagePreview[] = [
  {
    id: "1",
    title: "게시물 제목",
    tags: ["태그1", "태그2", "태그3"],
    content:
      "미리보기에 나타날 몇 줄 게시물 내용 미리보기에 나타날 몇 줄 게시물 내용 미리보기에 나타날 몇 줄 게시물 내용",
    commentCount: 0,
  },
  {
    id: "2",
    title: "게시물 제목이 길어진다면 이런식",
    tags: ["태그1", "태그2", "태그3"],
    content:
      "미리보기에 나타날 몇 줄 게시물 내용 미리보기에 나타날 몇 줄 게시물 내용 미리보기에 나타날 몇 줄 게시물 내용",
    commentCount: 1,
  },
  {
    id: "3",
    title: "게시물 제목이 세 줄 이상이라면",
    tags: ["태그1", "태그2", "태그3"],
    content:
      "미리보기에 나타날 몇 줄 게시물 내용 미리보기에 나타날 몇 줄 게시물 내용 미리보기에 나타날 몇 줄 게시물 내용",
    commentCount: 3,
  },
];

export default function HomePage() {
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
            <CategoryButtonRow categories={CATEGORIES} />
            <MoreButton href="/categories" />
          </div>

          {/* 최근 추가된 게시물 (Figma 1:380, h=190) */}
          <div className="flex h-[190px] items-center justify-between">
            <SectionHeader emoji="⏰" title="최근 추가된 게시물" href="/pages" />

            <div className="flex items-center gap-[25px]">
              {RECENT_POSTS.map((post) => (
                <RecentPostCard key={post.id} page={post} />
              ))}
            </div>

            <MoreButton href="/pages" />
          </div>
        </div>
      </section>
    </div>
  );
}
