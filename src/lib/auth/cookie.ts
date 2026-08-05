// =============================================================
// 세션 쿠키의 계약 (이름 · 수명 · 속성)
//
// session.ts 가 아니라 별도 파일인 이유는 middleware 때문이다. middleware 는
// edge 런타임에서 돌아 next/headers 를 쓸 수 없는데, 쿠키 "이름"은 알아야 한다.
// 여기에 의존성 없는 상수만 두면 양쪽이 같은 이름을 보면서도 middleware 가
// jose·next/headers 를 끌어오지 않는다.
// =============================================================

/** 쿠키 이름. middleware 와 route handler 가 같은 값을 봐야 한다. */
export const SESSION_COOKIE = "session";

/**
 * 7일. 리프레시 토큰을 두지 않기로 했으므로 이 값이 곧 로그인 유지 기간이다.
 * JWT 만료(session.ts)와 쿠키 만료가 어긋나지 않도록 양쪽이 이 상수를 쓴다.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * httpOnly  — JS 가 토큰을 읽지 못하게 한다 (XSS 로 탈취 불가).
 *             localStorage 를 쓰지 않는 이유가 이것이다.
 * secure    — HTTPS 에서만 전송. localhost 는 브라우저가 신뢰 출처로 취급해 예외다.
 * sameSite  — lax. 외부 사이트에서 온 POST 에는 쿠키가 실리지 않아 CSRF 를 막고,
 *             일반 링크 이동에는 실려서 로그인 상태가 유지된다.
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;
