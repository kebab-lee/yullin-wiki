import Image from "next/image";
import Link from "next/link";

import AuthActionButton from "@/components/common/AuthActionButton";
import type { ViewerRole } from "@/lib/types";
import HeaderSearchBox from "./HeaderSearchBox";

/**
 * 유저(비로그인 포함) 헤더 뷰 — Figma `Header` 1:433.
 *
 * SiteHeader 를 통해서만 렌더된다. 직접 import 하지 않는다.
 * role 은 로그인/로그아웃 표시 분기에만 쓴다.
 */
export default function PublicHeaderView({ role }: { role: ViewerRole }) {
  const isLoggedIn = role !== "GUEST";

  return (
    <header className="w-full bg-white h-[131px] overflow-hidden">
      {/* Figma: 1512 프레임 안에서 좌우 209px 여백 → 1094px 중앙 정렬, 상단 71px */}
      <div className="mx-auto flex w-[1094px] max-w-full items-center justify-between pt-[71px]">
        {/* 좌: 로고 + 검색 */}
        <div className="flex items-center justify-center gap-5">
          <Link href="/" className="flex items-center justify-center gap-[10px]">
            <Image
              src="/brand/logo-mark.svg"
              alt="열린위키"
              width={50}
              height={36}
              priority
            />
            <span className="whitespace-nowrap text-[30px] font-bold leading-[30px] text-brand-red">
              열린위키
            </span>
          </Link>

          <HeaderSearchBox />
        </div>

        {/* 우: 로그인 여부에 따라 교체 */}
        <div className="flex h-[35px] items-center justify-center gap-[10px]">
          {isLoggedIn && (
            <Link href="/mypage" aria-label="마이페이지" className="block shrink-0">
              <Image src="/icons/profile.svg" alt="" width={30} height={30} />
            </Link>
          )}
          <AuthActionButton role={role} />
        </div>
      </div>
    </header>
  );
}
