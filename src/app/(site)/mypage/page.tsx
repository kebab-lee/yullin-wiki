import type { Metadata } from "next";

import ProfileView from "@/components/user/ProfileView";
import { fetchApiAsUser } from "@/lib/api/serverFetch";
import type { MyProfileBody } from "@/lib/api/types";
import { requireAuth } from "@/lib/auth/requireAuth";

export const metadata: Metadata = {
  title: "마이페이지 - 열린위키",
};

/**
 * **프리렌더 금지.** 자기 Route Handler 를 fetch 하는데 빌드 시점에는 그 서버가
 * 떠 있지 않다. 게다가 응답이 사용자마다 다르다.
 */
export const dynamic = "force-dynamic";

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
  await requireAuth();

  // 세션에서 꺼낸 id 로 service 를 직접 부르지 않고 자기 Route Handler 를 거친다
  // (레이어 규칙). 어느 사용자인지는 쿠키가 말해준다 — 경로에 id 가 없다.
  const { user } = await fetchApiAsUser<MyProfileBody>("/api/users/me");

  return <ProfileView user={user} />;
}
