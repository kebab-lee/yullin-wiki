// PATCH /api/admin/users/[id]/status — 사용자 차단 · 차단 해제
//
// **형제인 `/role` 과 같은 이유로 경로가 갈려 있다.** 회원정보 수정
// (PATCH /api/users/me)에 status 를 끼워 넣지 않는다:
//   · 주체가 다르다 — 저쪽은 본인이 자기 정보를, 이쪽은 관리자가 남의 계정
//     상태를 바꾼다.
//   · 검증 대상이 다르다 — 저쪽은 이름·전화번호의 형식, 이쪽은 "그 대상을
//     차단해도 되는가"(자기 자신인가 · ADMIN 인가 · 탈퇴 계정인가)다.
//   · repository 함수부터 다르다 — UpdateUserData 에는 status 가 없다. 그 타입이
//     자기 차단 해제 경로를 타입 레벨에서 끊고 있고, 이 경로는 그 예외가 아니라
//     별개다.
//
// **`/role` 과 한 라우트로 합치지 않는 것도 의도다.** 역할과 상태는 같은 표에
// 나란히 있지만 서로 다른 규칙이 걸린다 — 역할 변경은 자기 자신만 막고
// (관리자끼리 강등은 된다), 차단은 ADMIN 전체를 대상에서 뺀다. 한 바디로 받으면
// 두 규칙이 한 함수에 섞이고, "역할만 바꾸려 했는데 상태도 함께 갔다"는 실수가
// 가능해진다.
//
// **DELETE 가 아니다.** 차단은 되돌릴 수 있는 상태 전환이고 해제도 같은
// 라우트로 온다 (바디의 status 가 방향을 말한다). WITHDRAWN 은 바디에 넣을 수
// 없다 — 관리자가 남을 탈퇴시키는 경로는 없다 (parseBlockChange 주석).
//
// 여기서 role 을 검사하지 않는 것은 형제 라우트와 같은 규칙이다 — 권한 판정은
// userService.changeUserStatus 의 assertRole("ADMIN") 이 전담한다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { UserStatusChangedBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import * as userService from "@/lib/services/userService";
import { parseBlockChange } from "@/lib/validation/report";

export async function PATCH(
  request: Request,
  // Next 15 에서 동적 세그먼트는 Promise 로 온다.
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);

    const parsed = parseBlockChange(body);
    if (!parsed.ok) throw new ValidationError({ status: parsed.message });

    const user = await userService.changeUserStatus(
      await getSession(),
      id,
      parsed.status,
    );

    // 적용된 상태를 되돌려준다. 목록에서 버튼을 누른 화면은 이동하지 않고
    // 제자리에서 배지를 다시 그려야 하는데, 이 값이 없으면 클라이언트가
    // "BLOCKED 를 보냈으니 BLOCKED 겠지"라고 추측해서 그린다 — 상태의 정본은
    // 서버다 (UserRoleChangedBody 와 같은 근거).
    //
    // revalidatePath 를 부르지 않는다. 계정 상태는 공개 화면에 그려지는 값이
    // 아니고, 어드민 목록은 fetchApiAsUser 가 no-store 로 가져오므로
    // router.refresh() 한 번이면 서버가 다시 조회한다.
    return NextResponse.json<UserStatusChangedBody>({
      id: user.id,
      status: user.status,
    });
  } catch (error) {
    return handleError(error);
  }
}
