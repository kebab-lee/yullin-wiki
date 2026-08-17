"use client";

import Image from "next/image";
import Link from "next/link";

import { hasRole } from "@/lib/auth/roles";
import { useViewerRole } from "@/lib/auth/viewerRoleClient";

/**
 * 헤더 왼쪽의 로고 묶음 — 세션에 따라 두 가지가 갈린다.
 *
 *   목적지   EDITOR 이상은 `/admin`, 나머지는 `/`
 *   라벨     EDITOR 이상에게만 "관리자"가 붙는다 (Figma AdHeader 1:1680)
 *
 * **기준이 EDITOR 인 것은 페이지 가드(requireRole("EDITOR"))와 같은 선이다** —
 * 헤더가 관리 화면으로 보내는데 화면은 튕기는(또는 그 반대) 어긋남을 막는다.
 *
 * **이건 표시일 뿐이다.** 이 라벨이 붙는다고 권한이 생기지 않고, 브라우저에서
 * role 을 바꿔 `/admin` 링크를 만들어도 서버의 requireRole 이 홈으로 돌려보낸다
 * (viewerRoleClient 주석).
 *
 * 로고·글자는 세션과 무관하므로 서버에서 그려도 되지만, 링크 자체가 목적지를
 * 세션으로 정하므로 조각을 더 쪼개지 않는다 — `<Link>` 하나를 서버/클라이언트로
 * 반으로 자를 수는 없다.
 */
export default function HeaderBrand() {
  const { role, ready } = useViewerRole();

  // 모르는 동안에는 공개 모양이다. "관리자"를 먼저 그렸다가 거두면 일반
  // 사용자 전원이 깜빡임을 본다 — 드물게 겪는 쪽(EDITOR 이상)이 낫다.
  const isAdminViewer = ready && role !== "GUEST" && hasRole(role, "EDITOR");

  return (
    <Link
      href={isAdminViewer ? "/admin" : "/"}
      className="flex shrink-0 items-center justify-center gap-[10px]"
    >
      <Image
        src="/brand/logo-mark.svg"
        alt="열린위키"
        width={50}
        height={36}
        priority
      />
      <span className="whitespace-nowrap text-[24px] font-bold leading-[30px] text-brand-red lg:text-[30px]">
        열린위키
      </span>
      {isAdminViewer && (
        <span className="whitespace-nowrap text-[24px] font-extralight leading-[30px] text-brand-red lg:text-[30px]">
          관리자
        </span>
      )}
    </Link>
  );
}
