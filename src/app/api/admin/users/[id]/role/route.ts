// PATCH /api/admin/users/[id]/role — 역할 변경 (승격 · 강등)
//
// **경로가 `/role` 로 갈려 있는 것이 의도다.** 회원정보 수정(PATCH /api/users/me)에
// role 을 끼워 넣지 않는다:
//   · 주체가 다르다 — 저쪽은 본인이 자기 정보를, 이쪽은 관리자가 남의 권한을 고친다.
//   · 검증 대상이 다르다 — 저쪽은 이름·전화번호의 형식, 이쪽은 "그 대상의 역할을
//     바꿔도 되는가"(자기 자신인가 · 탈퇴 계정인가)다.
//   · repository 함수부터 다르다 — UpdateUserData 에는 role 이 없다. 그 타입이
//     권한 상승 경로를 타입 레벨에서 끊고 있고, 이 경로는 그 예외가 아니라 별개다.
// 경로가 갈려 있어야 Java 쪽에서 두 동작에 서로 다른 권한·감사 규칙을 걸 수 있다.
//
// 여기서 role 을 검사하지 않는 것은 형제 라우트와 같은 규칙이다 — 권한 판정은
// userService.changeUserRole 의 assertRole 이 전담한다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { UserRoleChangedBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import * as userService from "@/lib/services/userService";
import { parseRoleChange } from "@/lib/validation/userAdmin";

export async function PATCH(
  request: Request,
  // Next 15 에서 동적 세그먼트는 Promise 로 온다.
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);

    // 바디를 좁히는 일은 검증 모듈이 한다. 라우트가 `as Role` 로 단정하면
    // 검증 이전에 거짓말이 한 번 들어간다.
    const parsed = parseRoleChange(body);
    if (!parsed.ok) throw new ValidationError({ role: parsed.message });

    const user = await userService.changeUserRole(session, id, parsed.role);

    // revalidatePath 를 부르지 않는다. 역할은 공개 화면에 그려지는 값이 아니고
    // (게시물 상태와 다른 지점이다), 어드민 목록은 fetchApiAsUser 가 no-store 로
    // 가져오므로 router.refresh() 한 번이면 서버가 다시 조회한다.
    return NextResponse.json<UserRoleChangedBody>({
      id: user.id,
      role: user.role,
    });
  } catch (error) {
    return handleError(error);
  }
}
