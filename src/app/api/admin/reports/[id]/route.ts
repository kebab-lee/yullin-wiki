// PATCH /api/admin/reports/[id] — 신고 처리 (댓글 삭제 · 무시)
//
// **PATCH 이지 DELETE 가 아니다.** 신고 행은 지워지지 않는다 — status 를 종결
// 값으로 옮기고 handled_by/handled_at 을 남기는 상태 전환이다. 처리 이력이
// 사라지면 같은 댓글이 다시 신고됐을 때 이전 판단을 볼 재료가 없다
// (`PATCH /api/admin/pages/[id]/status` 와 같은 결).
//
// **차단은 이 라우트가 아니다.** 신고 처리 화면의 세 번째 버튼(사용자 차단)은
// `PATCH /api/admin/users/[id]/status` 로 간다 — 신고를 종결시키는 조작이
// 아니고, 사용자 관리 화면의 차단 버튼과 같은 규칙을 써야 하기 때문이다.
//
// 응답 바디가 없다(204). 목록의 정본은 서버이고, 화면은 성공을 알면
// router.refresh() 로 다시 그린다 — 이 줄만 갱신하면 상태 필터가 걸린 목록에서
// 방금 처리한 신고가 조건에 안 맞는데도 자리에 남고 전체 건수도 어긋난다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import { getSession } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import * as reportService from "@/lib/services/reportService";
import { parseReportAction } from "@/lib/validation/report";

export async function PATCH(
  request: Request,
  // Next 15 에서 동적 세그먼트는 Promise 로 온다.
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);

    // 바디를 좁히는 일은 검증 모듈이 한다. 라우트가 `as ReportAction` 으로
    // 단정하면 검증 이전에 거짓말이 한 번 들어간다.
    const parsed = parseReportAction(body);
    if (!parsed.ok) throw new ValidationError({ action: parsed.message });

    await reportService.resolveReport(await getSession(), id, parsed.action);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
