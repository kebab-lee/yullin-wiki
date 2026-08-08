import Image from "next/image";
import Link from "next/link";

import AuthActionButton from "@/components/common/AuthActionButton";
import type { ViewerRole } from "@/lib/types";
import SearchInput from "@/components/common/SearchInput";

/**
 * 유저(비로그인 포함) 헤더 뷰 — Figma `Header` 1:433.
 *
 * SiteHeader 를 통해서만 렌더된다. 직접 import 하지 않는다.
 * role 은 로그인/로그아웃 표시 분기에만 쓴다.
 */
export default function PublicHeaderView({ role }: { role: ViewerRole }) {
  const isLoggedIn = role !== "GUEST";

  return (
    // 모바일에서는 높이를 내용에 맡긴다. `h-[131px] overflow-hidden` 이 걸린 채
    // 두 줄이 되면 검색 줄이 잘려 나간다.
    <header className="w-full bg-white lg:h-[131px] lg:overflow-hidden">
      {/*
        한 벌의 마크업으로 두 배치를 만든다 (모바일 전용 헤더를 따로 만들지 않는다).

        - lg 미만: 줄바꿈으로 2행 — [로고 | 프로필·로그인] / [검색창 전폭].
          검색이 위키의 주 진입점이라 좁은 화면에서 전폭을 준다.
        - lg 이상: 한 행 — 시안(1512 프레임 좌우 209px 여백 → 1094px, 상단 71px) 그대로.
          order 로 검색창을 로고 옆으로 되돌리고 우측 묶음을 끝으로 보낸다.
      */}
      <div className="mx-auto flex w-full max-w-[1094px] flex-wrap items-center gap-x-5 gap-y-[14px] px-4 py-[14px] lg:flex-nowrap lg:px-0 lg:py-0 lg:pt-[71px]">
        {/* 로고 */}
        <Link
          href="/"
          className="order-1 flex shrink-0 items-center justify-center gap-[10px]"
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
        </Link>

        {/* 검색 — 모바일에서는 자기 줄을 통째로 쓴다 */}
        <div className="order-3 w-full min-w-0 lg:order-2 lg:w-auto">
          <SearchInput variant="header" />
        </div>

        {/* 우: 로그인 여부에 따라 교체 */}
        <div className="order-2 ml-auto flex items-center justify-center gap-[10px] lg:order-3 lg:h-[35px]">
          {isLoggedIn && (
            <Link
              href="/mypage"
              aria-label="마이페이지"
              className="flex size-11 shrink-0 items-center justify-center lg:size-[30px]"
            >
              <Image src="/icons/profile.svg" alt="" width={30} height={30} />
            </Link>
          )}
          <AuthActionButton role={role} />
        </div>
      </div>
    </header>
  );
}
