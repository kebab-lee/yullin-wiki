// =============================================================
// 서버 컴포넌트 → 자기 Route Handler
//
// 절대 URL 조립 · 캐시 옵션 · 실패 판정을 한 줄로 묶는다. 이게 없으면 페이지마다
// fetch/ok 검사/json 파싱 세 줄이 복붙되고, 한 곳에서 ok 검사를 빠뜨리면
// 에러 응답 바디가 데이터인 척 화면까지 내려간다.
//
// **서버 전용이다.** 클라이언트 컴포넌트는 상대 경로로 fetch 하면 되므로
// 이 모듈이 필요 없다 (절대 URL 을 클라이언트 번들에 넣을 이유도 없다).
// =============================================================

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
