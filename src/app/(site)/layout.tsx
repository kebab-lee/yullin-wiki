import { SiteHeader } from "@/components/layout/SiteHeader";
import type { ViewerRole } from "@/lib/types";

// TODO: 인증 연동 시 세션에서 주입. 퍼블리싱용 임시값.
//
// layout 은 searchParams 를 받지 않는다(page 전용 prop). 그래서 `?role=` 같은
// 쿼리 스위치는 여기 둘 수 없고, 필요하면 쿠키나 미들웨어 헤더로 읽어야 한다.
// 지금은 상수로 두고, 세션이 붙으면 이 한 줄만 교체한다.
const role: ViewerRole = "GUEST";

/**
 * 헤더가 붙는 모든 페이지의 레이아웃.
 *
 * 홈(/)은 이 그룹 밖에 있다 — Figma 시안상 홈에는 Header(1:433)가 없고
 * 히어로 안의 HeroHeaderBar 가 그 역할을 겸하기 때문이다.
 * pathname 분기나 SiteHeader 내부 조건문 대신 route group 으로 가른다.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader role={role} />
      {children}
    </>
  );
}
