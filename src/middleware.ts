// =============================================================
// middleware — UX 편의 계층. 보안 경계가 아니다.
//
// 하는 일은 하나다: /admin/* 에 세션 쿠키 없이 들어오면 /login 으로 보낸다.
// 로그인도 안 한 사람에게 어드민 화면 껍데기를 먼저 그려주고 나서 막는 것보다
// 바로 로그인으로 보내는 편이 낫기 때문이고, 그게 전부다.
//
// **여기서 role 을 검사하지 않는다.** 쿠키가 "있는지"만 본다. 서명 검증도, ADMIN
// 여부 판정도 하지 않는다. 이유는 둘이다.
//   1. middleware 는 Next 전용이라 Java(Spring Boot) 이관 시 통째로 사라진다.
//      여기에 권한 규칙을 적으면 이식할 때 규칙이 증발한다.
//   2. 진짜 차단은 service 레이어의 assertAdmin 이 한다 (src/lib/auth/guards.ts).
//      같은 판정을 두 곳에 두면 한쪽만 고쳐질 때 조용히 어긋난다.
//
// 즉 이 파일을 통째로 지워도 보안 수준은 그대로여야 한다. 그러지 않다면
// service 쪽 가드가 빠진 것이다.
// =============================================================

import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/cookie";

export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
