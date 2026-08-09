// GET /api/admin/users?role=&status=&page=&size= — 어드민 사용자 관리 목록
//
// **여기서 role 을 검사하지 않는다.** 권한 판정은 userService.listUsersForAdmin 의
// assertRole 이 전담한다 (CLAUDE.md "권한"). 라우트에도 같은 검사를 두면 규칙이
// 두 곳으로 갈리고, 그 사본은 Java 이관 시 사라질 Next 전용 레이어에 남는다.
// 세션 유무만 보는 것은 권한 판정이 아니라 "service 에 넘길 신원이 있는가"다.
//
// `/api/users/*`(내 정보)와 경로가 갈린 이유는 /api/admin/pages 와 같다 — 같은
// 테이블이라도 "내 것"과 "남의 것 전부"는 접근 주체가 다르고, 그 경계가 URL 에
// 드러나야 Java 쪽에서 필터 체인을 경로 단위로 나눌 수 있다.
//
// /admin/admins 를 위한 별도 라우트를 만들지 않는다. 그 화면은 `?role=ADMIN` 을
// 붙여 이 목록을 부르는 같은 조회다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { AdminUserListBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/errors";
import * as userService from "@/lib/services/userService";

/**
 * 쿼리 파라미터 → 숫자. 없거나 숫자가 아니면 undefined 로 넘겨 "기본값을 써라"는
 * 뜻을 service 에 그대로 전달한다 (/api/admin/pages 의 같은 함수와 동일한 규칙).
 */
function readNumber(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return undefined;

  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const params = new URL(request.url).searchParams;

    // role · status 를 여기서 판정하지 않는다. 문자열을 그대로 넘기면 service 가
    // 좁히고(parseRoleFilter · parseUserStatusFilter), 실제로 적용된 값을 응답에
    // 되돌려준다 — 라우트가 미리 거르면 같은 규칙이 두 곳에 생긴다.
    const result = await userService.listUsersForAdmin(session, {
      role: params.get("role") ?? undefined,
      status: params.get("status") ?? undefined,
      page: readNumber(params, "page"),
      size: readNumber(params, "size"),
    });

    return NextResponse.json<AdminUserListBody>({
      users: result.items,
      total: result.total,
      page: result.page,
      size: result.size,
      role: result.role,
      status: result.status,
    });
  } catch (error) {
    return handleError(error);
  }
}
