// GET /api/pages — 공개 게시물 목록
//
//   ?limit=                     최근 게시물 (홈)
//   ?page=&size=                전체 목록 (/pages)
//   ?category=slug&page=&size=  항목별 목록 (/categories/[slug])
//
// 세 갈래가 한 라우트에 있는 이유는 셋 다 "공개 게시물 목록"이라는 같은
// 컬렉션이고 조건만 다르기 때문이다. 조건이 늘어도 라우트는 늘지 않는다.
//
// **갈림길의 기준은 `limit` 의 유무다.** limit 이 붙은 요청만 페이지네이션이
// 없는 "최근 N건"이고(홈 카드), 나머지는 전부 페이지네이션 목록이다. `page` 의
// 유무로 가르지 않는 것은 1페이지 요청이 `?page` 를 생략하기 때문이다 — 그러면
// 첫 페이지만 다른 갈래로 떨어져 total 이 빠지고 페이지네이션이 사라진다.
//
// 여기서 하는 일은 쿼리스트링(문자열)을 숫자로 옮기는 HTTP 변환뿐이다.
// 기본값·상한 같은 규칙은 pageService 가 갖는다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type {
  PagedPageListBody,
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
    const limit = readNumber(params, "limit");

    if (limit !== undefined) {
      const pages = await pageService.listRecentPages(limit);
      return NextResponse.json<RecentPageListBody>({ pages });
    }

    const pagination = {
      page: readNumber(params, "page"),
      size: readNumber(params, "size"),
    };

    const category = params.get("category")?.trim();
    const result = category
      ? await pageService.listPagesByCategory(category, pagination)
      : await pageService.listPages(pagination);

    return NextResponse.json<PagedPageListBody>({
      pages: result.items,
      total: result.total,
      page: result.page,
      size: result.size,
    });
  } catch (error) {
    return handleError(error);
  }
}
