// POST /api/comments/[id]/reports — 댓글 신고 접수
//
// **경로가 댓글에 딸려 있다.** 신고는 댓글에 대한 컬렉션이라 주소가 그 관계를
// 그대로 말하는 편이 낫고, 대상 id 를 바디로 받으면 "경로의 댓글과 바디의
// 댓글이 다르면?"이라는 질문을 service 가 매번 걸러야 한다 — 넣을 자리가 아예
// 없으면 그 질문이 생기지 않는다 (`/api/pages/[id]/comments` 와 같은 규칙).
//
// **GET 이 없다.** 이 컬렉션은 읽을 수 있는 대상이 아니다 — 어느 댓글이 몇 번
// 신고됐는지가 공개되면 신고 사실이 신고자 외에게 새어나가고, 그걸 막는 것이
// 이 기능의 전제다. 관리자용 조회는 `/api/admin/reports` 로 따로 있다.
//
// 신고자 id 는 세션에서 온다. 바디에 받을 자리가 없다(parseReportReason 이
// reason 하나만 좁힌다) — 받으면 남의 이름으로 신고할 수 있다.
//
//   비로그인          → 401 (UnauthorizedError)
//   자기 댓글         → 403 (ForbiddenError)
//   없음·삭제된 댓글  → 404 (NotFoundError)
//   중복 신고         → 409 (ConflictError)
//
// 여기서 하는 일은 HTTP 변환뿐이다. 검증·권한은 reportService 가 한다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import { getSession } from "@/lib/auth/session";
import * as reportService from "@/lib/services/reportService";

export async function POST(
  request: Request,
  // Next 15 에서 동적 세그먼트는 Promise 로 온다.
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 바디를 좁히지 않고 unknown 그대로 넘긴다. 여기서 `as` 로 모양을 단정하면
    // 검증 이전에 거짓말이 한 번 들어간다 (parseReportReason 이 좁힌다).
    const body: unknown = await request.json().catch(() => null);

    await reportService.createReport(await getSession(), id, body);

    // 돌려줄 것이 없다. 화면은 "신고가 접수되었습니다"(Figma 1:1255)만 띄운다 —
    // 신고 내역을 응답에 실으면 그것으로 남의 신고 상태를 들여다볼 수 있다.
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
