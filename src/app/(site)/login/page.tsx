import type { Metadata } from "next";

import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "로그인 - 열린위키",
};

/**
 * 로그인 페이지 — Figma 1:1207.
 *
 * 사이트에 로그인 화면은 이것 하나뿐이다. 관리자 로그인(AdLogin 1:1456)은
 * 필드 구성이 같아서 /admin/login 을 따로 두지 않는다.
 *
 * 헤더는 (site)/layout.tsx 가 붙인다 — 여기서 렌더하지 않는다.
 */
export default function LoginPage() {
  return (
    // Figma: 1512 아트보드 기준 x=366 → 780px 중앙 정렬.
    // y=189 는 헤더(131px) 아래 58px.
    <div className="mx-auto flex w-[780px] max-w-full gap-[45px] pb-[120px] pt-[58px]">
      <LoginForm />

      {/* Figma Frame 1564 (435x307) — 이미지 자리. 에셋이 나오면 next/image 로 교체한다. */}
      <div className="flex h-[307px] w-[435px] shrink-0 items-center justify-center rounded-card bg-brand-red-white">
        <span className="text-[16px] font-light leading-[19px] text-gray3">
          교회 사진같은거?
        </span>
      </div>
    </div>
  );
}
