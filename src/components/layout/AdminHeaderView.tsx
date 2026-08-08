import Image from "next/image";
import Link from "next/link";

import AuthActionButton from "@/components/common/AuthActionButton";
import type { Role } from "@/lib/auth/roles";
import SearchInput from "@/components/common/SearchInput";

/**
 * 관리자 헤더 뷰 — Figma `AdHeader` 1:1680.
 *
 * SiteHeader 를 통해서만 렌더된다. 어드민 전용 레이아웃을 따로 두지 않는다.
 * 유저 헤더와의 차이는 "관리자" 라벨과 로고 링크 대상뿐이다.
 *
 * role 을 받아 그대로 내려보낸다. 여기서 "ADMIN" 을 박아 넣으면 EDITOR 가
 * 볼 때 거짓말이 된다 — 이 헤더는 EDITOR 이상이면 그려진다.
 */
export default function AdminHeaderView({ role }: { role: Role }) {
  return (
    // 이 헤더는 어드민 화면 전용이 아니다 — EDITOR 이상이 **공개 위키**를 볼 때도
    // 붙는다(SiteHeader 분기). 그래서 반응형은 PublicHeaderView 와 같은 구조를
    // 그대로 적용한다 (CLAUDE.md "반응형").
    <header className="w-full bg-white lg:h-[135px] lg:overflow-hidden">
      {/* 배치 근거는 PublicHeaderView 주석과 동일하다. */}
      <div className="mx-auto flex w-full max-w-[1094px] flex-wrap items-center gap-x-[15px] gap-y-[14px] px-4 py-[14px] lg:flex-nowrap lg:px-0 lg:py-0 lg:pt-[71px]">
        {/* 로고 */}
        <Link
          href="/admin"
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
          <span className="whitespace-nowrap text-[24px] font-extralight leading-[30px] text-brand-red lg:text-[30px]">
            관리자
          </span>
        </Link>

        {/* 검색 — 모바일에서는 자기 줄을 통째로 쓴다 */}
        <div className="order-3 w-full min-w-0 lg:order-2 lg:w-auto">
          <SearchInput variant="header" />
        </div>

        {/* 우: 프로필 + 로그아웃 */}
        <div className="order-2 ml-auto flex items-center justify-center gap-[10px] lg:order-3 lg:h-[35px]">
          {/* 관리자용 마이페이지를 따로 두지 않는다 (`/admin/mypage` 없음).
              관리자도 회원정보는 같은 화면에서 본다 — 화면을 복제하면 같은 폼을
              두 벌 유지하게 된다 (CLAUDE.md "화면 중복"). */}
          <Link
            href="/mypage"
            aria-label="마이페이지"
            className="flex size-11 shrink-0 items-center justify-center lg:size-[30px]"
          >
            <Image src="/icons/profile.svg" alt="" width={30} height={30} />
          </Link>
          <AuthActionButton role={role} />
        </div>
      </div>
    </header>
  );
}
