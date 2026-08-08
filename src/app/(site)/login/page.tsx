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
    // Figma: 1512 아트보드 기준 x=366 → 780px 중앙 정렬 (300 + 45 + 435).
    // y=189 는 헤더(131px) 아래 58px.
    <div className="mx-auto flex w-full max-w-[780px] gap-[45px] px-4 pb-[80px] pt-[32px] lg:px-0 lg:pb-[120px] lg:pt-[58px]">
      <LoginForm />

      {/* Figma Frame 1564 (435x307) — 이미지 자리. 에셋이 나오면 next/image 로 교체한다.

          **lg 미만에서는 감춘다.** 아직 사진이 정해지지 않은 플레이스홀더라,
          세로로 쌓이면 로그인 폼 아래에 회색 상자가 붙어 "안 불러와진 영역"으로
          읽힌다. 데스크톱에서 좌우 균형을 잡아 주던 역할도 세로 배치에서는
          사라진다. 실제 사진이 들어오면 그때 모바일 노출을 다시 판단한다. */}
      <div className="hidden h-[307px] w-[435px] shrink-0 items-center justify-center rounded-card bg-brand-red-white lg:flex">
        <span className="text-[16px] font-light leading-[19px] text-gray3">
          교회 사진같은거?
        </span>
      </div>
    </div>
  );
}
