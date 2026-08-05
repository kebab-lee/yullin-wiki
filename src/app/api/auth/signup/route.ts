// POST /api/auth/signup — 회원가입
//
// 하는 일은 셋뿐이다: 바디를 service 가 아는 모양으로 옮기고, service 를 부르고,
// 결과를 JSON 으로 돌려준다. 검증·중복 판정·해시는 전부 service 안에 있다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import { asStringMap } from "@/lib/api/parseBody";
import * as authService from "@/lib/services/authService";
import type { SignupInput } from "@/lib/validation/user";

const SIGNUP_FIELDS = [
  "loginId",
  "password",
  "passwordConfirm",
  "name",
  "gender",
  "birthDate",
  "phone",
  "churchMember",
] as const satisfies readonly (keyof SignupInput)[];

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const user = await authService.signup(asStringMap(body, SIGNUP_FIELDS));

    // 가입 직후 화면은 /login 으로 가므로 최소한만 돌려준다.
    // 사용자 전체를 흘리지 않는 편이 기본값으로 안전하다.
    return NextResponse.json(
      { id: user.id, loginId: user.loginId },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
