// GET /api/pages/[id] — 게시물 한 건 (본문 포함)
//
// 목록 응답과 달리 여기서만 content(ProseMirror JSON)가 실린다.
//
// 임시저장·삭제된 게시물은 service 가 NotFoundError 를 던지고 handleError 가
// 404 로 옮긴다. "권한 없음(403)"이 아닌 이유는 비공개 게시물의 존재 자체를
// 상태 코드로 알려주지 않기 위해서다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { PageDetailBody } from "@/lib/api/types";
import * as pageService from "@/lib/services/pageService";

export async function GET(
  _request: Request,
  // Next 15 에서 동적 세그먼트는 Promise 로 온다.
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const page = await pageService.getPage(id);

    return NextResponse.json<PageDetailBody>({ page });
  } catch (error) {
    return handleError(error);
  }
}
