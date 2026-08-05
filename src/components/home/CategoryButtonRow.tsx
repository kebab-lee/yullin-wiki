import { Fragment } from "react";
import type { Category } from "@/lib/types";
import CategoryButton from "./CategoryButton";

type CategoryButtonRowProps = {
  categories: Category[];
  /** 강조할 카테고리의 slug. 표시명이 아니라 slug로 비교한다. */
  activeSlug?: string;
};

/**
 * 카테고리 버튼 가로 배열 + 사이 구분선 (Figma 1:373, 510x110)
 *
 * Figma 기준 버튼 중심 간격 200px = 110(버튼) + 44.5 + 1(구분선) + 44.5
 */
export default function CategoryButtonRow({
  categories,
  activeSlug,
}: CategoryButtonRowProps) {
  return (
    <div className="flex items-center gap-[44.5px]">
      {categories.map((category, index) => (
        <Fragment key={category.slug}>
          {index > 0 && <div className="h-[33px] w-px shrink-0 bg-gray2" />}
          <CategoryButton category={category} active={category.slug === activeSlug} />
        </Fragment>
      ))}
    </div>
  );
}
