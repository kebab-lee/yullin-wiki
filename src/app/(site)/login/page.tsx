import type { Metadata } from "next";
import Image from "next/image";

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
    //
    // lg 미만에서는 폼 아래로 사진이 쌓인다. 순서를 뒤집지 않는 이유는 이 화면에
    // 온 사람의 목적이 로그인이라서다 — 사진이 위로 가면 폼이 접힌 화면 밖으로 밀린다.
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-[32px] px-4 pb-[80px] pt-[32px] lg:flex-row lg:gap-[45px] lg:px-0 lg:pb-[120px] lg:pt-[58px]">
      <LoginForm />

      {/* Figma Frame 1564 (435x307).

          플레이스홀더였을 때는 lg 미만에서 감췄지만(회색 상자가 "안 불러와진
          영역"으로 읽혔다), 실제 사진이 들어왔으므로 모바일에서도 보여 준다.
          비율은 시안의 435:307 로 고정하고 사진은 object-cover 로 채운다 —
          원본이 3:2 라 그대로 두면 폼과 세로 균형이 어긋난다. */}
      <div className="relative aspect-[435/307] w-full shrink-0 overflow-hidden rounded-card lg:h-[307px] lg:w-[435px]">
        <Image
          src="/images/login-church.webp"
          alt="열린교회 본당 전경"
          fill
          // 가변 폭이므로 sizes 를 명시한다 (CLAUDE.md "반응형").
          // lg 이상에서는 435px 고정, 그 아래는 뷰포트 폭에서 좌우 패딩 32px 를 뺀 값.
          sizes="(min-width: 1024px) 435px, calc(100vw - 32px)"
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
