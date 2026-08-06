import { notFound, redirect } from "next/navigation";

import { REVALIDATE } from "@/lib/api/baseUrl";
import { fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody } from "@/lib/api/types";

/**
 * **프리렌더 금지.** `/pages/[id]` 와 같은 이유다 — 자기 Route Handler 를 fetch
 * 하는데 params·searchParams 를 읽지 않아서 Next 가 빌드 시점에 미리 렌더하려
 * 들고, 그 시점에는 API 를 받아줄 서버가 없다.
 */
export const dynamic = "force-dynamic";

/**
 * 항목 둘러보기 — `/categories`
 *
 * 홈의 "📂 항목별로 둘러보기 → 더보기"가 오는 곳이다. **화면을 새로 그리지 않고
 * 첫 항목으로 넘긴다.**
 *
 * 근거: Figma 에 "전체 항목 목록" 화면이 없다. 항목별 게시물 시안(1:572 /
 * 항목-공간 1:598)이 곧 특정 항목의 목록이고, 항목 사이 이동은 그 화면 좌측의
 * 세로 네비(Categories-sidecat 1:600)가 담당한다. 여기에 항목 카드를 늘어놓은
 * 화면을 새로 만들면 (a) 시안에 없는 화면이 생기고 (b) 홈의 카테고리 버튼
 * 줄(1:373)과 같은 일을 하는 화면이 둘로 늘어난다 (CLAUDE.md "화면 중복").
 *
 * 첫 항목의 기준은 시드 순서(sortOrder)다 — 표시명이나 코드에 박은 slug 가
 * 아니라 DB 가 정본이다. 항목이 늘거나 순서가 바뀌면 이 파일은 안 바뀐다.
 */
export default async function CategoriesPage() {
  const { categories } = await fetchApi<CategoryListBody>(
    "/api/categories",
    REVALIDATE.categories,
  );

  const first = categories[0];
  // 항목이 하나도 없으면 넘길 곳이 없다. 빈 화면을 그리는 것보다 404 가 낫다 —
  // 시드가 빠진 상태이지 "항목이 없는 것이 정상"인 화면이 아니다.
  if (!first) notFound();

  // replace 가 아니라 기본(temporary) 리다이렉트다. 첫 항목은 시드 순서에 따라
  // 바뀔 수 있어서 브라우저가 이 경로를 영구 캐시하면 안 된다.
  redirect(`/categories/${first.slug}`);
}
