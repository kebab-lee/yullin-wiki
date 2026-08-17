"use client";

import Image from "next/image";
import Link from "next/link";

import AuthActionButton from "@/components/common/AuthActionButton";
import { useViewerRole } from "@/lib/auth/viewerRoleClient";

/**
 * 놓이는 자리. **모양만 다르고 하는 일은 같다** (SearchInput 의 variant 와 같은 결).
 *
 *   light    흰 배경 위 — SiteHeader. 프로필 아이콘은 로그인했을 때만 나온다.
 *   onBrand  빨강 배경 위 — 홈 히어로(HeroHeaderBar). 아이콘이 **항상** 있고
 *            비로그인이면 /login 으로 간다 (시안 Frame 1349).
 */
type ViewerAuthActionsVariant = "light" | "onBrand";

/**
 * 헤더·히어로의 세션 의존 조각 — 프로필 링크 + 로그인/로그아웃 버튼.
 *
 * **헤더와 히어로가 이 한 벌을 공유한다.** 두 벌로 두면 로그인 표시 규칙이
 * 둘로 갈려서 한쪽만 고쳐지는 순간 홈과 나머지 페이지의 헤더가 달라진다
 * (CLAUDE.md "헤더와 히어로가 공유하는 조각은 common 에 두고 양쪽이 같은
 * 컴포넌트를 쓴다").
 *
 * **role 을 prop 으로 받지 않는다.** 받으면 그 값을 서버에서 읽어야 하고, 그
 * 순간 이 컴포넌트를 쓰는 모든 페이지가 다시 동적 렌더가 된다. 세션은 여기서
 * 직접 묻는다 (viewerRoleClient — 그 파일 주석에 왜 표시용인지 적혀 있다).
 *
 * ── 로딩 중에 화면이 튀지 않게 ──────────────────────────────
 * 답을 모르는 동안 **로그인한 모양**(아이콘 + 로그아웃 버튼)으로 자리를 잡고
 * `invisible` 로 감춘다. 가장 넓은 상태를 미리 깔아 두는 것이라 로그인 사용자는
 * 버튼이 제자리에서 나타나기만 하고, 비로그인으로 판명나면 상자가 줄어드는데
 * 이 묶음은 `justify-end` 로 오른쪽 끝에 고정돼 있어 로그인 버튼의 자리는
 * 그대로다. 높이(`min-h-11`)도 미리 잡으므로 헤더 줄 높이가 변하지 않는다.
 *
 * `invisible`(visibility:hidden)은 자리를 남기면서 클릭도 탭 이동도 막는다 —
 * `opacity-0` 이면 안 보이는 로그아웃 버튼이 눌린다.
 */
export default function ViewerAuthActions({
  variant = "light",
}: {
  variant?: ViewerAuthActionsVariant;
}) {
  const { role, ready } = useViewerRole();

  // 모르는 동안에는 로그인한 모양으로 그린다(자리잡기 전용). 어차피 감춰져
  // 있으므로 어떤 역할이든 상관없고, 넓은 쪽이면 된다.
  const shownRole = ready ? role : "USER";
  const isLoggedIn = shownRole !== "GUEST";

  return (
    <div
      className={[
        // 44px 은 모바일 터치 타깃 하한이자 **줄 높이의 예약분**이다
        // (CLAUDE.md "반응형"). lg 에서는 시안의 35px 로 돌아간다.
        "flex min-h-11 items-center justify-end gap-[10px] lg:h-[35px] lg:min-h-0",
        ready ? "" : "invisible",
      ].join(" ")}
      // 아직 모르는 동안에는 스크린리더에도 읽히지 않아야 한다 — 화면에 없는
      // "로그아웃"을 읽어 주면 안 된다.
      aria-hidden={ready ? undefined : true}
    >
      {variant === "onBrand" ? (
        // 히어로 — Figma Frame 1349. 아이콘이 항상 있고 목적지만 갈린다.
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
      ) : (
        // 헤더 — 비로그인에게는 프로필 아이콘을 주지 않는다. 갈 곳이 없다.
        isLoggedIn && (
          <Link
            href="/mypage"
            aria-label="마이페이지"
            className="flex size-11 shrink-0 items-center justify-center lg:size-[30px]"
          >
            <Image src="/icons/profile.svg" alt="" width={30} height={30} />
          </Link>
        )
      )}

      <AuthActionButton role={shownRole} variant={variant} />
    </div>
  );
}
