// GET    /api/users/me — 내 회원정보
// PATCH  /api/users/me — 내 회원정보 수정
// DELETE /api/users/me — 탈퇴 (소프트 삭제)
//
// **경로에 userId 가 없다.** 대상은 언제나 세션의 주인이다. `/api/users/[id]` 로
// 두면 남의 id 를 넣은 요청을 service 가 매번 걸러줘야 하는데, 그 검사는
// 빠뜨리기 쉽고 빠뜨려도 조용하다. 경로에 아예 없으면 넣을 자리가 없다.
//
// 세션 해석과 권한 판정은 userService 가 한다 — 여기서는 HTTP 변환만.
// 세션이 없으면 service 가 UnauthorizedError 를 던지고 handleError 가 401 로 옮긴다.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import { asStringMap } from "@/lib/api/parseBody";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/cookie";
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

/**
 * 탈퇴.
 *
 * **바디를 받는 DELETE 다.** 확인용 아이디를 쿼리스트링에 두지 않는 것은
 * 의도다 — 쿼리는 서버·프록시 로그에 그대로 남는다.
 *
 * 성공 응답이 204 가 아니라 200 인 이유: 세션 쿠키를 만료시키는 Set-Cookie 를
 * 함께 실어야 하는데, 바디 없는 응답에 헤더만 얹는 것보다 "무엇이 끝났는지"가
 * 응답에 드러나는 편이 낫다. 쿠키를 지우는 것은 로그아웃과 같은 순수 HTTP
 * 조작이라 service 가 아니라 여기서 한다 (POST /api/auth/logout 과 같은 코드).
 *
 * 실패하면 쿠키를 건드리지 않는다 — 아이디를 잘못 입력했을 뿐인 사용자가
 * 로그아웃까지 당하면 안 된다. set 이 service 호출 뒤에 있는 것이 그 장치다.
 */
export async function DELETE(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const { confirmLoginId } = asStringMap(body, ["confirmLoginId"]);

    await userService.withdrawMe(await getSession(), confirmLoginId);

    // 심을 때와 같은 속성으로 덮어써야 브라우저가 같은 쿠키로 인식하고 지운다.
    (await cookies()).set(SESSION_COOKIE, "", {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
