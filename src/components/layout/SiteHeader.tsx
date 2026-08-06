import { hasRole } from "@/lib/auth/roles";
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
  // 관리 화면(/admin)에 들어갈 수 있는 사람에게 관리자 헤더를 준다.
  // 기준을 EDITOR 로 둔 것은 페이지 가드(requireRole("EDITOR"))와 같은 선이다 —
  // 헤더에 메뉴가 없는데 화면은 열리는(또는 그 반대) 어긋남을 막는다.
  if (role !== "GUEST" && hasRole(role, "EDITOR")) {
    return <AdminHeaderView role={role} />;
  }

  return <PublicHeaderView role={role} />;
}
