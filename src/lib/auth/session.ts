// =============================================================
// 세션 — JWT 발급 · 검증 · 읽기
//
// Supabase Auth 를 쓰지 않는다. 플랫폼 종속이라 Java 로 옮길 때 통째로 사라지고,
// 우리 users 테이블이 이미 인증 사용자이기 때문이다. 서명·검증만 하는 표준 JWT 라
// Spring 쪽에서 같은 시크릿으로 같은 토큰을 읽을 수 있다.
//
// payload 에는 { sub, role } 만 넣는다. 이름·전화번호 같은 PII 를 실으면
// 토큰이 새는 순간 그대로 노출되고, 값이 바뀌어도 7일 동안 낡은 채로 남는다.
// =============================================================

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { isRole, type Role, type User } from "@/lib/types";

import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./cookie";

/**
 * 토큰에서 복원한 신원. 화면에 뿌릴 정보가 아니라 "누가 요청했는가"만 답한다.
 * 사용자 상세가 필요하면 이 userId 로 repository 를 다시 조회한다 —
 * 그래야 차단·탈퇴가 토큰 만료를 기다리지 않고 즉시 반영된다.
 */
export type SessionPayload = {
  userId: string;
  role: Role;
};

const ALGORITHM = "HS256";

let secret: Uint8Array | null = null;

/** 지연 생성. 모듈 로드 시점에 읽으면 환경변수 없는 빌드 단계에서 터진다. */
function getSecret(): Uint8Array {
  if (secret) return secret;

  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("SESSION_SECRET 환경변수가 설정되지 않았습니다.");
  }
  secret = new TextEncoder().encode(value);
  return secret;
}

export async function createSession(user: User): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

/**
 * 서명·만료를 검증하고 payload 를 도메인 타입으로 좁힌다.
 *
 * 실패 사유(위조 / 만료 / 모양 불일치)를 구분해서 돌려주지 않는다 — 호출부가
 * 할 일은 어느 쪽이든 "로그인 안 된 것으로 취급"뿐이다.
 */
export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      // 허용 알고리즘을 고정한다. 안 하면 alg 를 바꿔치기하는 공격 여지가 생긴다.
      algorithms: [ALGORITHM],
    });

    // 서명이 유효해도 안에 든 값의 모양까지 믿지는 않는다.
    if (typeof payload.sub !== "string" || !isRole(payload.role)) return null;

    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

/** 요청 쿠키에서 세션을 읽는다. 없거나 유효하지 않으면 null. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  return verifySession(token);
}
