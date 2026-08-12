// GET /api/admin/reports?status=&page=&size= — 어드민 신고 관리 목록
//
// 사용자용 신고 접수(`POST /api/comments/[id]/reports`)와 경로가 갈려 있는 것이
// 의도다. 주체도 응답도 다르다 — 저쪽은 회원이 한 건을 접수하고 아무것도 돌려
// 받지 않지만, 이쪽은 관리자가 전체를 열람하고 실명·게시물까지 실려 나간다.
// 경로가 갈려 있어야 Java 쪽에서 두 동작에 서로 다른 권한 규칙을 걸 수 있다.
//
// 여기서 role 을 검사하지 않는 것은 형제 라우트와 같은 규칙이다 — 권한 판정은
// reportService.listReportsForAdmin 의 assertRole("ADMIN") 이 전담한다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { AdminReportListBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import * as reportService from "@/lib/services/reportService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 잘못된 값을 여기서 판정하지 않는다. 그대로 넘기면 service 가 안전한
    // 값으로 접고(모르는 status 는 "전체"), 실제로 적용한 값을 되돌려준다.
    const body = await reportService.listReportsForAdmin(await getSession(), {
      status: searchParams.get("status") ?? undefined,
      page: Number(searchParams.get("page")) || undefined,
      size: Number(searchParams.get("size")) || undefined,
    });

    return NextResponse.json<AdminReportListBody>({
      reports: body.items,
      total: body.total,
      page: body.page,
      size: body.size,
      status: body.status,
    });
  } catch (error) {
    return handleError(error);
  }
}
