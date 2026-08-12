// GET /api/users/me/comments — 마이페이지 "내 댓글 모아보기"
//
// **경로에 userId 가 없다.** 대상은 언제나 세션의 주인이다 — 넣을 자리가
// 없으면 남의 id 를 넣을 수도 없다 (`/api/users/me` 와 같은 규칙).
//
// 건수는 service 가 정한다(화면이 다섯 줄짜리다). 쿼리로 열어 두지 않는 것은
// 넘겨 볼 "내 댓글 전체" 화면이 아직 없어서다 — 파라미터부터 만들면 아무도
// 안 쓰는 계약이 먼저 굳는다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { MyCommentListBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import * as commentService from "@/lib/services/commentService";

export async function GET() {
  try {
    const comments = await commentService.listMyComments(await getSession());
    return NextResponse.json<MyCommentListBody>({ comments });
  } catch (error) {
    return handleError(error);
  }
}
