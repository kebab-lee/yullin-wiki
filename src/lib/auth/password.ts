// =============================================================
// 비밀번호 해시 — 생성 · 대조
//
// 해시가 필요한 곳이 둘이 되면서(가입·로그인은 authService, 비밀번호 변경은
// userService) 이 파일로 뺐다. 라운드 수가 두 곳에 적히면 한쪽만 올렸을 때
// 같은 계정의 해시 비용이 갈린다.
//
// bcryptjs 를 아는 유일한 지점이다. Java 이관 시 이 파일이 통째로
// BCryptPasswordEncoder 로 대체된다 — 저장된 해시는 그대로 검증된다.
// =============================================================

import bcrypt from "bcryptjs";

/**
 * bcrypt 라운드. 10 은 로그인 지연(수십 ms)과 무차별 대입 비용 사이의 통상값이다.
 * Java 로 옮길 때 BCryptPasswordEncoder(10) 이 같은 해시를 검증한다.
 */
const SALT_ROUNDS = 10;

/**
 * 존재하지 않는 아이디로 로그인을 시도했을 때 대신 비교할 더미 해시.
 *
 * 계정이 없다고 바로 반환하면 응답이 눈에 띄게 빨라서, 문구를 통일해도
 * 응답 시간만으로 어떤 아이디가 존재하는지 훑을 수 있다. 같은 코스트의 해시를
 * 한 번 돌려서 두 경로의 소요 시간을 맞춘다. (무작위 문자열의 해시라 절대 맞지 않는다)
 */
export const ABSENT_USER_HASH =
  "$2b$10$NXt5UeE7l//OYPYKGi7SC.VQP3aCoE5kO6zstnKnWgnm7FcQ6PowK";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** 평문이 해시와 맞는가. 타이밍 차이는 bcrypt 자체가 흡수한다. */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
