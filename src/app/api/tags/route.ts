// GET /api/tags — 전체 태그 + 각 태그의 공개 문서 수
//
// **`GET /api/pages` 에 얹지 않고 라우트를 따로 둔다.** 저쪽은 게시물 컬렉션이고
// 이쪽은 태그 컬렉션이라, 조건이 다른 같은 목록이 아니라 다른 목록이다.
// (반대로 "태그로 좁힌 게시물 목록"은 같은 컬렉션이라 `GET /api/pages?tag=` 다.)
//
// 파라미터가 없다. 정렬(문서 수 내림차순 → 이름순)도 고아 태그를 빼는 규칙도
// 화면이 고르는 것이 아니라 tagService 가 정한 하나뿐이라, 쿼리스트링으로 열어
// 두면 서버가 답을 두 벌 갖게 된다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { TagListBody } from "@/lib/api/types";
import * as tagService from "@/lib/services/tagService";

export async function GET() {
  try {
    const tags = await tagService.listTags();

    return NextResponse.json<TagListBody>({ tags });
  } catch (error) {
    return handleError(error);
  }
}
