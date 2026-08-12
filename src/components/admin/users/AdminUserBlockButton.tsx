"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmDialog from "@/components/common/ConfirmDialog";
import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import type { UserStatus } from "@/lib/types";

type AdminUserBlockButtonProps = {
  userId: string;
  status: UserStatus;
  /**
   * 값이 있으면 버튼을 잠그고 이 문구를 이유로 보여준다.
   *
   * **`disabled` boolean 대신 이유를 받는다** — 눌리지 않는 컨트롤만 두면 화면이
   * "왜 안 되는가"에 답하지 못한다 (AdminUserRoleSelect 와 같은 규칙). 이유는
   * 호출부가 정한다: 본인인가·관리자인가·탈퇴 계정인가는 표가 아는 사실이다.
   */
  lockedReason?: string;
};

/**
 * 목록 한 줄의 차단 · 차단 해제 버튼.
 *
 * ── 이 버튼이 이제 존재하는 이유 ────────────────────────────
 * 지난 슬라이스에서는 일부러 만들지 않았다. 확인 팝업(1:2516)이 약속하는 것은
 * "댓글 기능이 제한됩니다" 인데, 당시 users.status = BLOCKED 가 실제로 하는
 * 일은 **로그인 차단**이어서 문구와 효과가 어긋났기 때문이다.
 *
 * 이번에 그 어긋남을 없앴다 — 로그인 판정은 탈퇴만 막고(auth/accountStatus 의
 * canSignIn), BLOCKED 는 댓글 작성 한 곳에서만 걸린다(commentService). 이제
 * 팝업 문구가 실제로 일어나는 일과 같아서 버튼을 붙일 수 있다.
 *
 * 신고 관리 화면의 차단 버튼과 **같은 라우트·같은 규칙**을 쓴다
 * (`PATCH /api/admin/users/[id]/status`) — 두 화면이 각자 요청을 만들면 규칙이
 * 두 벌이 된다.
 *
 * **표시용 잠금이라는 점은 변하지 않는다.** 진짜 차단은
 * userService.changeUserStatus 의 assertRole·자기 자신·ADMIN·탈퇴 규칙이 한다.
 *
 * 응답의 status 를 상태로 들고 있지 않고 목록을 다시 그린다. 이 줄만 갱신하면
 * 상태 필터(`?status=ACTIVE`)가 걸린 목록에서 방금 차단한 사람이 조건에 안
 * 맞는데도 자리에 남고, 전체 건수·페이지 수도 어긋난다 (AdminUserRoleSelect 와
 * 같은 근거).
 */
export default function AdminUserBlockButton({
  userId,
  status,
  lockedReason,
}: AdminUserBlockButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBlocked = status === "BLOCKED";

  const handleConfirm = async () => {
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isBlocked ? "ACTIVE" : "BLOCKED" }),
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        setError(body.message);
        setPending(false);
        return;
      }

      setOpen(false);
      setPending(false);
      router.refresh();
    } catch {
      setError(NETWORK_ERROR);
      setPending(false);
    }
  };

  const reasonId = lockedReason ? `block-${userId}-reason` : undefined;

  return (
    <div className="flex flex-col items-end gap-[4px]">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={lockedReason !== undefined}
        aria-describedby={reasonId}
        className={[
          // 44px 터치 타깃. lg 에서는 표 행이 낮아 32px 로 줄인다
          // (AdminUserRoleSelect 와 같은 규격).
          "h-11 whitespace-nowrap rounded-pill border px-[14px] text-[14px] leading-[18px] lg:h-[32px]",
          "transition-colors",
          isBlocked
            ? "border-brand-red text-brand-red hover:bg-brand-red hover:text-white"
            : "border-gray2 text-gray4 hover:border-brand-red hover:text-brand-red",
          "disabled:cursor-not-allowed disabled:border-gray2 disabled:text-gray3 disabled:hover:bg-transparent disabled:hover:text-gray3",
        ].join(" ")}
      >
        {isBlocked ? "차단 해제" : "차단"}
      </button>

      {lockedReason && (
        <p id={reasonId} className="text-[12px] leading-[16px] text-gray3">
          {lockedReason}
        </p>
      )}

      {error && !open && (
        <p role="alert" className="text-[12px] leading-[16px] text-brand-red">
          {error}
        </p>
      )}

      {open && (
        <ConfirmDialog
          // 해제에는 시안 문구가 없다. 차단(1:2516)과 같은 형식으로 맞춘다.
          title={
            isBlocked
              ? "차단을 해제하시겠습니까?"
              : "사용자를 차단하시겠습니까?"
          }
          description={
            isBlocked
              ? "차단을 해제하면 다시 댓글을 작성할 수 있습니다."
              : "차단된 사용자는 댓글 기능이 제한됩니다."
          }
          confirmLabel={isBlocked ? "차단 해제" : "차단"}
          pendingLabel="처리 중..."
          pending={pending}
          error={error}
          onClose={() => {
            if (pending) return;
            setOpen(false);
            setError(null);
          }}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
