import type { Metadata } from "next";

import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "회원가입 - 열린위키",
};

/**
 * 회원가입 페이지 — Figma 1:1194 (Frame 1499, 880x571).
 *
 * 가입 경로는 이것 하나다. 관리자 계정은 공개 가입 대상이 아니라
 * DB 에서 users.role 을 ADMIN 으로 올려서 만든다.
 *
 * 헤더는 (site)/layout.tsx 가 붙인다 — 여기서 렌더하지 않는다.
 */
export default function SignupPage() {
  return (
    // Figma: x=316 → 1512 아트보드에서 880px 중앙 정렬.
    // y=210 은 헤더(131px) 아래 79px.
    <div className="mx-auto flex w-hero max-w-full gap-[122px] pb-[120px] pt-[79px]">
      {/* Figma Frame 1406 (221x90) */}
      <div className="w-[221px] shrink-0">
        <h1 className="text-[32px] font-bold leading-[45px] text-black">
          회원가입
        </h1>
        <p className="mt-[10px] flex h-[35px] items-center text-[18px] font-light leading-[22px] text-gray4">
          만나서 반가워요
        </p>
      </div>

      <SignupForm />
    </div>
  );
}
