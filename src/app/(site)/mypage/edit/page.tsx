import type { Metadata } from "next";

import ProfileEditForm from "@/components/user/ProfileEditForm";
import type { MyProfileBody } from "@/lib/api/types";
import { requireAuth } from "@/lib/auth/requireAuth";
import type { SessionPayload } from "@/lib/auth/session";
import * as userService from "@/lib/services/userService";

export const metadata: Metadata = {
  title: "회원정보 수정 - 열린위키",
};

export const dynamic = "force-dynamic";

/**
 * 내 회원정보. **self-fetch 대신 직접 호출이 사는 자리는 여기 하나다.**
 *
 * 응답이 사용자마다 다르므로 예전의 fetchApiAsUser 는 no-store 였다 — fetch
 * 캐시가 아예 걸리지 않으니 자기 라우트로 한 바퀴 도는 비용을 매 요청 그대로
 * 냈다는 뜻이다. 정적화도 세션 때문에 불가능하다 (CLAUDE.md "서버 컴포넌트의
 * self-fetch").
 *
 * **권한은 그대로 두 겹이다.** `requireAuth()` 가 돌려준 세션을 그대로 넘기므로,
 * 라우트 핸들러가 `getSession()` 으로 읽어 넘기던 값과 같다 —
 * userService.getMyProfile 의 `assertAuthenticated` 는 이전과 똑같이 호출되고,
 * 그 뒤의 `loadSignedInUser` 가 탈퇴한 계정의 토큰까지 다시 걸러낸다.
 *
 * **대상은 세션의 주인뿐이다.** service 가 id 를 인자로 받지 않으므로 넘길 자리가
 * 없다 — 라우트 경로에 userId 가 없는 것과 같은 장치다.
 *
 * 반환 타입을 `MyProfileBody` 로 두는 것도 의도다. 라우트가 내려주던 것과 같은
 * 모양이라 화면 코드가 예외를 눈치채지 못하고, Java 이관 시 이 함수 본문만
 * `fetchApiAsUser` 로 되돌리면 끝난다. (`/mypage` 계열 세 화면이 같은 함수를 한
 * 벌씩 갖는다. 공용 모듈로 빼지 않는 것은 되돌릴 자리가 화면과 1:1 로 보여야
 * 하기 때문이다.)
 */
async function myProfile(session: SessionPayload): Promise<MyProfileBody> {
  return { user: await userService.getMyProfile(session) };
}

/**
 * 회원정보 수정 — `/mypage/edit` (Figma 1:1146).
 *
 * 가드를 조회 화면과 **따로** 부른다. 형제 라우트끼리는 layout 을 공유해도
 * 가드가 상속되지 않는다 (CLAUDE.md "권한").
 *
 * 좌측 인사말 블록은 조회 화면과 같은 자리지만 컴포넌트로 빼지 않았다 —
 * 지금은 이름 두 줄이 전부이고, 공유 조각으로 만들면 두 화면 중 하나가
 * 바뀔 때 조건 분기가 그 안으로 들어간다.
 */
export default async function MyPageEdit() {
  const session = await requireAuth();

  const { user } = await myProfile(session);

  return (
    // lg 미만에서는 인사말 위 · 폼 아래로 쌓는다 (조회·탈퇴 화면과 같은 배치).
    <div className="mx-auto flex w-full max-w-hero flex-col gap-[24px] px-4 pb-[80px] pt-[32px] lg:flex-row lg:gap-[90px] lg:px-0 lg:pb-[120px] lg:pt-[79px]">
      <div className="w-full lg:w-[195px] lg:shrink-0">
        <p className="text-[32px] font-extrabold leading-[45px] text-black">
          {user.name ?? "-"}님,
        </p>
        <p className="text-[32px] font-normal leading-[45px] text-black">
          안녕하세요
        </p>
      </div>

      <ProfileEditForm user={user} />
    </div>
  );
}
