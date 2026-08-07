// =============================================================
// 인증 서비스 — 회원가입 · 로그인 · 현재 사용자
//
// 비즈니스 규칙의 정본이다. HTTP 를 모르고(Request/Response 를 import 하지 않는다)
// Supabase 도 모른다(repository 를 통해서만 DB 에 닿는다). 그래서 이 파일은
// 나중에 Spring 의 @Service 로 거의 그대로 옮겨진다.
//
// "아이디를 쓸 수 있는가"는 인증이 아니라 사용자 도메인의 규칙이라
// userService 에 있다. 여기서는 그것을 호출만 한다.
//
// 클라이언트도 같은 검증 함수를 쓰지만 그건 편의고, 진짜 방어선은 여기다.
// =============================================================

import { assertAuthenticated } from "@/lib/auth/guards";
import {
  ABSENT_USER_HASH,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password";
import { createSession, getSession } from "@/lib/auth/session";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import * as userRepository from "@/lib/repositories/userRepository";
import type { UserWithHash } from "@/lib/repositories/userRepository";
import * as userService from "@/lib/services/userService";
import type { User } from "@/lib/types";
import {
  LOGIN_FAILED,
  parseSignup,
  type SignupInput,
} from "@/lib/validation/user";

// 해시 생성·대조와 그 비용(라운드)은 auth/password.ts 가 소유한다.
// 비밀번호 변경(userService)도 같은 함수를 쓴다 — 라운드가 두 곳에 적히면
// 한쪽만 올렸을 때 같은 계정의 해시 비용이 갈린다.

/** 해시를 떼고 도메인 모델만 남긴다. 응답 JSON 으로 해시가 새지 않는 지점. */
function stripHash({ passwordHash, ...user }: UserWithHash): User {
  return user;
}

/**
 * 회원가입.
 *
 * 관리자 계정은 이 경로로 만들어지지 않는다 — role 은 DB 기본값 'USER' 이고,
 * 승격은 DB 에서 직접 한다 (CLAUDE.md "인증").
 */
export async function signup(input: SignupInput): Promise<User> {
  const parsed = parseSignup(input);
  if (!parsed.ok) throw new ValidationError(parsed.errors);

  // 중복 판정은 중복확인 버튼이 쓰는 것과 같은 규칙이어야 한다.
  await userService.assertLoginIdAvailable(parsed.value.loginId);

  const passwordHash = await hashPassword(parsed.value.password);

  return userRepository.create({
    loginId: parsed.value.loginId,
    passwordHash,
    name: parsed.value.name,
    gender: parsed.value.gender,
    birthDate: parsed.value.birthDate,
    phone: parsed.value.phone,
    // 폼의 선택지(MEMBER / NON_MEMBER)를 도메인 boolean 으로 옮긴다.
    // 화면 문구가 바뀌어도 DB 컬럼은 그대로다.
    isChurchMember: parsed.value.churchMember === "MEMBER",
  });
}

/**
 * 로그인. 성공하면 사용자와 서명된 세션 토큰을 돌려준다.
 *
 * 토큰을 쿠키에 심는 것은 HTTP 의 일이라 route handler 가 한다 — 이 함수는
 * 쿠키도 Response 도 모른다.
 *
 * 실패 사유(아이디 없음 / 탈퇴·차단 / 비밀번호 불일치)를 구분해서 던지지 않는다.
 * 구분하는 순간 어떤 아이디가 존재하는지 알려주는 셈이 된다.
 */
export async function login(
  loginId: string,
  password: string,
): Promise<{ user: User; token: string }> {
  const found = await userRepository.findByLoginId(loginId);

  // 계정이 없어도 해시 비교를 한 번 돌린다 (위 ABSENT_USER_HASH 주석 참조).
  const matched = await verifyPassword(
    password,
    found?.passwordHash ?? ABSENT_USER_HASH,
  );

  // ACTIVE 가 아닌 계정(BLOCKED / WITHDRAWN)은 비밀번호가 맞아도 못 들어온다.
  if (!found || found.status !== "ACTIVE" || !matched) {
    throw new UnauthorizedError(LOGIN_FAILED);
  }

  const user = stripHash(found);
  return { user, token: await createSession(user) };
}

/**
 * 현재 로그인한 사용자.
 *
 * 토큰의 role 을 그대로 믿지 않고 DB 를 다시 읽는다 — 토큰은 7일 살아 있어서,
 * 그 사이 차단되거나 탈퇴한 계정이 발급 시점의 권한으로 계속 통과하면 안 된다.
 */
export async function getCurrentUser(): Promise<User> {
  const session = await getSession();
  assertAuthenticated(session);

  const user = await userRepository.findById(session.userId);
  if (!user || user.status !== "ACTIVE") throw new UnauthorizedError();

  return user;
}
