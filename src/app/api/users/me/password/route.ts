// POST /api/users/me/password — 내 비밀번호 변경
//
// 회원정보 수정(PATCH /api/users/me)과 나눠 둔 것은 의도다. 현재 비밀번호 확인이
// 붙는 별도 절차이고, 실패 코드도 다르다(현재 비밀번호가 틀리면 401).
// 한 엔드포인트로 합치면 "비밀번호가 함께 왔는가"에 따라 요구 조건이 달라지는
// 분기가 생긴다.
//
// PUT 이 아니라 POST 인 이유: 이 요청은 비밀번호 리소스를 통째로 교체하는 것이
// 아니라 "현재 값을 알고 있음을 증명하고 바꾼다"는 절차라, 같은 요청을 두 번
// 보내면 두 번째는 실패한다(멱등하지 않다).
//
// 성공 응답에 바디가 없다. 돌려줄 것이 없고, 새 비밀번호를 되돌려 보낼 이유는
// 더더욱 없다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import { asStringMap } from "@/lib/api/parseBody";
import { getSession } from "@/lib/auth/session";
import * as userService from "@/lib/services/userService";

const PASSWORD_FIELDS = ["currentPassword", "newPassword"] as const;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const { currentPassword, newPassword } = asStringMap(body, PASSWORD_FIELDS);

    await userService.changePassword(
      await getSession(),
      currentPassword,
      newPassword,
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
