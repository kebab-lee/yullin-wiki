import Link from "next/link";

import { REVALIDATE } from "@/lib/api/baseUrl";
import { fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody } from "@/lib/api/types";

/**
 * 지금 보고 있는 목록.
 *
 * **"최근"을 slug 로 표현하지 않는 것이 이 유니온의 이유다.** 최근은 카테고리가
 * 아니라 전체 목록(`/pages`)이라 `categories` 에 대응하는 행이 없다. 하나의
 * `activeSlug?: string` 으로 합치면 `"recent"` 같은 가짜 slug 를 만들어야 하고,
 * 그 값이 언젠가 `/categories/recent` 로 링크되거나 DB 조회 키로 새어 나간다.
 */
/**
 * 검색 결과(`/search`)는 네비의 어느 칸도 아니다. 그래서 아무것도 활성화하지
 * 않는 변형을 따로 둔다 — 있지도 않은 slug 를 넘기거나 "최근"을 켜 두면
 * 사용자가 지금 최근 목록을 보고 있다고 읽는다.
 */
type SideNavCurrent =
  | { type: "category"; slug: string }
  | { type: "recent" }
  | { type: "search" };

type CategorySideNavProps = {
  current: SideNavCurrent;
};

/** "최근" 항목. 카테고리가 아니므로 시드가 아니라 화면이 갖는다. */
const RECENT_ITEM = { href: "/pages", icon: "⏰", label: "최근" } as const;

/**
 * 세로 네비의 동그란 버튼 한 칸 (80x80).
 *
 * CategoryButton(110x110)을 재사용하지 않는다 — 크기와 링크 대상이 둘 다 다르고
 * ("최근"은 카테고리 경로가 아니다), 한 컴포넌트에 size prop 을 붙이면 홈 시안과
 * 이 시안이 서로를 제약한다.
 */
function SideNavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "flex size-[80px] shrink-0 flex-col items-center justify-center gap-[4px]",
        "rounded-pill border-2 transition-colors",
        active
          ? "border-category-green2 bg-category-green2 text-white"
          : "border-category-green bg-white text-black hover:border-category-green2 hover:bg-category-green2 hover:text-white",
      ].join(" ")}
    >
      <span className="text-[28px] leading-[28px]" aria-hidden>
        {icon}
      </span>
      <span className="text-[14px] font-bold leading-[17px]">{label}</span>
    </Link>
  );
}

/**
 * 좌측 세로 카테고리 네비 (Figma Categories-sidecat 1:600 — 80x415)
 *
 * 항목 4개(공간·섬김·열청·최근)가 세로로 쌓인다. **앞의 셋은 카테고리 API 에서
 * 오고 마지막 하나는 화면이 갖는다** — 라벨 넷이 나란히 보이지만 성격이 다르다
 * (위 SideNavCurrent 주석).
 *
 * 카테고리를 하드코딩하지 않는다. 시드가 늘거나 표시명이 바뀌면 여기가 아니라
 * DB 가 정본이어야 한다. 자기 Route Handler 를 거치는 것도 규칙 그대로다
 * (CLAUDE.md "레이어 규칙") — 전체/항목별 두 페이지가 같은 네비를 쓰므로
 * 페이지마다 이 fetch 를 복붙하지 않게 컴포넌트가 직접 가져온다. 같은 URL·같은
 * revalidate 라 Next 의 fetch 캐시가 한 요청 안에서 중복 호출을 합친다.
 */
export default async function CategorySideNav({
  current,
}: CategorySideNavProps) {
  const { categories } = await fetchApi<CategoryListBody>(
    "/api/categories",
    REVALIDATE.categories,
  );

  return (
    <nav
      aria-label="항목"
      className="flex h-[415px] w-[80px] shrink-0 flex-col justify-between"
    >
      {categories.map((category) => (
        <SideNavItem
          key={category.slug}
          href={`/categories/${category.slug}`}
          icon={category.icon}
          label={category.name}
          active={current.type === "category" && current.slug === category.slug}
        />
      ))}

      <SideNavItem
        href={RECENT_ITEM.href}
        icon={RECENT_ITEM.icon}
        label={RECENT_ITEM.label}
        active={current.type === "recent"}
      />
    </nav>
  );
}
