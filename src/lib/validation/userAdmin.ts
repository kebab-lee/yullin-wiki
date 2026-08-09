// =============================================================
// 어드민 사용자 관리의 파라미터·바디 좁히기
//
// 목록 필터(`?role=` · `?status=`)와 역할 변경 요청 바디가 밖에서 들어온
// unknown 을 도메인 값으로 좁히는 자리다. 라우트가 `as Role` 로 단정하지 않도록
// 좁히기를 검증 쪽에 모아 둔다 (validation/pageStatus 와 같은 규칙).
//
// user.ts 와 나눠 둔 이유: 저쪽은 **사용자 본인이 채우는 폼**(가입·회원정보·
// 비밀번호)의 규칙이고, 여기는 **관리자가 남을 상대로 보내는 요청**의 규칙이다.
// 한 파일에 섞으면 "이 규칙이 누구의 입력에 걸리는가"가 흐려진다.
//
// React·DOM 을 모른다. Java 이관 시 이 파일이 그대로 이식 단위가 된다.
// =============================================================

import { isRole, type Role } from "@/lib/auth/roles";
import { isUserStatus, type UserStatus } from "@/lib/types";

// ── 문구 ──────────────────────────────────────────────────────
export const ROLE_UNKNOWN = "⚠️ 알 수 없는 역할입니다.";
export const ROLE_SELF_CHANGE =
  "본인의 역할은 변경할 수 없습니다. 다른 관리자에게 요청해주세요.";
export const ROLE_WITHDRAWN_TARGET = "탈퇴한 계정의 역할은 변경할 수 없습니다.";
export const USER_NOT_FOUND = "사용자를 찾을 수 없습니다.";

// ── 목록 필터 ─────────────────────────────────────────────────
// 두 함수 모두 **ValidationError 로 던지지 않는다.** 사용자가 채운 입력 칸이
// 아니라 화면이 붙이는 파라미터라 틀렸을 때 문구를 붙일 자리가 없다. 모르는
// 값은 undefined = "전체" 로 접고, 서버가 실제로 적용한 값을 응답에 되돌려주어
// 화면의 필터 탭이 서버와 같은 것을 가리키게 한다
// (pageStatus.parseStatusFilter 와 같은 판단).

/** `?role=` 을 좁힌다. 없거나 모르는 값이면 undefined = 전체. */
export function parseRoleFilter(value: unknown): Role | undefined {
  return isRole(value) ? value : undefined;
}

/** `?status=` 를 좁힌다. 없거나 모르는 값이면 undefined = 전체. */
export function parseUserStatusFilter(value: unknown): UserStatus | undefined {
  return isUserStatus(value) ? value : undefined;
}

// ── 역할 변경 바디 ────────────────────────────────────────────
export type RoleChangeParseResult =
  | { readonly ok: true; readonly role: Role }
  | { readonly ok: false; readonly message: string };

/**
 * `PATCH /api/admin/users/[id]/role` 의 바디를 좁힌다.
 *
 * **세 역할을 모두 받는다.** 게시물 상태와 달리(CHANGEABLE_STATUSES 에서 DRAFT 가
 * 빠진다) 역할에는 갈 수 없는 목적지가 없다 — 승격도 강등도 같은 조작이고,
 * "누가 그것을 할 수 있는가"는 값이 아니라 권한의 문제라 service 의 assertRole 과
 * 자기 자신 금지 규칙이 답한다.
 */
export function parseRoleChange(body: unknown): RoleChangeParseResult {
  const source: Record<string, unknown> =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  return isRole(source.role)
    ? { ok: true, role: source.role }
    : { ok: false, message: ROLE_UNKNOWN };
}
