import Link from "next/link";

import MoreButton from "@/components/common/MoreButton";
import RecentPostCard from "@/components/home/RecentPostCard";
import type { Category, PageSummary } from "@/lib/types";

type CategoryRowProps = {
  category: Category;
  /** 이 항목의 최근 게시물. 카드 수는 부모가 정한다 (Figma 기준 3장). */
  pages: PageSummary[];
};

/**
 * 항목 하나의 가로 줄 — Figma `categories-row` 1:584 (880x190)
 *
 * 구성은 [항목 이름 + →] · [카드 3장] · [더보기] 세 덩어리다.
 * 셋 다 같은 곳(`/categories/[slug]`)으로 간다 — 시안이 세 군데에 링크를 둔
 * 것은 목적지가 달라서가 아니라 줄 전체가 하나의 진입점이기 때문이다.
 *
 * **데이터를 스스로 가져오지 않는다.** 어떤 항목의 어떤 게시물인가는 라우트가
 * 아는 사실이다 (PageList 와 같은 규칙).
 *
 * **고정 높이(190px)를 쓰지 않는다.** 시안의 190 은 카드 한 장의 높이지, 줄의
 * 제약이 아니다. lg 미만에서는 이름 · 카드 · 더보기가 세로로 쌓여 높이가
 * 달라지고, 카드가 없는 항목은 안내 문구 한 줄만 남는다.
 */
export default function CategoryRow({ category, pages }: CategoryRowProps) {
  const href = `/categories/${category.slug}`;

  return (
    <div className="flex flex-col gap-[20px] lg:flex-row lg:items-center lg:gap-0">
      {/* 좌: 아이콘 + 짧은 형 이름 + → (Figma Frame 1462, 130x85)

          lg 미만에서는 세로 85px 배치가 카드 위에서 자리만 먹는다. 같은 조각을
          가로 한 줄로 눕힌다 — 컴포넌트를 따로 만들지 않는다. */}
      <Link
        href={href}
        className="flex shrink-0 items-center gap-[10px] lg:w-[130px] lg:justify-between lg:gap-0"
      >
        <span className="flex items-center gap-[10px] lg:w-[52px] lg:flex-col lg:gap-[10px]">
          <span
            className="text-[32px] leading-[32px] lg:text-[45px] lg:leading-[45px]"
            aria-hidden
          >
            {category.icon}
          </span>
          {/* 표시명은 짧은 형(name). 긴 형(fullName)은 푸터 전용이다. */}
          <span className="whitespace-nowrap text-[20px] font-bold leading-[30px] text-black lg:text-[25px]">
            {category.name}
          </span>
        </span>
        <span className="text-[20px] leading-[30px] text-black lg:text-[25px]" aria-hidden>
          →
        </span>
      </Link>

      {/* 중앙: 카드 (Figma Frame 1317, 620px = 190x3 + 25x2)

          `-mx-4 px-4` 는 컨테이너 좌우 패딩을 상쇄해 카드가 화면 끝까지
          흐르게 한다 (홈 카드 줄과 같은 처리). */}
      <div className="-mx-4 flex min-w-0 flex-1 items-center gap-[15px] overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:gap-[25px] lg:overflow-x-visible lg:pl-[50px] lg:pr-[30px] [&::-webkit-scrollbar]:hidden">
        {pages.length === 0 ? (
          <p className="text-[16px] text-gray3">아직 등록된 게시물이 없습니다.</p>
        ) : (
          pages.map((page) => <RecentPostCard key={page.id} page={page} />)
        )}
      </div>

      <MoreButton href={href} />
    </div>
  );
}
