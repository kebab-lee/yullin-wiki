"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { setViewerRole } from "@/lib/auth/viewerRoleClient";
import type { ViewerRole } from "@/lib/types";

type AuthActionButtonProps = {
  role: ViewerRole;
  /**
   * 배경에 따른 외형.
   * - `light` : 흰 배경 위 (SiteHeader) — 연두 pill
   * - `onBrand`: 빨강 배경 위 (홈 히어로) — 흰 테두리 + 흰 글자
   */
  variant?: "light" | "onBrand";
};

const VARIANT_CLASS = {
  light:
    "bg-category-green-light px-[10px] py-[8px] text-[13px] font-normal leading-[14px] text-category-green-dark",
  onBrand:
    "border border-white px-[10px] py-[7px] text-[14px] font-medium leading-[15px] text-white",
} as const;

/**
 * `min-h-11`(44px)은 모바일 터치 타깃 하한이다 (CLAUDE.md "반응형").
 * lg 부터는 0 으로 풀어서 시안의 pill 높이(패딩만으로 결정)를 그대로 둔다.
 */
const BASE_CLASS =
  "flex min-h-11 flex-col items-center justify-center whitespace-nowrap rounded-pill lg:min-h-0";

/**
 * 로그인 / 로그아웃 액션 버튼.
 *
 * SiteHeader(유저·관리자 헤더)와 홈 히어로 헤더바가 공유한다.
 * 이동 대상과 라벨을 결정하는 규칙은 여기 한 곳에만 둔다.
 *
 * 로그아웃은 링크가 아니라 POST 다 — 세션 쿠키를 지우는 상태 변경이라
 * 프리페치나 이미지 태그로 남이 트리거할 수 있으면 안 된다. 그래서 이 조각만
 * 클라이언트 컴포넌트이고, 헤더 자체는 서버 컴포넌트로 남는다.
 */
export default function AuthActionButton({
  role,
  variant = "light",
}: AuthActionButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const className = `${BASE_CLASS} ${VARIANT_CLASS[variant]}`;

  if (role === "GUEST") {
    return (
      <Link href="/login" className={className}>
        로그인
      </Link>
    );
  }

  const handleLogout = async () => {
    if (pending) return;

    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });

      // 쿠키가 사라졌다는 사실을 헤더에도 알린다. 헤더는 이제 서버가 아니라
      // 브라우저의 캐시된 role 을 보고 그리므로(viewerRoleClient), 이걸
      // 빠뜨리면 로그아웃했는데 로그아웃 버튼이 그대로 남는다.
      // /api/auth/me 를 다시 묻지 않는 것은 답을 이미 알기 때문이다.
      setViewerRole("GUEST");

      router.push("/");
      // 서버 컴포넌트가 세션으로 그리는 것들(마이페이지 등)의 라우터 캐시를
      // 버린다. 헤더는 위에서 이미 처리됐다.
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className={`${className} disabled:opacity-50`}
    >
      로그아웃
    </button>
  );
}
