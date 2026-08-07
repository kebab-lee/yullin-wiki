// =============================================================
// 사용자 서비스 — 사용자 자체에 대한 규칙
//
// 라우트 경로가 아니라 도메인으로 나눈 경계다 (CLAUDE.md "레이어 규칙").
// "아이디를 쓸 수 있는가"는 가입 화면에서 부르든 회원정보 수정에서 부르든
// 같은 규칙이므로, 인증 플로우가 아니라 사용자 도메인에 속한다.
//
// authService.signup 도 이 규칙을 여기서 빌려 쓴다 — 같은 판정을 두 곳에
// 적으면 한쪽만 고쳐질 때 가입과 중복확인 버튼의 답이 갈린다.
// =============================================================

import { assertAuthenticated } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { SessionPayload } from "@/lib/auth/session";
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import * as userRepository from "@/lib/repositories/userRepository";
import type { UserWithHash } from "@/lib/repositories/userRepository";
import type { User } from "@/lib/types";
import {
  CURRENT_PASSWORD_INVALID,
  LOGIN_ID_TAKEN,
  PASSWORD_UNCHANGED,
  WITHDRAW_LOGIN_ID_MISMATCH,
  parseProfile,
  validateLoginId,
  validatePasswordChange,
  type PasswordChangeInput,
  type ProfileInput,
} from "@/lib/validation/user";

/**
 * 아이디를 쓸 수 있는가.
 *
 * 형식이 틀린 아이디는 "사용 불가"가 아니라 검증 실패다 — 그래야 중복확인
 * 버튼이 형식과 중복을 같은 규칙으로 판정한다.
 *
 * 탈퇴(WITHDRAWN) 계정도 login_id 를 그대로 들고 있으므로 repository 가
 * status 로 거르지 않는다. 거르면 "사용 가능"이라 답한 아이디가 insert 에서 터진다.
 */
export async function isLoginIdAvailable(loginId: string): Promise<boolean> {
  const result = validateLoginId(loginId);
  if (!result.valid) throw new ValidationError({ loginId: result.message });

  return !(await userRepository.existsByLoginId(loginId));
}

/**
 * 쓸 수 없는 아이디면 던진다. 조회가 아니라 "진행해도 되는가"를 묻는 쪽이 쓴다.
 *
 * 판정 자체는 위 함수 하나뿐이고 여기서는 실패를 도메인 에러로 옮기기만 한다.
 */
export async function assertLoginIdAvailable(loginId: string): Promise<void> {
  if (!(await isLoginIdAvailable(loginId))) {
    throw new ConflictError({ loginId: LOGIN_ID_TAKEN });
  }
}

// ── 내 정보 ───────────────────────────────────────────────────
// 이 아래 함수들은 전부 **세션 주인의 정보만** 다룬다. id 를 파라미터로 받는
// 함수가 하나도 없는 것이 그 장치다 — 받는 순간 남의 id 를 넣어보는 경로가 열리고,
// 그때부터는 "호출부가 세션 id 를 넣었는가"에 매번 의존하게 된다.
// 다른 사용자 조회가 필요해지면 그건 관리자 기능이며 별도 함수여야 한다.

/**
 * 세션의 사용자를 DB 에서 꺼낸다. ACTIVE 가 아니면 로그인하지 않은 것과 같다.
 *
 * 토큰이 7일 살아 있어서, 그 사이 차단·탈퇴된 계정이 발급 시점의 상태로
 * 계속 통과하면 안 된다 (authService.getCurrentUser 와 같은 이유).
 */
async function loadActiveUser(session: SessionPayload): Promise<User> {
  const user = await userRepository.findById(session.userId);
  if (!user || user.status !== "ACTIVE") throw new UnauthorizedError();

  return user;
}

/** 위와 같되 해시까지 가져온다. 비밀번호 대조가 필요한 경로 전용. */
async function loadActiveUserWithHash(
  session: SessionPayload,
): Promise<UserWithHash> {
  const user = await userRepository.findByIdWithHash(session.userId);
  if (!user || user.status !== "ACTIVE") throw new UnauthorizedError();

  return user;
}

