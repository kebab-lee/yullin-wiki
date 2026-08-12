// =============================================================
// 계정 상태와 인증의 관계
//
// "이 계정으로 로그인할 수 있는가"는 users.status 를 읽는 규칙이지만 사용자
// 도메인의 것이 아니라 **인증의 것**이다. 그래서 types/user.ts 가 아니라 여기
// 산다 (roles.ts 가 Role 의 서열을 소유하는 것과 같은 결).
//
// roles.ts 에 넣지 않은 이유는 import 방향이다 — types/user.ts 가 roles.ts 를
// 참조하므로 roles.ts 가 UserStatus 를 가져오면 순환이 생긴다. 이 파일은
// 아무도 참조하지 않는 잎이라 그 문제가 없다.
//
// Spring 이관 시 UserDetails 의 isAccountNonLocked / isEnabled 에 대응된다.
// =============================================================

import type { UserStatus } from "@/lib/types/user";

/**
 * 이 계정으로 로그인하고 세션을 유지할 수 있는가.
 *
 * ── 이 함수가 생긴 이유 (기존 동작을 바꾼다) ─────────────────
 * 원래는 로그인·세션 복원 경로 넷이 전부 `status !== "ACTIVE"` 로 튕겼다
 * (authService.login · authService.getCurrentUser · userService 의
 * loadActiveUser · loadActiveUserWithHash). 그 결과 **BLOCKED 는 사실상 계정
 * 잠금**이었다 — 차단된 사용자는 로그인조차 못 했다.
 *
 * 그런데 차단 확인 팝업(Figma 1:2516)이 관리자에게 약속하는 것은
 * "차단된 사용자는 **댓글 기능이** 제한됩니다" 다. 로그인 불가가 아니다.
 * 화면이 약속한 것과 시스템이 하는 일이 다르면 관리자는 무슨 일이 일어나는지
 * 모르는 채 버튼을 누르게 된다 — 그 어긋남 때문에 지난 슬라이스에서 차단
 * 버튼을 아예 만들지 않았다(AdminUserList 의 옛 주석). 이번에 차단을 실제
 * 기능으로 붙이면서 판정을 두 축으로 가른다:
 *
 *   · **로그인·세션 유지** — WITHDRAWN 만 막는다 (이 함수).
 *   · **댓글 작성**        — BLOCKED 를 막는다 (commentService.createComment).
 *
 * 차단된 사용자는 로그인해서 자기 정보를 보고 글을 읽을 수 있고 댓글만 쓸 수
 * 없다. 그것이 시안 문구가 말하는 상태다. 차단이 로그인을 막으면 사용자에게는
 * "아이디 또는 비밀번호가 올바르지 않습니다"(LOGIN_FAILED — 사유를 구분하지
 * 않는다)만 보여서, 무엇이 일어났는지 알 길도 문의할 근거도 없다.
 *
 * **WITHDRAWN 은 여전히 통과하지 못한다.** 탈퇴는 되돌릴 수 없는 종점이고
 * PII 가 이미 NULL 이라(userRepository.withdraw) 복원할 계정 자체가 없다.
 *
 * ── 왜 "ACTIVE 인가"가 아니라 "WITHDRAWN 이 아닌가"로 적는가 ──
 * 통과 조건을 열거하는 대신 종점 하나만 막는 모양이다. 나중에 상태가 늘어도
 * (예: 휴면) 그것이 곧바로 로그인 불가가 되지는 않는다 — 새 상태의 효과는 그
 * 상태를 도입하는 슬라이스가 명시적으로 정해야 하고 여기서 조용히 결정되면
 * 안 된다. 반대로 "로그인을 아예 막아야 하는 상태"는 되돌릴 수 없는 것뿐이라
 * 목록이 잘 늘지 않는다.
 */
export function canSignIn(status: UserStatus): boolean {
  return status !== "WITHDRAWN";
}

/**
 * 이 계정이 댓글을 쓸 수 있는가.
 *
 * canSignIn 과 **일부러 다른 함수다.** 둘을 하나로 합치면 "로그인은 되는데
 * 댓글은 안 되는" 상태를 표현할 수 없고, 그게 정확히 차단이 뜻하는 바다.
 *
 * 판정 자체는 commentService 한 곳에서만 쓰이지만 규칙을 그쪽에 인라인으로
 * 적지 않는다 — 차단의 효과가 무엇인지는 계정 상태의 규칙이고, 위 canSignIn 과
 * 나란히 놓여 있어야 "차단은 무엇을 막는가"가 한눈에 읽힌다.
 */
export function canWriteComment(status: UserStatus): boolean {
  return status === "ACTIVE";
}
