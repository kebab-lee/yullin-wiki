import Link from "next/link";

import AuthActionButton from "@/components/common/AuthActionButton";
import type { ViewerRole } from "@/lib/types";

/**
 * 홈 히어로 안의 헤더바 — Figma Home(1:318) > Frame 1304 (x=316 y=79, 880x50).
 *
 * 홈에는 Header(1:433) 인스턴스가 없고 이 바가 헤더 역할을 겸한다.
 * 그래서 (site) route group 의 SiteHeader 가 아니라 홈 페이지가 직접 렌더한다.
 *
 * 레이아웃: 상단 행 35px · 15px 아래 1px 라인.
 *
 * **자기 위치를 스스로 정하지 않는다.** 예전에는 `absolute top-[79px] w-hero` 로
 * 시안 좌표를 직접 들고 있었는데, 그러면 폭이 줄어도 값이 그대로라 좁은 화면에서
 * 히어로 밖으로 삐져나간다. 지금은 흐름 위의 한 줄이고 상단 여백(79px)과 좌우
 * 인셋(40px → 내부 폭 800)은 히어로 컨테이너(src/app/page.tsx)가 준다.
 */
export default function HeroHeaderBar({ role }: { role: ViewerRole }) {
  const isLoggedIn = role !== "GUEST";

  return (
    <div className="flex w-full flex-col gap-[15px]">
      {/* Figma Frame 1303 — 800x35 */}
      <div className="flex h-[35px] items-center justify-between">
        <p className="text-[15px] leading-[22px] text-brand-red-pink">
          예배의 감격이 있는 열린교회
        </p>

        {/* Figma Frame 1349 — 아이콘 30px + 10px + 버튼 */}
        <div className="flex h-[35px] items-center gap-[10px]">
          <Link
            href={isLoggedIn ? "/mypage" : "/login"}
            aria-label={isLoggedIn ? "마이페이지" : "로그인"}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white lg:size-[30px]"
          >
            <svg width="14" height="18" viewBox="0 0 14 18" fill="none" aria-hidden>
              <circle cx="7" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M1 17C1 13.6863 3.68629 11 7 11C10.3137 11 13 13.6863 13 17"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </Link>

          <AuthActionButton role={role} variant="onBrand" />
        </div>
      </div>

      {/* Figma Line 1 — y=50, 폭 800 (좌우 40px 인셋 안쪽) */}
      <div className="h-px w-full bg-white/40" />
    </div>
  );
}
