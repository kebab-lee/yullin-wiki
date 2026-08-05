import { SiteHeader } from "@/components/layout/SiteHeader";
import { getViewerRole } from "@/lib/auth/viewer";

/**
 * 헤더가 붙는 모든 페이지의 레이아웃.
 *
 * 홈(/)은 이 그룹 밖에 있다 — Figma 시안상 홈에는 Header(1:433)가 없고
 * 히어로 안의 HeroHeaderBar 가 그 역할을 겸하기 때문이다.
 * pathname 분기나 SiteHeader 내부 조건문 대신 route group 으로 가른다.
 *
 * 쿠키를 읽으므로 이 레이아웃 아래는 동적 렌더링이 된다. 로그인 상태에 따라
 * 헤더가 달라지는 이상 정적 캐싱은 어차피 성립하지 않는다.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getViewerRole();

  return (
    <>
      <SiteHeader role={role} />
      {children}
    </>
  );
}
