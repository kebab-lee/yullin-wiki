// PATCH /api/admin/pages/[id]/status — 게시물 상태 전환 (발행 · 숨김 · 숨김 해제)
//
// **본문 수정(PATCH /api/admin/pages/[id])에 status 를 끼워 넣지 않는다.** 모양이
// 비슷해 보여도 두 요청은 성격이 다르다:
//   · 검증 대상이 다르다 — 저쪽은 제목·본문·태그의 형식, 이쪽은 "지금 상태에서
//     그 상태로 갈 수 있는가"라는 전환 규칙이다.
//   · 남기는 것이 다르다 — 저쪽은 page_revisions 에 직전 본문을 남기고,
//     이쪽은 본문을 건드리지 않아 남길 것이 없다.
//   · 부르는 화면이 다르다 — 저쪽은 에디터, 이쪽은 목록의 버튼 하나다. 합치면
//     상태만 바꾸려는 화면이 본문·태그를 전부 실어 보내야 한다.
// 경로가 갈려 있어야 Java 쪽에서도 두 동작에 서로 다른 권한·감사 규칙을 걸 수
// 있다.
//
// 여기서 role 을 검사하지 않는 것은 형제 라우트와 같은 규칙이다 — 권한 판정은
// pageService.changePageStatus 의 assertRole 이 전담한다 (CLAUDE.md "권한").
// 세션 유무만 보는 것은 "service 에 넘길 신원이 있는가"이지 권한 판정이 아니다.

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { PageStatusChangedBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/errors";
import * as pageService from "@/lib/services/pageService";

export async function PATCH(
  request: Request,
  // Next 15 에서 동적 세그먼트는 Promise 로 온다.
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const { id } = await params;
    // 바디는 unknown 그대로 넘긴다. 모양을 좁히는 일은 validation 이 한다.
    const body: unknown = await request.json().catch(() => null);

    const page = await pageService.changePageStatus(session, id, body);

    // 상태가 바뀌면 그 글이 공개 목록·검색·상세에서 나타나거나 사라진다.
    // 형제 라우트와 같은 이유로 루트 layout 단위로 한 번에 턴다.
    revalidatePath("/", "layout");

    return NextResponse.json<PageStatusChangedBody>({
      id: page.id,
      status: page.status,
    });
  } catch (error) {
    return handleError(error);
  }
}
