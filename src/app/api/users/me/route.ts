// GET   /api/users/me — 내 회원정보
// PATCH /api/users/me — 내 회원정보 수정
//
// **경로에 userId 가 없다.** 대상은 언제나 세션의 주인이다. `/api/users/[id]` 로
// 두면 남의 id 를 넣은 요청을 service 가 매번 걸러줘야 하는데, 그 검사는
// 빠뜨리기 쉽고 빠뜨려도 조용하다. 경로에 아예 없으면 넣을 자리가 없다.
//
// 세션 해석과 권한 판정은 userService 가 한다 — 여기서는 HTTP 변환만.
// 세션이 없으면 service 가 UnauthorizedError 를 던지고 handleError 가 401 로 옮긴다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import { asStringMap } from "@/lib/api/parseBody";
import { getSession } from "@/lib/auth/session";
import * as userService from "@/lib/services/userService";

/**
 * 수정 요청에서 읽는 필드.
 *
 * **이 목록이 화이트리스트다.** role / status / loginId 를 바디에 끼워 넣어도
 * 여기 없으므로 service 까지 도달하지 못한다. (그 뒤로도 UpdateUserData 가
 * 한 겹 더 막지만, 방어선을 하나만 두지 않는다)
 */
const PROFILE_FIELDS = [
  "name",
  "gender",
  "birthDate",
  "phone",
  "churchMember",
] as const;

export async function GET() {
  try {
    const user = await userService.getMyProfile(await getSession());
    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const input = asStringMap(body, PROFILE_FIELDS);

    const user = await userService.updateMyProfile(await getSession(), input);

    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}
