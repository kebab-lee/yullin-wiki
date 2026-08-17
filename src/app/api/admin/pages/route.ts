// GET  /api/admin/pages?status=&page=&size= — 어드민 위키 관리 목록
// POST /api/admin/pages                     — 게시물 발행
//
// 두 메서드가 한 파일인 것은 같은 컬렉션(어드민이 보는 pages)이기 때문이다.
// 공개 조회(/api/pages)와 경로가 갈린 근거는 아래 POST 주석 그대로다 — 이쪽은
// 세션 없이 부를 수 없고, DRAFT·HIDDEN 까지 실려 나간다.
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

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { AdminPageListBody, PageCreatedBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/errors";
import * as pageService from "@/lib/services/pageService";

/**
 * 쿼리 파라미터 → 숫자. 없거나 숫자가 아니면 undefined 로 넘겨 "기본값을 써라"는
 * 뜻을 service 에 그대로 전달한다 (/api/pages 의 같은 함수와 동일한 규칙).
 */
function readNumber(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return undefined;

  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const params = new URL(request.url).searchParams;

    // status 를 여기서 판정하지 않는다. 문자열을 그대로 넘기면 service 가
    // 좁히고(parseStatusFilter), 실제로 적용된 값을 응답에 되돌려준다 —
    // 라우트가 미리 거르면 같은 규칙이 두 곳에 생긴다.
    const result = await pageService.listPagesForAdmin(session, {
      status: params.get("status") ?? undefined,
      page: readNumber(params, "page"),
      size: readNumber(params, "size"),
    });

    return NextResponse.json<AdminPageListBody>({
      pages: result.items,
      total: result.total,
      page: result.page,
      size: result.size,
      status: result.status,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    // 바디는 unknown 그대로 넘긴다. 모양을 좁히는 일은 validation 이 한다 —
    // 라우트에서 캐스팅하면 검증 이전에 거짓말이 한 번 들어간다.
    const body: unknown = await request.json().catch(() => null);
    const page = await pageService.createPage(session, body);

    // 새 글이 PUBLISHED 로 만들어졌으면 그 즉시 홈의 최근 목록·항목별 목록·
    // 검색에 나타나야 한다. 형제 라우트(PATCH·DELETE, /status)와 같은 이유로
    // 루트 layout 단위로 한 번에 턴다.
    //
    // **DRAFT 일 때는 털지 않는다.** 초안은 공개 화면 어디에도 실리지 않으므로
    // 털어 봐야 바뀌는 화면이 없고, 에디터의 임시저장은 글 하나를 쓰는 동안
    // 여러 번 POST 된다 — 그때마다 사이트 전체 캐시를 버리면 이 라우트가
    // 캐시를 무의미하게 만드는 쪽이 된다.
    if (page.status === "PUBLISHED") revalidatePath("/", "layout");

    return NextResponse.json<PageCreatedBody>({ id: page.id }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
