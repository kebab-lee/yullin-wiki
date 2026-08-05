// =============================================================
// 실패 응답 바디 읽기 (클라이언트용)
//
// 폼마다 따로 적으면 "바디가 깨졌을 때 뭘 보여줄 것인가"가 화면마다 갈린다.
// next/server 를 import 하지 않으므로 클라이언트 컴포넌트가 안전하게 쓴다.
// =============================================================

import type { ApiErrorBody } from "./types";

/** 서버에 닿지 못했거나 응답이 계약을 벗어났을 때의 대체 문구. */
export const NETWORK_ERROR =
  "⚠ 요청을 보내지 못했습니다. 잠시 후 다시 시도해주세요.";

/** 실패 응답에서 문구를 꺼낸다. 모양이 어긋나면 대체 문구로 떨어진다. */
export async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  const body: unknown = await response.json().catch(() => null);

  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return body as ApiErrorBody;
  }

  return { message: NETWORK_ERROR };
}
