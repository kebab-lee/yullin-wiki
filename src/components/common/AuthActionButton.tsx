"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
      // 쿠키가 사라졌으니 서버 컴포넌트(헤더)를 다시 그려야 GUEST 로 돌아간다.
      router.push("/");
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
