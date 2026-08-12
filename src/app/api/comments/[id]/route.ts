// DELETE /api/comments/[id] — 댓글 삭제 (소프트 삭제)
//
// **`/api/pages/[id]/comments/[commentId]` 로 두지 않는다.** 댓글 id 는 그
// 자체로 유일하고, 게시물 id 를 경로에 더해도 "둘이 안 맞으면?"이라는 질문만
// 늘 뿐 얻는 것이 없다. 목록은 게시물에 딸린 컬렉션이라 그쪽 경로에 있고,
// 단건은 자기 주소를 갖는다.
//
// 지울 수 있는 사람은 작성자 본인과 ADMIN 이다. 그 판정과 근거는 전부
// commentService.deleteComment 에 있다 — 여기서는 HTTP 변환만 한다.
//
//   비로그인    → 401 (UnauthorizedError)
//   남의 댓글   → 403 (ForbiddenError)
//   없음·삭제됨 → 404 (NotFoundError)

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import { getSession } from "@/lib/auth/session";
import * as commentService from "@/lib/services/commentService";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await commentService.deleteComment(await getSession(), id);

    // 돌려줄 것이 없다. 화면은 성공을 알면 목록을 다시 그린다.
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
