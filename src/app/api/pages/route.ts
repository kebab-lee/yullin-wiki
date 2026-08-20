// GET /api/pages — 공개 게시물 목록
//
//   ?limit=                     최근 게시물 (홈)
//   ?page=&size=                전체 목록 (/pages)
//   ?category=slug&page=&size=  항목별 목록 (/categories/[slug])
//   ?tag=이름&page=&size=        태그별 목록 (/tags/[name])
//
// 네 갈래가 한 라우트에 있는 이유는 넷 다 "공개 게시물 목록"이라는 같은
// 컬렉션이고 조건만 다르기 때문이다. 조건이 늘어도 라우트는 늘지 않는다.
//
// **태그를 검색(`/api/pages/search`)에 얹지 않은 것이 이 배치의 핵심이다.**
// 검색이 라우트를 따로 갖는 근거는 "최신순 컬렉션 vs 유사도 순위"라는 의미
// 차이였는데, 태그는 정확 일치라 순위를 매길 근거가 없다 — 정렬도 응답 계약
// (PagedPageListBody)도 `category` 갈래와 완전히 같아서, 여기 얹는 것이 아니라
// 저기 얹는 쪽이 이질적이다. 검색 RPC 에 태그 파라미터를 더하면 "본문에 그
// 단어가 있는 문서"까지 딸려 와서 태그 목록의 목적 자체가 어긋난다.
//
// **`tag` 와 `category` 를 동시에 받지 않는다.** 화면이 만들지 않는 조합이고
// (태그 화면에는 항목 필터가 없다), 지금 열어 두면 두 조건의 조합마다 질의가
// 하나씩 늘어난다. 둘 다 오면 tag 가 이긴다 — 400 으로 막지 않는 것은 없는
// 조합을 에러로 **정의**해 버리면 나중에 지원할 때 계약이 바뀌기 때문이다.
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

    // 좁히는 조건을 순서대로 본다. 어느 것도 없으면 전체 목록이다.
    // (빈 문자열 `?tag=` 는 "조건 없음"이다 — 화면이 파라미터를 붙였다 지운
    //  상태이지 "이름이 빈 태그"를 찾는 것이 아니다.)
    const tag = params.get("tag")?.trim();
    const category = params.get("category")?.trim();

    const result = tag
      ? await pageService.listPagesByTag(tag, pagination)
      : category
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
