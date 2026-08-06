import type { Role } from "@/lib/auth/roles";

type AdminShellProps = {
  /**
   * 이 화면을 보고 있는 사람의 역할.
   *
   * 페이지의 requireRole 이 돌려준 session.role 을 그대로 넘긴다. 셸이 직접
   * 세션을 읽지 않는 이유는, 그러면 "가드는 페이지가, 조회는 셸이" 로 갈려서
   * 둘이 어긋난 상태를 볼 수 있기 때문이다.
   */
  role: Role;
  children: React.ReactNode;
};

/**
 * 어드민 화면의 공통 껍데기 — LNB 자리.
 *
 * **layout.tsx 가 아니라 컴포넌트인 것이 핵심이다.** layout 은 같은 layout 을
 * 공유하는 형제 라우트 사이의 클라이언트 사이드 이동에서 다시 실행되지 않아,
 * 거기에 가드를 얹으면 건너뛰어진다. 각 페이지가 자기 requireRole 을 부른 뒤
 * 결과를 이 셸에 넘기는 구조라야 구멍이 없다.
 *
 * 지금은 자리만 잡는다. ADMIN_MENU 를 role 로 걸러 그리는 LNB 는 다음 작업.
 */
export default function AdminShell({ role: _role, children }: AdminShellProps) {
  return <>{children}</>;
}