/** 마이페이지가 그릴 내 정보. */
export async function getMyProfile(
  session: SessionPayload | null,
): Promise<User> {
  assertAuthenticated(session);

  return loadActiveUser(session);
}

/**
 * 내 회원정보를 고친다.
 *
 * 검증은 회원가입과 **같은 규칙**(parseProfile)이다. 두 벌로 짜지 않는다.
 *
 * repository 로 넘기는 값이 parseProfile 이 돌려준 필드로만 조립된다는 점이
 * 중요하다. 요청 바디에 role / status / loginId 가 섞여 있어도 이 함수를 지나며
 * 사라지고, UpdateUserData 에 그 필드가 없으므로 실수로 실어 보낼 수도 없다.
 */
export async function updateMyProfile(
  session: SessionPayload | null,
  input: ProfileInput,
): Promise<User> {
  assertAuthenticated(session);

  // 대상이 아직 유효한 계정인지부터 확인한다. 차단된 계정이 자기 정보를
  // 고치고 있게 두지 않는다.
  await loadActiveUser(session);

  const parsed = parseProfile(input);
  if (!parsed.ok) throw new ValidationError(parsed.errors);

  return userRepository.update(session.userId, {
    name: parsed.value.name,
    gender: parsed.value.gender,
    birthDate: parsed.value.birthDate,
    phone: parsed.value.phone,
    // 폼의 선택지(MEMBER / NON_MEMBER)를 도메인 boolean 으로 옮긴다.
    // 회원가입(authService.signup)과 같은 변환이다.
    isChurchMember: parsed.value.churchMember === "MEMBER",
  });
}

/**
 * 비밀번호를 바꾼다.
 *
 * 순서에 규칙이 있다.
 *   ① 형식 검증 — 새 비밀번호가 규칙에 맞는가 (가입과 같은 규칙).
 *   ② 현재 비밀번호 대조 — 틀리면 UnauthorizedError(401).
 *   ③ 같은 값인가 — 바꾸는 의미가 없으므로 거절.
 *   ④ 해시 후 저장.
 *
 * **②를 ①보다 뒤에 둔다.** 현재 비밀번호가 맞아야만 새 비밀번호의 형식 문구를
 * 보여주는 편이 안전해 보이지만, 실제로는 반대다 — 형식 오류는 입력 칸에 붙는
 * 문구라 아무 비밀도 흘리지 않는 반면, 순서를 뒤집으면 맞는 현재 비밀번호를 쥔
 * 사용자가 형식 오류를 고칠 때마다 bcrypt 대조를 한 번씩 더 돌리게 된다.
 *
 * **세션을 무효화하지 않는다.** 근거는 아래 주석 참조.
 */
export async function changePassword(
  session: SessionPayload | null,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  assertAuthenticated(session);

  // 확인 칸은 클라이언트 폼에만 있는 필드다. 서버에는 두 값만 오므로
  // 확인값 자리에 새 비밀번호를 그대로 넣어 "불일치" 규칙을 통과시킨다 —
  // 검증 함수를 변경용으로 하나 더 만들지 않기 위한 최소한의 맞춤이다.
  const input: PasswordChangeInput = {
    currentPassword,
    newPassword,
    newPasswordConfirm: newPassword,
  };

  const errors = validatePasswordChange(input);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  const user = await loadActiveUserWithHash(session);

  // 자격 증명이 틀린 것이므로 403(권한 없음)이 아니라 401 이다.
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new UnauthorizedError(CURRENT_PASSWORD_INVALID);
  }

  // 형식은 맞지만 지금 쓰는 것과 같은 값. 입력 칸에 붙는 문구이므로 400.
  if (await verifyPassword(newPassword, user.passwordHash)) {
    throw new ValidationError({ newPassword: PASSWORD_UNCHANGED });
  }

  await userRepository.updatePassword(session.userId, await hashPassword(newPassword));

  // ── 왜 여기서 세션을 끊지 않는가 ────────────────────────────
  // 통상 "비밀번호를 바꾸면 다른 기기의 세션을 끊는다"는 계정 탈취를 되돌리기
  // 위한 조치다. 그런데 우리 세션은 서명만 검증하는 무상태 JWT 이고 서버에
  // 발급 목록이 없다(리프레시 토큰도 없다). 이미 나간 토큰을 회수할 방법이
  // 구조적으로 없으므로, 여기서 할 수 있는 일은 **이 요청을 보낸 쿠키를 지우는
  // 것뿐**이다. 그러면 탈취자의 토큰은 그대로 살아 있는 채 정당한 사용자만
  // 로그아웃된다 — 보호 효과는 0 이고 불편만 남는다.
  //
  // 진짜로 끊으려면 users 에 password_changed_at 같은 컬럼을 두고 세션 검증에서
  // "토큰 발급 시각(iat)이 그보다 이른가"를 보는 수밖에 없다. 스키마와 세션
  // 검증 경로를 함께 바꾸는 일이라 이번 범위 밖이며, 별도 슬라이스로 다룬다.
}

