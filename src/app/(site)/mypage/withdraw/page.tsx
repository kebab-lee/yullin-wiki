import type { Metadata } from "next";

import WithdrawForm from "@/components/user/WithdrawForm";
import { fetchApiAsUser } from "@/lib/api/serverFetch";
import type { MyProfileBody } from "@/lib/api/types";
import { requireAuth } from "@/lib/auth/requireAuth";

export const metadata: Metadata = {
  title: "계정 삭제 - 열린위키",
};

export const dynamic = "force-dynamic";

/**
 * 탈퇴 — `/mypage/withdraw` (Figma 탈퇴하기 1:1163).
 *
 * 가드를 이 페이지에서 직접 부른다. `/mypage` 와 형제라 layout 을 공유하지만
 * 형제 간 클라이언트 사이드 이동에서는 layout 이 재실행되지 않는다
 * (CLAUDE.md "권한"). 화면 차단일 뿐이고, 데이터 차단은 userService.withdrawMe 의
 * assertAuthenticated 가 따로 한다.
 *
 * 좌측 인사말 블록은 조회·수정 화면과 같은 자리지만 컴포넌트로 빼지 않았다 —
 * 문구가 화면마다 다르고(여기서는 "만나서 반가웠어요"), 공유 조각으로 만들면
 * 조건 분기가 그 안으로 들어간다 (`/mypage/edit` 와 같은 판단).
 */
export default async function WithdrawPage() {
  await requireAuth();

  const { user } = await fetchApiAsUser<MyProfileBody>("/api/users/me");

  return (
    // Figma Frame 1499: x=316 y=210, 880x245.
    // lg 미만에서는 인사말 위 · 본문 아래로 쌓는다 (조회·수정 화면과 같은 배치).
    <div className="mx-auto flex w-full max-w-hero flex-col gap-[24px] px-4 pb-[80px] pt-[32px] lg:flex-row lg:gap-[90px] lg:px-0 lg:pb-[120px] lg:pt-[79px]">
      {/* Figma Frame 1500 (195x150) */}
      <div className="w-full lg:w-[195px] lg:shrink-0">
        <p className="text-[32px] font-extrabold leading-[45px] text-black">
          {user.name ?? "-"}님,
        </p>
        <p className="text-[32px] font-normal leading-[45px] text-black">
          만나서 반가웠어요
        </p>
      </div>

      {/* 관리자는 스스로 탈퇴할 수 없다 — 판정의 정본은 userService.withdrawMe 이고
          여기서는 실패할 폼을 그리지 않을 뿐이다. 화면 가드와 데이터 가드는
          서로를 대체하지 않는다 (CLAUDE.md "권한"). */}
      {user.role === "ADMIN" ? (
        <div className="w-full min-w-0 lg:w-[537px] lg:shrink-0">
          <h2 className="text-[15px] font-medium leading-[18px] text-black">
            계정 삭제하기
          </h2>
          <hr className="mt-[18px] border-t border-gray2" />
          <p className="mt-[15px] text-[14px] font-light leading-[22px] text-gray4">
            관리자 계정은 탈퇴할 수 없습니다. 문화팀으로 문의해주세요.
          </p>
        </div>
      ) : (
        <WithdrawForm loginId={user.loginId} />
      )}
    </div>
  );
}
