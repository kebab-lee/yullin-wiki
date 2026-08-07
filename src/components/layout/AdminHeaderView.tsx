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
    <header className="w-full bg-white h-[135px] overflow-hidden">
      {/* Figma: 1512 프레임 안에서 좌우 209px 여백 → 1094px 중앙 정렬, 상단 71px */}
      <div className="mx-auto flex w-[1094px] max-w-full items-center justify-between pt-[71px]">
        {/* 좌: 로고 + 검색 */}
        <div className="flex items-center justify-center gap-[15px]">
          <Link href="/admin" className="flex items-center justify-center gap-[10px]">
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
            <span className="whitespace-nowrap text-[30px] font-extralight leading-[30px] text-brand-red">
              관리자
            </span>
          </Link>

          <SearchInput variant="header" />
        </div>

        {/* 우: 프로필 + 로그아웃 */}
        <div className="flex h-[35px] items-center justify-center gap-[10px]">
          {/* 관리자용 마이페이지를 따로 두지 않는다 (`/admin/mypage` 없음).
              관리자도 회원정보는 같은 화면에서 본다 — 화면을 복제하면 같은 폼을
              두 벌 유지하게 된다 (CLAUDE.md "화면 중복"). */}
          <Link href="/mypage" aria-label="마이페이지" className="block shrink-0">
            <Image src="/icons/profile.svg" alt="" width={30} height={30} />
          </Link>
          <AuthActionButton role={role} />
        </div>
      </div>
    </header>
  );
}
