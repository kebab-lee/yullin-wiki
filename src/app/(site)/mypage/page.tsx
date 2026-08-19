import type { Metadata } from "next";

import MyCommentList from "@/components/user/MyCommentList";
import ProfileView from "@/components/user/ProfileView";
import type { MyCommentListBody, MyProfileBody } from "@/lib/api/types";
import { requireAuth } from "@/lib/auth/requireAuth";
import type { SessionPayload } from "@/lib/auth/session";
import * as commentService from "@/lib/services/commentService";
import * as userService from "@/lib/services/userService";

export const metadata: Metadata = {
  title: "마이페이지 - 열린위키",
};

/**
 * **프리렌더 금지.** 응답이 사용자마다 다르다. `requireAuth()` 가 쿠키를 읽으므로
 * 어차피 동적이지만, 그 사실이 가드 안쪽에 숨어 있는 것보다 여기 적혀 있는 편이
 * 낫다 — 가드가 옮겨져도 이 라우트가 조용히 정적으로 굳지 않는다.
 */
export const dynamic = "force-dynamic";

/**
 * 내 회원정보. **self-fetch 대신 직접 호출이 사는 자리 둘 중 하나다.**
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
 * 없다 — 라우트 경로에 userId 가 없는 것과 같은 장치이며, 직접 호출로 바꾸면서도
 * 그 성질은 그대로다.
 *
 * 반환 타입을 `MyProfileBody` 로 두는 것도 의도다. 라우트가 내려주던 것과 같은
 * 모양이라 화면 코드가 예외를 눈치채지 못하고, Java 이관 시 이 함수 본문만
 * `fetchApiAsUser` 로 되돌리면 끝난다. (`/mypage/edit` · `/mypage/withdraw` 에
 * 같은 함수가 한 벌씩 더 있다. 공용 모듈로 빼지 않는 것은 되돌릴 자리가 화면과
 * 1:1 로 보여야 하기 때문이다.)
 */
async function myProfile(session: SessionPayload): Promise<MyProfileBody> {
  return { user: await userService.getMyProfile(session) };
}

/**
 * 내가 쓴 최근 댓글. 위와 같은 이유로 직접 부르고, 같은 이유로 세션만 받는다 —
 * `listMyComments` 도 authorId 를 인자로 받지 않는다.
 */
async function myComments(
  session: SessionPayload,
): Promise<MyCommentListBody> {
  return { comments: await commentService.listMyComments(session) };
}

/**
 * 마이페이지 조회 — `/mypage` (Figma 1:1003).
 *
 * **가드를 이 페이지에서 직접 부른다.** layout 에 두면 형제 라우트 간
 * 클라이언트 사이드 이동에서 재실행되지 않아 건너뛰어진다 (CLAUDE.md "권한").
 *
 * requireRole 을 쓰지 않는다 — 그건 EDITOR 이상을 요구하는 화면용이고,
 * 여기 필요한 것은 권한이 아니라 로그인 여부다. 되돌려 보내는 곳도 다르다
 * (홈이 아니라 /login).
 *
 * 이건 화면 접근 차단일 뿐이고, 데이터를 막는 것은 userService 의
 * assertAuthenticated 다 — API 는 이 페이지를 거치지 않고 직접 호출된다.
 */
export default async function MyPage() {
  const session = await requireAuth();

  // 어느 사용자인지는 쿠키가 말해준다 — 세션 말고는 대상을 정하는 입력이 없다.
  //
  // 회원정보와 내 댓글은 **별개 계약이다.** 한 응답에 합치면 마이페이지를 열
  // 때마다 안 쓰는 쪽까지 따라오고, 계약도 화면 단위로 굳어 재사용이 막힌다.
  // 서로 기다릴 이유가 없으므로 나란히 부른다.
  const [{ user }, { comments }] = await Promise.all([
    myProfile(session),
    myComments(session),
  ]);

  return (
    <>
      <ProfileView user={user} />

      {/* Figma 1:1047 — 회원정보 아래 880 폭. 아래 여백을 페이지가 갖는다
          (ProfileView 주석). */}
      <div className="mx-auto w-full max-w-hero px-4 pb-[80px] pt-[40px] lg:px-0 lg:pb-[120px] lg:pt-[60px]">
        <MyCommentList comments={comments} />
      </div>
    </>
  );
}
