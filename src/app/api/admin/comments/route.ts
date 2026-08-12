// GET /api/admin/comments?page=&size= — 어드민 최근 댓글 목록
//
// **`/api/pages/[id]/comments` 와 다른 컬렉션이다.** 저쪽은 한 게시물에 딸린
// 댓글이라 게시물 경로 아래 있고 페이지네이션이 없다(대화를 통째로 읽는다).
// 여기는 전체 댓글을 최신순으로 넘겨 보는 관리 목록이라 어느 게시물에도 딸려
// 있지 않고, 응답에 게시물 제목이 함께 실린다.
//
// 상태 필터가 없다. 관리 목록은 지워진 댓글도 함께 보여주는 것이 규칙이고
// (commentRepository.findForAdmin 주석), 걸러 볼 이유가 아직 화면에 없다.
//
// 여기서 role 을 검사하지 않는 것은 형제 라우트와 같은 규칙이다 — 권한 판정은
// commentService.listCommentsForAdmin 의 assertRole("EDITOR") 이 전담한다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { AdminCommentListBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import * as commentService from "@/lib/services/commentService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const body = await commentService.listCommentsForAdmin(await getSession(), {
      page: Number(searchParams.get("page")) || undefined,
      size: Number(searchParams.get("size")) || undefined,
    });

    return NextResponse.json<AdminCommentListBody>({
      comments: body.items,
      total: body.total,
      page: body.page,
      size: body.size,
    });
  } catch (error) {
    return handleError(error);
  }
}
