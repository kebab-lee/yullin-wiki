// PATCH  /api/admin/pages/[id] — 게시물 수정
// DELETE /api/admin/pages/[id] — 게시물 삭제 (soft delete)
//
// **여기서 role 을 검사하지 않는다.** 권한 판정은 pageService 의 assertRole 이
// 전담한다 (CLAUDE.md "권한"). 세션 유무만 보는 것은 권한 판정이 아니라
// "service 에 넘길 신원이 있는가"이며, POST /api/admin/pages 와 같은 규칙이다.
//
// **소유권도 보지 않는다.** 작성자 대조는 service 에도 여기에도 없다 — 위키는
// 공동 편집이 전제라 EDITOR 이상이면 남의 글도 고치고 지운다. 대신 service 가
// 변경 직전 상태를 page_revisions 에 남긴다.
//
// 경로가 /api/pages/[id] 가 아니라 /api/admin/pages/[id] 인 이유도 POST 와 같다:
// 같은 리소스라도 공개 조회와 어드민 쓰기는 접근 주체가 다르고, 그 경계가 URL 에
// 드러나야 Java 쪽에서 필터 체인을 경로 단위로 나눌 수 있다.

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { PageUpdatedBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/errors";
import * as pageService from "@/lib/services/pageService";

/**
 * 바뀐 내용이 화면에 곧 보이도록 캐시를 턴다.
 *
 * 게시물 하나를 고치면 상세(/pages/[id])뿐 아니라 홈의 최근 목록과 항목별
 * 목록에 실린 제목·미리보기까지 낡는다. 그 경로들을 일일이 적으면(카테고리
 * slug 는 여기서 알지도 못한다) 화면이 하나 늘 때마다 빠뜨린다. 루트 layout
 * 단위로 한 번에 턴다 — 이 규모에서는 정확한 목록을 유지하는 비용이 더 크다.
 *
 * **Next 전용 관심사라 route handler(Next 레이어)에 둔다.** service 에 넣으면
 * Java 이관 시 함께 옮겨질 수 없는 코드가 도메인 로직에 섞인다.
 */
function revalidatePages(): void {
  revalidatePath("/", "layout");
}

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

    const page = await pageService.updatePage(session, id, body);
    revalidatePages();

    return NextResponse.json<PageUpdatedBody>({ id: page.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const { id } = await params;

    await pageService.deletePage(session, id);
    revalidatePages();

    // 204. 돌려줄 것이 없다 — 클라이언트가 성공 후에 하는 일은 홈으로 나가는
    // 것뿐이고, 지워진 게시물의 내용을 응답에 실을 이유는 더더욱 없다.
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
