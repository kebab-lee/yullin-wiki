// GET /api/admin/dashboard — 대시보드 카드 두 줄 (최근 댓글 · 미처리 신고)
//
// ── 왜 한 라우트인가 ────────────────────────────────────────
// 대시보드는 두 섹션을 **언제나 함께** 그린다. 라우트를 둘로 나누면 페이지가
// 왕복을 두 번 하고(Promise.all 로 묶어도 요청은 둘이다), 한쪽만 실패했을 때
// 화면이 반쪽으로 그려지는 상태를 페이지가 따로 다뤄야 한다.
//
// ── 왜 목록 라우트를 size=3 으로 재사용하지 않는가 ──────────
// 카드가 그리는 값이 목록과 다르다. 댓글 카드에는 **게시물의 댓글 수**가 있는데
// (Figma 1:2184 의 말풍선 배지) 관리 목록에는 그 칸이 없고, 반대로 카드는
// 익명을 가리지만 관리 목록은 실명을 그대로 싣는다(처리에 필요해서다). 목록
// 계약에 카드용 칸을 얹으면 20건짜리 응답이 매번 쓰지 않는 집계를 달고 다닌다.
//
// ── 권한이 두 섹션에서 갈린다 ───────────────────────────────
// 댓글은 EDITOR 부터, 신고는 ADMIN 만이다 (대시보드 자체는 EDITOR 부터 들어온다).
// 그래서 신고는 **ADMIN 일 때만 조회하고 아니면 빈 배열**로 답한다 — EDITOR 의
// 요청에 403 을 던지면 대시보드 전체가 실패한다. 이건 화면 편의가 아니라
// 계약이다: 두 섹션의 권한이 다르다는 사실이 응답 모양에 그대로 드러난다.
//
// 권한 판정 자체는 여기서 하지 않는다 — 각 service 의 assertRole 이 전담하고
// (commentService: EDITOR / reportService: ADMIN), 여기서는 "신고를 물어볼
// 것인가"만 role 로 가른다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { AdminDashboardBody } from "@/lib/api/types";
import { hasRole } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/errors";
import * as commentService from "@/lib/services/commentService";
import * as reportService from "@/lib/services/reportService";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const isAdmin = hasRole(session.role, "ADMIN");

    const [comments, reports] = await Promise.all([
      commentService.listRecentCommentsForDashboard(session),
      isAdmin
        ? reportService.listRecentReportsForDashboard(session)
        : Promise.resolve([]),
    ]);

    return NextResponse.json<AdminDashboardBody>({ comments, reports });
  } catch (error) {
    return handleError(error);
  }
}
