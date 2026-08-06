/**
 * 어드민 레이아웃.
 *
 * 헤더는 (site) route group 의 layout 이, 푸터는 루트 layout 이 담당한다.
 * 관리자 헤더는 EDITOR 이상일 때 SiteHeader 내부에서 교체되므로
 * 여기에 따로 박지 않는다.
 *
 * **가드도 LNB 도 여기 두지 않는다.** layout 은 형제 라우트 간 클라이언트
 * 사이드 이동에서 재실행되지 않는다. 가드는 페이지의 requireRole 이,
 * 공통 껍데기는 각 페이지가 감싸는 AdminShell 이 맡는다.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
