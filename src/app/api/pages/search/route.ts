// GET /api/pages/search?q=&category=&page=&size= — 게시물 검색
//
// `category` 는 선택이다. 없으면 전체 검색이고, 있으면 그 항목 안에서의 검색이다.
// 검색어와 항목은 서로를 지우지 않는 두 조건이라 한쪽만 있어도 성립한다
// (항목만 있는 목록은 이 라우트가 아니라 `GET /api/pages?category=` 다 —
// 그쪽은 유사도 순위가 아니라 최신순 컬렉션이다).
//
// **목록(GET /api/pages)에 `q` 를 얹지 않고 라우트를 따로 둔다.** 두 응답은
// 모양만 비슷하고 의미가 다르다 — 목록은 최신순으로 자른 컬렉션이고, 검색은
// 검색어와의 유사도로 매긴 순위다. 한 핸들러에 얹으면 `limit`(홈) · `category`
// (항목별) 위에 `q` 분기가 하나 더 쌓이고, Java 이관 시 컨트롤러 메서드 하나가
// 네 가지 조회를 겸하게 된다.
//
// 검색어가 짧거나 비어 있으면 400 이다(pageService.searchPages). 여기서 미리
// 걸러 빈 목록으로 답하지 않는다 — "검색할 수 없는 질의"와 "결과가 없는 질의"를
// 구분하는 것은 업무 규칙이라 service 가 갖는다.
//
// 여기서 하는 일은 쿼리스트링(문자열)을 service 인자로 옮기는 HTTP 변환뿐이다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { PageSearchListBody } from "@/lib/api/types";
import * as pageService from "@/lib/services/pageService";

/**
 * 쿼리 파라미터 → 숫자. 없거나 숫자가 아니면 undefined 로 넘겨
 * "기본값을 써라"는 뜻을 service 에 그대로 전달한다.
 * (GET /api/pages 와 같은 변환이지만 라우트 사이에 공유할 만큼 크지 않다)
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

    const result = await pageService.searchPages(
      params.get("q") ?? "",
      {
        page: readNumber(params, "page"),
        size: readNumber(params, "size"),
      },
      // 빈 문자열(`?category=`)도 "없음"으로 넘긴다. 비었는지 판정하는 규칙은
      // service 가 갖고 있으므로 여기서는 문자열을 그대로 옮기기만 한다.
      params.get("category") ?? undefined,
    );

    return NextResponse.json<PageSearchListBody>({
      pages: result.items,
      total: result.total,
      page: result.page,
      size: result.size,
      query: result.query,
      category: result.category,
    });
  } catch (error) {
    return handleError(error);
  }
}
