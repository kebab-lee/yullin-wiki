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

import { hasRole, type Role } from "./roles";
import type { SessionPayload } from "./session";

/** 로그인했는가. 통과하면 이후 코드에서 session 이 non-null 로 좁혀진다. */
export function assertAuthenticated(
  session: SessionPayload | null,
): asserts session is SessionPayload {
  if (!session) throw new UnauthorizedError();
}

/**
 * `minRole` 이상의 권한인가.
 *
 * 비로그인은 401, 로그인했지만 권한이 모자라면 403 으로 갈린다 —
 * "로그인하면 되는가"와 "로그인해도 안 되는가"는 호출부가 다르게 처리해야 할
 * 상황이다.
 *
 * 판정은 ROLE_LEVEL 비교(hasRole)로 한다. 문자열 일치로 적으면 상위 역할이
 * 하위 권한을 못 쓰게 되고, 역할이 늘 때마다 조건절을 전부 찾아 고쳐야 한다.
 */
export function assertRole(
  session: SessionPayload | null,
  minRole: Role,
): asserts session is SessionPayload {
  assertAuthenticated(session);

  if (!hasRole(session.role, minRole)) throw new ForbiddenError();
}

/** `assertRole(session, "ADMIN")` 의 별칭. 호출부에서 의도가 더 짧게 읽힌다. */
export function assertAdmin(
  session: SessionPayload | null,
): asserts session is SessionPayload {
  assertRole(session, "ADMIN");
}
