// =============================================================
// 권한 가드
//
// **이 파일이 Spring Security 로 이식될 자리다.** 지금은 함수 호출이지만
// 옮길 때 @PreAuthorize / SecurityFilterChain 규칙으로 1:1 대응된다.
//
// service 레이어에서만 호출한다. middleware 나 컴포넌트에서 권한을 판정하면
// 규칙이 두 곳으로 갈리고, Next 전용 레이어인 middleware 는 이관 시 사라진다.
// =============================================================

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

import type { SessionPayload } from "./session";

/** 로그인했는가. 통과하면 이후 코드에서 session 이 non-null 로 좁혀진다. */
export function assertAuthenticated(
  session: SessionPayload | null,
): asserts session is SessionPayload {
  if (!session) throw new UnauthorizedError();
}

/**
 * 관리자인가.
 *
 * 비로그인은 401, 로그인했지만 USER 면 403 으로 갈린다 — "로그인하면 되는가"와
 * "로그인해도 안 되는가"는 호출부가 다르게 처리해야 할 상황이다.
 */
export function assertAdmin(
  session: SessionPayload | null,
): asserts session is SessionPayload {
  assertAuthenticated(session);

  if (session.role !== "ADMIN") throw new ForbiddenError();
}
