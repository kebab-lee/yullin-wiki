// GET  /api/pages/[id]/comments — 한 게시물의 댓글 전부 (대댓글 포함)
// POST /api/pages/[id]/comments — 댓글 작성
//
// **게시물 id 가 경로에 있고 바디에는 없다.** 댓글은 게시물에 딸린 컬렉션이라
// 주소가 그 관계를 그대로 말하는 편이 낫고, 바디로 받으면 "경로의 글과 바디의
// 글이 다르면?"이라는 질문을 service 가 매번 걸러야 한다 — 넣을 자리가 아예
// 없으면 그 질문이 생기지 않는다 (`/api/users/me` 와 같은 규칙).
//
// GET 은 공개다. 비로그인 요청도 목록을 그대로 받는다 — 세션은 차단이 아니라
// "어느 댓글이 내 것인가"(isMine)를 계산하는 데만 쓰인다.
// POST 는 로그인이 필요하다. 세션이 없으면 service 가 UnauthorizedError 를
// 던지고 handleError 가 401 로 옮긴다.
//
// 여기서 하는 일은 HTTP 변환뿐이다. 검증·권한·익명 처리는 commentService 가 한다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { CommentCreatedBody, CommentListBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import * as commentService from "@/lib/services/commentService";

export async function GET(
  _request: Request,
  // Next 15 에서 동적 세그먼트는 Promise 로 온다.
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const comments = await commentService.listComments(await getSession(), id);

    return NextResponse.json<CommentListBody>({ comments });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 바디를 좁히지 않고 unknown 그대로 넘긴다. 여기서 `as` 로 모양을 단정하면
    // 검증 이전에 거짓말이 한 번 들어간다 (parseCommentForm 이 좁힌다).
    const body: unknown = await request.json().catch(() => null);

    const comment = await commentService.createComment(
      await getSession(),
      id,
      body,
    );

    // 201 + 만들어진 리소스. 화면은 이동하지 않고 이 한 줄을 목록에 얹는다.
    return NextResponse.json<CommentCreatedBody>({ comment }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
