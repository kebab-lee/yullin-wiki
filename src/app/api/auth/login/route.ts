// POST /api/auth/login — 로그인
//
// service 가 돌려준 토큰을 쿠키에 심는 것까지가 HTTP 변환이다.
// 자격 증명 판정·실패 문구는 전부 authService 안에 있다.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import { asStringMap } from "@/lib/api/parseBody";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/cookie";
import * as authService from "@/lib/services/authService";

const LOGIN_FIELDS = ["loginId", "password"] as const;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const { loginId, password } = asStringMap(body, LOGIN_FIELDS);

    const { user, token } = await authService.login(loginId, password);

    (await cookies()).set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

    // 토큰은 바디에 싣지 않는다. httpOnly 쿠키로만 오가야 JS 가 못 만진다.
    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}
