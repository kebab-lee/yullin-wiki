// =============================================================
// 서버 컴포넌트 → 자기 Route Handler
//
// 절대 URL 조립 · 캐시 옵션 · 실패 판정을 한 줄로 묶는다. 이게 없으면 페이지마다
// fetch/ok 검사/json 파싱 세 줄이 복붙되고, 한 곳에서 ok 검사를 빠뜨리면
// 에러 응답 바디가 데이터인 척 화면까지 내려간다.
//
// **서버 전용이다.** 클라이언트 컴포넌트는 상대 경로로 fetch 하면 되므로
// 이 모듈이 필요 없다 (절대 URL 을 클라이언트 번들에 넣을 이유도 없다).
//
// **이걸 쓰지 않는 화면이 있다: 캐시가 왕복 비용을 흡수하지 못하는 화면.**
// `/search`(쿼리마다 URL 이 달라 캐시 미스)와 어드민 화면들(응답이 사용자마다 달라
// no-store)이 그렇고, 그 화면들은 service 를 직접 부른다. 판정 기준과 측정 근거는
// CLAUDE.md "서버 컴포넌트의 self-fetch" 에 있다 — **화면 이름이 아니라 그 기준을
// 보고 판단해라.** 캐시가 흡수하는 호출은 여전히 전부 여기를 거친다.
// =============================================================

import { cookies } from "next/headers";

import { apiUrl } from "./baseUrl";
import type { ApiErrorBody } from "./types";

/**
 * API 가 2xx 가 아닌 응답을 준 경우.
 *
 * status 를 들고 있는 것이 핵심이다. 호출부는 "404 면 notFound(), 그 외에는
 * 그대로 터뜨린다"처럼 갈라야 하는데, 상태 코드를 메시지 문자열에만 담으면
 * 그 판단을 문자열 파싱으로 하게 된다.
 */
export class ApiResponseError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
  }
}

/**
 * 자기 API 를 GET 해서 JSON 을 돌려준다. 2xx 가 아니면 ApiResponseError.
 *
 * @param path       `/api/...` 로 시작하는 경로
 * @param revalidate 캐시 수명(초). 값은 REVALIDATE 상수에서 가져온다.
 */
export async function fetchApi<T>(
  path: string,
  revalidate: number,
): Promise<T> {
  const response = await fetch(apiUrl(path), { next: { revalidate } });

  if (!response.ok) {
    // 서버가 내려준 문구가 있으면 살려서 로그에 남긴다. 없으면 상태 코드만.
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiResponseError(
      response.status,
      `GET ${path} 실패 (${response.status}): ${body?.message ?? "응답 본문 없음"}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * 로그인한 사용자 본인의 데이터를 GET 한다. 세션 쿠키를 실어 보낸다.
 *
 * fetchApi 와 나눠 둔 이유가 둘이다.
 *   1. **쿠키.** 서버에서 도는 fetch 는 브라우저 요청의 쿠키를 자동으로 물려받지
 *      않는다. 그냥 fetchApi 를 부르면 Route Handler 쪽에서 세션이 없는 요청으로
 *      보여 401 이 온다.
 *   2. **캐시.** 응답이 사용자마다 다르므로 revalidate 를 받지 않고 no-store 로
 *      고정한다. 초 단위라도 캐싱하면 A 의 회원정보가 B 에게 나갈 수 있다.
 *      이 값을 파라미터로 열어두지 않는 것이 그 사고를 구조적으로 막는다.
 *
 * 화면 접근 차단(requireAuth)과 별개다. 이건 데이터를 가져오는 방법일 뿐이고,
 * 진짜 판정은 Route Handler 너머 service 의 assertAuthenticated 가 한다.
 *
 * ⚠️ **지금 이 함수는 호출자가 없다. 그래도 지우지 마라.**
 * 기준상 그럴 수밖에 없다 — 세션 쿠키를 실어야 하는 응답은 곧 no-store 라
 * fetch 캐시가 안 걸리는 응답이고, 그런 화면은 전부 service 를 직접 부르기
 * 때문이다 (CLAUDE.md "서버 컴포넌트의 self-fetch"). **잊혀서 남은 코드가
 * 아니라 되돌아갈 자리로 남긴 코드다** — 어드민·마이페이지 화면들의 데이터
 * 함수는 Java 이관 때 본문을 이 호출로 되돌리게 되어 있고, 라우트 핸들러를
 * 지우지 않는 것과 같은 판단이다. (`fetchApi` 쪽은 공개 화면들이 계속 쓴다.)
 */
export async function fetchApiAsUser<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    cache: "no-store",
    headers: { cookie: (await cookies()).toString() },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiResponseError(
      response.status,
      `GET ${path} 실패 (${response.status}): ${body?.message ?? "응답 본문 없음"}`,
    );
  }

  return (await response.json()) as T;
}
