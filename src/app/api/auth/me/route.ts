// GET /api/auth/me — 현재 로그인한 사용자
//
// 세션 해석과 DB 재조회는 authService 가 한다. 세션이 없으면 service 가
// UnauthorizedError 를 던지고 handleError 가 401 로 옮긴다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import * as authService from "@/lib/services/authService";

export async function GET() {
  try {
    const user = await authService.getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}
