import Link from "next/link";
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
 * 로그인 / 로그아웃 액션 버튼.
 *
 * SiteHeader(유저·관리자 헤더)와 홈 히어로 헤더바가 공유한다.
 * 이동 대상과 라벨을 결정하는 규칙은 여기 한 곳에만 둔다 —
 * 인증이 붙으면 href만 실제 핸들러로 바꾸면 양쪽이 같이 따라온다.
 */
export default function AuthActionButton({
  role,
  variant = "light",
}: AuthActionButtonProps) {
  const isLoggedIn = role !== "GUEST";

  return (
    <Link
      href={isLoggedIn ? "/logout" : "/login"}
      className={`flex flex-col items-center justify-center whitespace-nowrap rounded-pill ${VARIANT_CLASS[variant]}`}
    >
      {isLoggedIn ? "로그아웃" : "로그인"}
    </Link>
  );
}
