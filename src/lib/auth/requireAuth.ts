// =============================================================
// 화면 접근 차단 — 로그인만 요구하는 페이지용 (마이페이지 등)
//
// requireRole 과 짝이지만 요구하는 것이 다르다.
//   requireRole(minRole) — EDITOR/ADMIN 처럼 "권한"이 필요한 화면. 미달이면 홈으로.
//   requireAuth (여기)   — 권한은 필요 없고 "누구인지"만 필요한 화면. 없으면 로그인으로.
//
// 마이페이지에 requireRole("USER") 을 쓰지 않는 이유는, 그 호출이 "USER 권한이
// 필요한 화면"이라고 읽히면서 실제 의도(로그인 여부)를 감추기 때문이다.
// 되돌려 보내는 곳도 달라야 한다 — 로그인하면 들어올 수 있는 화면이라 홈이 아니라
// /login 이 목적지다.
//
// **화면 차단일 뿐이다.** 데이터 차단은 service 의 assertAuthenticated 가 따로 한다.
// API 는 페이지를 거치지 않고 직접 호출된다 (CLAUDE.md "권한").
//
// layout 이 아니라 페이지에서 부른다 — 형제 라우트 간 클라이언트 사이드 이동에서
// layout 은 재실행되지 않아 가드가 건너뛰어진다.
// =============================================================

import { redirect } from "next/navigation";

import { getSession, type SessionPayload } from "./session";

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session) redirect("/login");

  return session;
}
