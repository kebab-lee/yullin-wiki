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
    // lg 미만에서는 44.5px 간격이 화면을 다 먹는다. 버튼 크기는 그대로 두고
    // 간격만 줄인다 — 스크롤은 이 줄을 감싸는 쪽(홈 페이지)이 맡는다.
    <div className="flex w-max items-center gap-[18px] lg:w-auto lg:gap-[44.5px]">
      {categories.map((category, index) => (
        <Fragment key={category.slug}>
          {index > 0 && <div className="h-[33px] w-px shrink-0 bg-gray2" />}
          <CategoryButton category={category} active={category.slug === activeSlug} />
        </Fragment>
      ))}
    </div>
  );
}
