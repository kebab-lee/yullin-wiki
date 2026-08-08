import Link from "next/link";

import type { Category } from "@/lib/types";

type CategoryBadgeProps = {
  category: Category;
};

/**
 * 항목 배지 — 아이콘 + 짧은 이름 (Figma 1:1377, 66x32)
 *
 * 표시명은 짧은 형(name)이다. 긴 형(fullName)은 푸터 전용이고, 링크 주소는
 * 표시명이 아니라 slug 로 만든다 (CLAUDE.md "분기 조건에 표시명을 쓰지 않는다").
 */
export default function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      // `shrink-0 whitespace-nowrap` — 좁은 화면에서 제목과 한 줄에 놓이면
      // 배지가 눌려 "공 간" 처럼 두 줄로 쪼개진다.
      className="inline-flex h-[32px] shrink-0 items-center gap-[4px] whitespace-nowrap rounded-badge bg-category-green-light px-[12px] text-[14px] leading-[17px] text-category-green-dark transition-opacity hover:opacity-80"
    >
      <span aria-hidden>{category.icon}</span>
      {category.name}
    </Link>
  );
}
