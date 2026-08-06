// =============================================================
// 관리 메뉴 (LNB) 정의
//
// 메뉴와 그 메뉴에 필요한 권한을 한 줄에 붙여 둔다. 렌더링 쪽에서
// "이건 ADMIN 만" 같은 조건을 따로 적으면 항목이 늘 때 규칙이 흩어진다.
//
// **여기 minRole 은 표시 판정일 뿐 차단이 아니다.** 실제 차단은 각 페이지의
// requireRole (화면) 과 service 의 assertRole (데이터) 이 한다. 메뉴를 숨겨도
// 주소를 직접 치면 들어와지므로, 이 상수만 믿고 가드를 빼면 안 된다.
//
// 아직 라우트가 없는 항목(/admin/pages, /admin/users, /admin/admins)도 들어 있다.
// 목록의 정본을 한 곳에 두려는 것이며, 페이지 생성은 별도 작업이다.
// =============================================================

import type { Role } from "@/lib/auth/roles";

export type AdminMenuItem = {
  label: string;
  href: string;
  minRole: Role;
};

export const ADMIN_MENU = [
  { label: "대시보드", href: "/admin", minRole: "EDITOR" },
  { label: "위키 관리", href: "/admin/pages", minRole: "EDITOR" },
  { label: "사용자 관리", href: "/admin/users", minRole: "ADMIN" },
  { label: "관리자 관리", href: "/admin/admins", minRole: "ADMIN" },
] as const satisfies readonly AdminMenuItem[];
