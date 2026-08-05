import Image from "next/image";

import type { Category } from "@/lib/types";

/**
 * 푸터 카테고리 목록 (Figma 1:416).
 *
 * 표시에는 짧은 형(name)이 아니라 **긴 형(fullName)** 을 쓴다.
 *
 * TODO: GET /api/categories 연동 시 제거. fullName 필드를 사용한다.
 */
const FOOTER_CATEGORIES: Category[] = [
  {
    id: "1",
    slug: "space",
    name: "공간",
    fullName: "열린교회 속 공간",
    icon: "⛪️",
    sortOrder: 1,
  },
  {
    id: "2",
    slug: "serving",
    name: "섬김",
    fullName: "열린교회 내 섬김",
    icon: "🤲",
    sortOrder: 2,
  },
  {
    id: "3",
    slug: "youth",
    name: "열청",
    fullName: "열린교회 청년부",
    icon: "🌱",
    sortOrder: 3,
  },
];

/**
 * 모든 페이지가 공유하는 푸터 — Figma `Footer` 1:396.
 * 유저/관리자 공통이라 role 분기가 없다.
 */
export default function SiteFooter() {
  return (
    <footer className="w-full overflow-hidden bg-brand-red">
      <div className="mx-auto w-[880px] max-w-full py-[59px]">
        <div className="flex items-start justify-between">
          {/* 좌: 로고 + 저작권 */}
          <div className="flex flex-col justify-between self-stretch pt-[10px]">
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
          <div className="flex flex-col items-start gap-10">
            <div className="flex items-start gap-[60px]">
              {/* 카테고리 — 긴 형(fullName) */}
              <div className="flex flex-col justify-center gap-5">
                <p className="whitespace-nowrap text-footer-title text-brand-red-white">
                  카테고리
                </p>
                {FOOTER_CATEGORIES.map((category) => (
                  <p
                    key={category.slug}
                    className="whitespace-nowrap text-footer-content text-brand-red-pink"
                  >
                    {category.fullName}
                  </p>
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
              </div>

              {/* SNS */}
              <div className="flex flex-col items-end gap-5">
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
            <div className="flex items-center gap-5 whitespace-nowrap">
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
