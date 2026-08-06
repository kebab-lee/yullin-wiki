// GET /api/pages — 공개 게시물 목록
//
//   ?limit=                     최근 게시물 (홈)
//   ?category=slug&page=&size=  항목별 목록 (/categories/[slug])
//
// 두 갈래가 한 라우트에 있는 이유는 둘 다 "공개 게시물 목록"이라는 같은
// 컬렉션이고 조건만 다르기 때문이다. 조건이 늘어도 라우트는 늘지 않는다.
//
// 여기서 하는 일은 쿼리스트링(문자열)을 숫자로 옮기는 HTTP 변환뿐이다.
// 기본값·상한 같은 규칙은 pageService 가 갖는다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type {
  CategoryPageListBody,
  RecentPageListBody,
} from "@/lib/api/types";
import * as pageService from "@/lib/services/pageService";

/**
 * 쿼리 파라미터 → 숫자. 없거나 숫자가 아니면 undefined 로 넘겨
 * "기본값을 써라"는 뜻을 service 에 그대로 전달한다.
 */
function readNumber(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return undefined;

  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const category = params.get("category")?.trim();

    if (category) {
      const result = await pageService.listPagesByCategory(category, {
        page: readNumber(params, "page"),
        size: readNumber(params, "size"),
      });

      return NextResponse.json<CategoryPageListBody>({
        pages: result.items,
        total: result.total,
        page: result.page,
        size: result.size,
      });
    }

    const pages = await pageService.listRecentPages(readNumber(params, "limit"));

    return NextResponse.json<RecentPageListBody>({ pages });
  } catch (error) {
    return handleError(error);
  }
}
