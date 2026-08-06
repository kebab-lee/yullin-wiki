// POST /api/admin/pages — 게시물 발행
//
// **첫 어드민 API 다.** 하는 일은 셋뿐이다: 세션을 읽고, service 에 넘기고,
// 결과를 JSON 으로 돌려준다.
//
// **여기서 role 을 검사하지 않는다.** 권한 판정은 pageService.createPage 의
// assertRole 이 전담한다 (CLAUDE.md "권한"). 라우트에도 같은 검사를 두면 규칙이
// 두 곳으로 갈리고, 그 사본은 Java 이관 시 사라질 Next 전용 레이어에 남는다.
// 여기서 세션 유무만 보는 것은 권한 판정이 아니라 "service 에 넘길 신원이
// 있는가"이며, 그 결과가 401 이라는 것도 assertRole 의 판정과 어긋나지 않는다.
//
// 경로가 /api/pages 가 아니라 /api/admin/pages 인 이유: 같은 컬렉션이라도
// 공개 조회와 어드민 쓰기는 접근 주체가 다르고, 그 경계가 URL 에 드러나야
// 나중에 Java 쪽에서 필터 체인을 경로 단위로 나눌 수 있다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { PageCreatedBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/errors";
import * as pageService from "@/lib/services/pageService";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    // 바디는 unknown 그대로 넘긴다. 모양을 좁히는 일은 validation 이 한다 —
    // 라우트에서 캐스팅하면 검증 이전에 거짓말이 한 번 들어간다.
    const body: unknown = await request.json().catch(() => null);
    const page = await pageService.createPage(session, body);

    return NextResponse.json<PageCreatedBody>({ id: page.id }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
