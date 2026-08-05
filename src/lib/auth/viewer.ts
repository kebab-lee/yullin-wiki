// =============================================================
// 세션 → 화면 권한(ViewerRole)
//
// "세션 없음 = GUEST" 매핑을 (site)/layout 과 홈이 각각 적으면 한쪽만 고쳐질 때
// 헤더가 갈린다. 규칙은 여기 한 줄뿐이고 양쪽이 이 함수를 부른다.
//
// 이건 표시용 판정이다. 실제 차단은 service 의 guards 가 한다 —
// 헤더가 관리자 메뉴를 숨기는 것과 관리자 API 를 막는 것은 별개 방어선이다.
// =============================================================

import type { ViewerRole } from "@/lib/types";

import { getSession } from "./session";

export async function getViewerRole(): Promise<ViewerRole> {
  const session = await getSession();
  return session?.role ?? "GUEST";
}
