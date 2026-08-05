import type { ViewerRole } from "@/lib/types";

import AdminHeaderView from "./AdminHeaderView";
import PublicHeaderView from "./PublicHeaderView";

/**
 * 모든 페이지가 공유하는 헤더의 **단일 진입점**.
 *
 * 관리자 헤더를 별도 레이아웃에 박지 않고 여기서만 분기한다.
 * 인증이 붙으면 role 의 출처(layout 의 상수 → 세션)만 바뀌고
 * 이 컴포넌트와 하위 뷰는 변경되지 않는다.
 */
export function SiteHeader({ role }: { role: ViewerRole }) {
  if (role === "ADMIN") {
    return <AdminHeaderView />;
  }

  return <PublicHeaderView role={role} />;
}
