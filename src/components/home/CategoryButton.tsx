import Link from "next/link";
import type { Category } from "@/lib/types";

type CategoryButtonProps = {
  category: Category;
  /** 현재 보고 있는 카테고리. Figma의 Variant2(채워진 초록) 상태로 그린다. */
  active?: boolean;
};

/**
 * 동그란 카테고리 버튼 (Figma 1:709 / 1:716 / 1:723, 110x110)
 *
 * - Default : 흰 배경 + 연두 테두리 2px
 * - Variant2: green2(#9BAE73) 채움 + 흰 글자 — active와 hover에 동일하게 적용한다.
 *
 * 표시는 짧은 형(name)만 쓴다. fullName은 Footer 전용이다.
 * 링크는 표시명이 아니라 불변 식별자인 slug로 건다.
 */
export default function CategoryButton({ category, active = false }: CategoryButtonProps) {
  return (
    <Link
      href={`/category/${category.slug}`}
      aria-current={active ? "page" : undefined}
      className={[
        "size-[110px] shrink-0 rounded-pill border-2 p-[10px] transition-colors",
        "flex flex-col items-center justify-center gap-[5px]",
        active
          ? "border-category-green2 bg-category-green2 text-white"
          : "border-category-green bg-white text-black hover:border-category-green2 hover:bg-category-green2 hover:text-white",
      ].join(" ")}
    >
      <span className="text-category-icon">{category.icon}</span>
      <span className="text-category-label">{category.name}</span>
    </Link>
  );
}
