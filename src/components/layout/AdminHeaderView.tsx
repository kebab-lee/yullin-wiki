import Image from "next/image";
import Link from "next/link";

import AuthActionButton from "@/components/common/AuthActionButton";
import HeaderSearchBox from "./HeaderSearchBox";

/**
 * 관리자 헤더 뷰 — Figma `AdHeader` 1:1680.
 *
 * SiteHeader 를 통해서만 렌더된다. 어드민 전용 레이아웃을 따로 두지 않는다.
 * 유저 헤더와의 차이는 "관리자" 라벨과 로고 링크 대상뿐이다.
 */
export default function AdminHeaderView() {
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

          <HeaderSearchBox />
        </div>

        {/* 우: 프로필 + 로그아웃 */}
        <div className="flex h-[35px] items-center justify-center gap-[10px]">
          <Link href="/admin/mypage" aria-label="마이페이지" className="block shrink-0">
            <Image src="/icons/profile.svg" alt="" width={30} height={30} />
          </Link>
          <AuthActionButton role="ADMIN" />
        </div>
      </div>
    </header>
  );
}
