// POST /api/auth/logout — 로그아웃
//
// 세션은 서버에 저장하지 않는 JWT 라 "지울 상태"가 없다. 쿠키를 만료시키는 것이
// 로그아웃의 전부이고, 그건 순수한 HTTP 조작이라 service 를 거치지 않는다.
//
// GET 이 아니라 POST 인 이유: 링크 프리페치나 이미지 태그로 남을 로그아웃시킬 수
// 있으면 안 된다.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/cookie";

export async function POST() {
  // 심을 때와 같은 속성으로 덮어써야 브라우저가 같은 쿠키로 인식하고 지운다.
  (await cookies()).set(SESSION_COOKIE, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
