/**
 * 어드민 레이아웃.
 *
 * 헤더는 (site) route group 의 layout 이, 푸터는 루트 layout 이 담당한다.
 * 관리자 헤더는 role === 'ADMIN' 일 때 SiteHeader 내부에서 교체되므로
 * 여기에 따로 박지 않는다.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
