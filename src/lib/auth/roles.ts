// =============================================================
// 역할 계층
//
// Spring 이전 시 주의: @PreAuthorize("hasRole('EDITOR')")는 계층을 자동 포함하지 않는다.
// RoleHierarchy 빈으로 ADMIN > EDITOR > USER 를 선언해야 동작이 같아진다.
//
// users.role 에 저장되는 값의 정본이 여기다. 값과 서열을 한 객체(ROLE_LEVEL)에
// 같이 두는 이유는, 역할을 추가할 때 고쳐야 할 곳을 한 군데로 묶기 위해서다.
// 타입·목록·판정이 전부 이 객체에서 파생된다.
//
// 화면에서 쓰는 "로그인 안 한 방문자(GUEST)"는 DB 값이 아니므로 여기 없다.
// 그쪽은 `ViewerRole` (types/auth.ts) 이다.
// =============================================================

/**
 * 역할의 서열. 숫자가 클수록 넓은 권한이며, 상위는 하위를 포함한다.
 *
 * 숫자 자체는 저장되지 않는다. DB 에는 키(USER/EDITOR/ADMIN)만 들어간다.
 */
export const ROLE_LEVEL = { USER: 0, EDITOR: 1, ADMIN: 2 } as const;

export type Role = keyof typeof ROLE_LEVEL;

export const ROLES: readonly Role[] = ["USER", "EDITOR", "ADMIN"];

/**
 * `role` 이 `min` 이상의 권한인가.
 *
 * 권한 판정은 전부 이 함수를 거친다. `role === 'ADMIN'` 같은 문자열 일치 비교를
 * 하면 역할이 하나 늘 때마다 조건이 조용히 틀려진다 (EDITOR 가 관리 화면에서
 * 튕기는 식으로).
 */
export function hasRole(role: Role, min: Role): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[min];
}

/**
 * 임의의 값이 Role 인가.
 *
 * JWT payload 처럼 밖에서 들어온 unknown 을 좁힐 때 쓴다 — 서명이 유효해도
 * 안에 든 role 값까지 믿지는 않는다.
 */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
