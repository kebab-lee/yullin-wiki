// =============================================================
// 사용자 목록 URL 조립
//
// 필터가 둘(역할 · 상태)이라 링크를 손으로 잇는 순간 조합이 틀린다 — 역할 탭이
// 상태를 떨어뜨리거나, `?` 를 두 번 붙이거나, 페이지 번호를 데리고 다닌다.
// 필터 탭·페이지네이션·두 화면이 전부 이 함수 하나를 쓴다.
// =============================================================

import type { Role, UserStatus } from "@/lib/types";

export type UserListFilters = {
  role: Role | null;
  status: UserStatus | null;
};

/**
 * 필터가 반영된 목록 경로. 값이 null 인 필터는 파라미터를 아예 붙이지 않는다 —
 * 같은 화면이 URL 두 개를 갖지 않게 하기 위해서다 (Pagination 의 1페이지 규칙,
 * AdminPageStatusFilter 의 전체 탭과 같은 규칙).
 *
 * **`page` 를 싣지 않는다.** 필터를 바꾸면 목록 자체가 달라져서 3페이지가 남아
 * 있으리라는 보장이 없고, 없는 페이지로 떨어지면 빈 화면이 뜬다. 페이지 번호는
 * Pagination 이 이 경로 뒤에 다시 붙인다(그쪽이 `?`/`&` 를 알아서 가른다).
 */
export function userListHref(
  basePath: string,
  { role, status }: UserListFilters,
): string {
  const query = new URLSearchParams();
  if (role) query.set("role", role);
  if (status) query.set("status", status);

  return query.size > 0 ? `${basePath}?${query.toString()}` : basePath;
}
