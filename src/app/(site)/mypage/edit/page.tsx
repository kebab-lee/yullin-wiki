import type { Metadata } from "next";

import ProfileEditForm from "@/components/user/ProfileEditForm";
import { fetchApiAsUser } from "@/lib/api/serverFetch";
import type { MyProfileBody } from "@/lib/api/types";
import { requireAuth } from "@/lib/auth/requireAuth";

export const metadata: Metadata = {
  title: "회원정보 수정 - 열린위키",
};

export const dynamic = "force-dynamic";

/**
 * 회원정보 수정 — `/mypage/edit` (Figma 1:1146).
 *
 * 가드를 조회 화면과 **따로** 부른다. 형제 라우트끼리는 layout 을 공유해도
 * 가드가 상속되지 않는다 (CLAUDE.md "권한").
 *
 * 좌측 인사말 블록은 조회 화면과 같은 자리지만 컴포넌트로 빼지 않았다 —
 * 지금은 이름 두 줄이 전부이고, 공유 조각으로 만들면 두 화면 중 하나가
 * 바뀔 때 조건 분기가 그 안으로 들어간다.
 */
export default async function MyPageEdit() {
  await requireAuth();

  const { user } = await fetchApiAsUser<MyProfileBody>("/api/users/me");

  return (
    // lg 미만에서는 인사말 위 · 폼 아래로 쌓는다 (조회·탈퇴 화면과 같은 배치).
    <div className="mx-auto flex w-full max-w-hero flex-col gap-[24px] px-4 pb-[80px] pt-[32px] lg:flex-row lg:gap-[90px] lg:px-0 lg:pb-[120px] lg:pt-[79px]">
      <div className="w-full lg:w-[195px] lg:shrink-0">
        <p className="text-[32px] font-extrabold leading-[45px] text-black">
          {user.name ?? "-"}님,
        </p>
        <p className="text-[32px] font-normal leading-[45px] text-black">
          안녕하세요
        </p>
      </div>

      <ProfileEditForm user={user} />
    </div>
  );
}