/**
 * 탈퇴한다. 되돌릴 수 없다.
 *
 * 순서에 규칙이 있다.
 *   ① 로그인 여부 — 세션이 없으면 401.
 *   ② 계정 상태 — ACTIVE 가 아니면(이미 탈퇴했거나 차단됐다) 진행하지 않는다.
 *   ③ 아이디 대조 — **세션의 id 로 읽어온 login_id** 와 입력값을 맞춘다.
 *   ④ 소프트 삭제.
 *
 * **③에서 입력값을 신뢰하지 않는 것이 핵심이다.** 대상은 언제나 세션의 주인이고,
 * 입력된 아이디는 "정말 이 계정을 지울 생각인가"를 되묻는 확인 절차일 뿐이다.
 * 입력값으로 사용자를 찾아서 지우면 남의 아이디를 넣어보는 경로가 열린다.
 *
 * 비밀번호를 함께 묻지 않는 것은 시안(1:1163)의 결정이다. 확인 수단이 아이디
 * 하나뿐이지만, 이 요청은 이미 세션 쿠키를 쥔 쪽만 보낼 수 있다.
 *
 * **탈퇴 사유를 받지 않고, 문서·댓글도 지우지 않는다** (docs/policy-draft.md 2절).
 * 세션 쿠키를 만료시키는 것은 HTTP 의 일이라 route handler 가 한다.
 */
export async function withdrawMe(
  session: SessionPayload | null,
  confirmLoginId: string,
): Promise<void> {
  assertAuthenticated(session);

  // ACTIVE 가 아니면 UnauthorizedError 다 — 이미 탈퇴한 계정의 토큰이 남아 있는
  // 상황이므로 "로그인하지 않은 것과 같다"가 정확한 답이다.
  const user = await loadActiveUser(session);

  // ── 관리자는 스스로 탈퇴할 수 없다 ──────────────────────────
  // 관리자 계정은 공개 가입으로 만들어지지 않고 DB 에서 손으로 승격된다
  // (CLAUDE.md "인증"). 만드는 경로가 DB 인데 없애는 경로만 화면에 두면,
  // 마지막 ADMIN 이 탈퇴하는 순간 승격을 실행할 관리자가 사라진다 — 되돌리려면
  // 결국 DB 를 직접 만져야 하고, 그건 애초에 승격이 있던 자리다.
  //
  // "마지막 한 명인가"를 세지 않는 이유: 세는 순간 그 판정과 UPDATE 사이에
  // 다른 관리자가 같은 요청을 보내면 둘 다 통과한다(TOCTOU). 관리자 수를 세는
  // 쿼리와 잠금을 들이는 대신, 관리자 계정의 수명은 승격과 같은 자리(DB)에서
  // 다룬다는 규칙 하나로 끝낸다.
  if (user.role === "ADMIN") {
    throw new ForbiddenError(
      "관리자 계정은 탈퇴할 수 없습니다. 문화팀으로 문의해주세요.",
    );
  }

  // 확인 칸. 형식 규칙(validateLoginId)을 걸지 않는다 — 이 칸이 답해야 하는
  // 질문은 "형식이 맞는가"가 아니라 "본인 아이디와 같은가" 하나뿐이다.
  if (confirmLoginId.trim() !== user.loginId) {
    throw new ValidationError({ confirmLoginId: WITHDRAW_LOGIN_ID_MISMATCH });
  }

  await userRepository.withdraw(session.userId);
}
