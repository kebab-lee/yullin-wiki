"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { hasRole, type Role } from "@/lib/auth/roles";
import { ADMIN_MENU } from "@/lib/constants/adminMenu";

/**
 * 어드민 LNB 의 링크 목록.
 *
 * **여기 필터링은 표시 판정일 뿐 차단이 아니다.**
 * 메뉴에서 빠졌다고 그 화면에 못 들어가는 것이 아니다 — 주소를 직접 치면
 * 그대로 요청이 간다. 실제 차단은 두 겹이 따로 맡는다:
 *   · 화면 — 각 페이지의 requireRole (src/lib/auth/requireRole.ts)
 *   · 데이터 — service 의 assertRole (src/lib/auth/guards.ts)
 * 이 컴포넌트를 고쳐도 그 둘은 영향을 받지 않으며, 반대로 여기서 항목을
 * 되살린다고 권한이 생기지도 않는다. LNB 는 "갈 수 있는 곳을 안내"할 뿐이다.
 *
 * **클라이언트 컴포넌트인 이유는 usePathname 하나다.** 활성 표시는 현재 경로를
 * 알아야 하는데, 페이지마다 자기 경로를 prop 으로 내려주게 하면 라우트를 추가할
 * 때마다 문자열을 손으로 맞춰야 하고 한 곳만 틀려도 엉뚱한 항목이 켜진다.
 * 경계를 이 nav 하나로 좁혀서 AdminShell 과 그 children 은 서버 컴포넌트로 남는다
 * (SiteHeader 를 클라이언트로 만들지 않는다는 규칙과 같은 결이다 — 헤더 전체가
 * 아니라 경로를 알아야 하는 조각만 클라이언트다).
 */
export default function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname();

  // 대시보드(/admin)만 정확히 일치로 본다. 접두사로 보면 모든 어드민 경로에서
  // 대시보드가 켜져 두 항목이 동시에 활성이 된다.
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav
      aria-label="관리 메뉴"
      // lg 미만: 본문 위 가로 스크롤 줄. `-mx-4 px-4` 로 컨테이너 좌우 패딩을
      //   상쇄해 칩이 화면 끝까지 흐르게 하되 첫 칩의 들여쓰기는 남긴다.
      //   공개 위키의 CategorySideNav 와 같은 패턴이다 — 어드민만 다른 모바일
      //   관용구를 쓰면 같은 사이트에서 두 벌을 유지하게 된다.
      // lg 이상: 좌측 세로 LNB (어드민은 데스크톱 우선).
      className={[
        "-mx-4 flex w-full shrink-0 gap-[10px] overflow-x-auto px-4",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "lg:mx-0 lg:w-[196px] lg:flex-col lg:gap-[6px] lg:overflow-x-visible lg:px-0",
      ].join(" ")}
    >
      {ADMIN_MENU.filter((item) => hasRole(role, item.minRole)).map((item) => {
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              // h-11 = 44px. 터치 인터랙션 최소 크기 (CLAUDE.md "반응형").
              "flex h-11 shrink-0 items-center justify-center whitespace-nowrap px-[16px]",
              "lg:justify-start lg:px-[18px]",
              "rounded-pill border-2 text-[15px] font-bold leading-[18px] transition-colors",
              active
                ? "border-brand-red bg-brand-red text-white"
                : "border-gray2 bg-white text-gray4 hover:border-brand-red hover:text-brand-red",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
