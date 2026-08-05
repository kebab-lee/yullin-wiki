// GET /api/users/check-duplicate?loginId=... — 아이디 사용 가능 여부
//
// 회원가입 폼의 "중복확인" 버튼이 부른다. 판정은 service 가 하고
// 여기서는 쿼리스트링을 꺼내 boolean 을 JSON 으로 옮기기만 한다.
//
// 사용자 도메인이므로 userService 를 부른다 — 회원가입 화면에서 호출된다고
// authService 로 가지 않는다 (CLAUDE.md "레이어 규칙").

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import * as userService from "@/lib/services/userService";

export async function GET(request: Request) {
  try {
    const loginId =
      new URL(request.url).searchParams.get("loginId")?.trim() ?? "";
    const available = await userService.isLoginIdAvailable(loginId);

    return NextResponse.json({ available });
  } catch (error) {
    return handleError(error);
  }
}
