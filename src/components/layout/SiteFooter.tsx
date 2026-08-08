import Image from "next/image";
import Link from "next/link";

import type { Category } from "@/lib/types";

type SiteFooterProps = {
  /**
   * 푸터 카테고리 목록 (Figma 1:416).
   * 데이터는 루트 layout 이 GET /api/categories 로 받아 내려준다 —
   * 컴포넌트 안에서 fetch 하지 않는다.
   */
  categories: Category[];
};

/**
 * 모든 페이지가 공유하는 푸터 — Figma `Footer` 1:396.
 * 유저/관리자 공통이라 role 분기가 없다.
 */
export default function SiteFooter({ categories }: SiteFooterProps) {
  return (
    <footer className="w-full overflow-hidden bg-brand-red">
      <div className="mx-auto w-full max-w-hero px-4 py-[40px] lg:px-0 lg:py-[59px]">
        {/* lg 미만에서는 3열이 들어갈 자리가 없다. 같은 순서 그대로 세로로 쌓는다. */}
        <div className="flex flex-col gap-[40px] lg:flex-row lg:items-start lg:justify-between lg:gap-0">
          {/* 좌: 로고 + 저작권 */}
          <div className="flex flex-col justify-between gap-[20px] self-stretch pt-[10px] lg:gap-0">
            <div className="flex items-center gap-[15px]">
              <Image
                src="/brand/logo-footer.svg"
                alt="열린 위키"
                width={83}
                height={60}
              />
              <div className="flex flex-col justify-center gap-[10px] whitespace-nowrap">
                <p className="text-[30px] font-extrabold leading-[30px] text-brand-red-white">
                  열린 위키
                </p>
                <p className="text-[14px] font-medium leading-4 text-brand-red-pink">
                  열린교회에 대한 모든것
                </p>
              </div>
            </div>
            <p className="whitespace-nowrap text-[15px] font-light leading-5 text-brand-red-pink">
              ©2024 000. All right reserved.
            </p>
          </div>

          {/* 우: 메뉴 영역 */}
          <div className="flex flex-col items-start gap-[30px] lg:gap-10">
            <div className="flex flex-col items-start gap-[30px] lg:flex-row lg:gap-[60px]">
              {/* 카테고리 — 긴 형(fullName) */}
              <div className="flex flex-col justify-center gap-5">
                <p className="whitespace-nowrap text-footer-title text-brand-red-white">
                  카테고리
                </p>
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/categories/${category.slug}`}
                    // `-my/py` 짝은 레이아웃을 그대로 둔 채 터치 영역만 44px 로
                    // 넓힌다 (CLAUDE.md "반응형"). lg 에서는 둘 다 0 으로 돌린다.
                    className="-my-[14px] whitespace-nowrap py-[14px] text-footer-content text-brand-red-pink hover:text-brand-red-white lg:my-0 lg:py-0"
                  >
                    {category.fullName}
                  </Link>
                ))}
              </div>

              {/* 문의 */}
              <div className="flex flex-col justify-center gap-5 whitespace-nowrap">
                <p className="text-footer-title text-brand-red-white">문의</p>
                <p className="text-footer-content text-brand-red-pink">
                  문화팀 | ycteam001@gmail.com
                </p>
                <p className="text-footer-content text-brand-red-pink">
                  개발자팀 | yullindevteam001@gmail.com
                </p>
                {/* 이용 안내. 가입·탈퇴 화면에서만 닿을 수 있으면 이미 가입한
                    사용자가 되찾아볼 자리가 없어서 전 페이지 공통인 푸터에 둔다. */}
                <Link
                  href="/policy"
                  className="-my-[14px] py-[14px] text-footer-content text-brand-red-pink hover:text-brand-red-white lg:my-0 lg:py-0"
                >
                  이용 안내
                </Link>
              </div>

              {/* SNS */}
              <div className="flex flex-col items-start gap-5 lg:items-end">
                <p className="whitespace-nowrap text-footer-title text-brand-red-white">
                  열린교회 SNS
                </p>
                <Image
                  src="/icons/sns.svg"
                  alt="열린교회 인스타그램 · 공식 홈페이지"
                  width={56}
                  height={24}
                />
              </div>
            </div>

            {/* 주소 */}
            <div className="flex flex-col gap-[8px] whitespace-nowrap lg:flex-row lg:items-center lg:gap-5">
              <p className="text-footer-title text-brand-red-white">열린교회 주소</p>
              <p className="text-footer-content text-brand-red-pink">
                경기 안양시 동안구 흥안대로439번길 31
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
