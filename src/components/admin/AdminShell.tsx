import type { Role } from "@/lib/auth/roles";

import AdminNav from "./AdminNav";

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
 * 어드민 화면의 공통 껍데기 — LNB + 본문.
 *
 * **layout.tsx 가 아니라 컴포넌트인 것이 핵심이다.** layout 은 같은 layout 을
 * 공유하는 형제 라우트 사이의 클라이언트 사이드 이동에서 다시 실행되지 않아,
 * 거기에 가드를 얹으면 건너뛰어진다. 각 페이지가 자기 requireRole 을 부른 뒤
 * 결과를 이 셸에 넘기는 구조라야 구멍이 없다. LNB 를 layout 으로 올리고 싶어지는
 * 순간이 곧 가드가 layout 으로 따라 올라가는 순간이라, 셸을 컴포넌트로 묶어 둔다.
 *
 * **LNB 의 role 필터링은 표시용이다.** 항목이 안 보이는 것과 접근이 막히는 것은
 * 다르다 — 자세한 근거는 AdminNav 주석에 있다.
 *
 * 서버 컴포넌트로 남는다. 경로를 알아야 하는 조각(AdminNav)만 클라이언트라
 * children 은 서버 렌더링 그대로 통과한다.
 *
 * 에디터 화면(/admin/posts/**)은 이 셸을 쓰지 않는다. 전체 폭을 쓰는 작업 화면이라
 * 옆에 네비가 붙으면 본문 편집 영역이 좁아지고, 편집 중 실수로 빠져나갈 길만 는다.
 */
export default function AdminShell({ role, children }: AdminShellProps) {
  return (
    <div
      // lg 미만: 좌우 16px 패딩에 LNB 가 본문 위로 올라간다 (공개 목록과 같은 컨테이너).
      // lg 이상: Figma AdSaved(1:1490) 기준 — LNB 196px + gap 40 + 좌 80 이면
      //   본문이 x=316 에서 시작한다.
      className={[
        "mx-auto flex w-full max-w-page flex-col gap-[24px] px-4 pb-[60px] pt-[24px]",
        "lg:flex-row lg:items-start lg:gap-[40px] lg:px-[80px] lg:pb-[100px] lg:pt-[50px]",
      ].join(" ")}
    >
      <AdminNav role={role} />

      {/* min-w-0 이 없으면 표처럼 넓은 자식이 flex 아이템의 최소 폭을 밀어올려
          컨테이너 전체가 가로로 넘친다. */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
