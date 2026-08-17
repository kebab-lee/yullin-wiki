import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * 헤더가 붙는 모든 페이지의 레이아웃.
 *
 * 홈(/)은 이 그룹 밖에 있다 — Figma 시안상 홈에는 Header(1:433)가 없고
 * 히어로 안의 HeroHeaderBar 가 그 역할을 겸하기 때문이다.
 * pathname 분기나 SiteHeader 내부 조건문 대신 route group 으로 가른다.
 *
 * **여기서 세션을 읽지 않는다.** 예전에는 getViewerRole() 로 role 을 읽어
 * SiteHeader 에 넘겼는데, 쿠키를 읽는 순간 이 레이아웃 아래 **모든 페이지**가
 * 동적 렌더가 된다. 정적으로 생성하면 그 role 이 빌드 시점 값으로 굳어 전원이
 * 같은 헤더를 보게 되므로, 로그인 표시는 브라우저에서 정한다
 * (viewerRoleClient — 왜 그게 표시용일 뿐인지도 거기 적혀 있다).
 *
 * **화면 접근 차단은 그대로 서버에 있다.** /admin 은 페이지마다 requireRole,
 * /mypage 는 requireAuth 를 부른다. 헤더가 브라우저에서 그려진다고 해서 가드가
 * 약해지지 않는다 — 애초에 헤더는 아무것도 막은 적이 없다 (CLAUDE.md "권한").
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
