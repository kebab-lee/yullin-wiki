// =============================================================
// 화면 접근 차단 — /admin 하위 페이지용
//
// **service 의 assertAdmin 을 대체하지 않는다.** 둘은 막는 대상이 다르다.
//   requireAdmin (여기) — 화면. 서버 컴포넌트 진입부에서 렌더 자체를 막는다.
//   assertAdmin (guards.ts) — 데이터. API 는 페이지를 거치지 않고 직접 호출되므로
//                             service 에서 따로 막아야 한다.
// 하나로 합치려 들면 반드시 한쪽이 뚫린다.
//
// middleware 가 아니라 페이지에서 하는 이유는 두 가지다.
//   1. middleware 는 Next 전용이라 Java 이전 시 사라진다. 여기는 컨트롤러 진입부
//      (@PreAuthorize)에 그대로 대응된다.
//   2. layout 에 두면 안 된다 — 같은 layout 을 공유하는 형제 라우트 사이를
//      클라이언트 사이드로 이동할 때 layout 은 다시 실행되지 않는다.
//      페이지마다 부르는 편이 번거로워도 새는 구멍이 없다.
// =============================================================

import { redirect } from "next/navigation";

import { getSession, type SessionPayload } from "./session";

/**
 * 관리자만 통과시킨다. 아니면 홈으로 돌려보낸다.
 *
 * 401/403 을 던지지 않고 redirect 하는 이유: 여기는 API 가 아니라 화면이고,
 * 사용자에게 보여줄 것은 에러 코드가 아니라 갈 수 있는 페이지다.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") redirect("/");

  return session;
}
