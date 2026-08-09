"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import type { Role } from "@/lib/types";
import { ROLES } from "@/lib/types";

import { ROLE_LABEL } from "./labels";

type AdminUserRoleSelectProps = {
  userId: string;
  role: Role;
  /**
   * 값이 있으면 셀렉트를 잠그고 이 문구를 이유로 보여준다.
   *
   * **`disabled` 라는 boolean 대신 이유를 받는다.** 눌리지 않는 컨트롤만 두면
   * 화면이 "왜 안 되는가"에 답하지 못하고, 본인 행에서 그 답은 반드시 있어야 한다
   * (관리자가 자기를 강등하려다 막히는 것은 버그처럼 보이는 정상 동작이다).
   * 이유는 호출부가 정한다 — 본인인가·탈퇴 계정인가는 표가 아는 사실이다.
   */
  lockedReason?: string;
};

/**
 * 목록 한 줄의 역할 셀렉트.
 *
 * **표시용 잠금이라는 점은 변하지 않는다.** 셀렉트를 잠그는 것은 실수를 줄일
 * 뿐이고, 진짜 차단은 userService.changeUserRole 의 assertRole·자기 자신 금지·
 * 탈퇴 계정 규칙이 한다 — API 는 이 화면을 거치지 않고 직접 호출된다
 * (AdminPageStatusActions 와 같은 규칙).
 *
 * 응답의 role 을 상태로 들고 있지 않고 목록을 다시 그린다. 이 줄만 갱신하면
 * 역할 필터(`?role=USER`)가 걸린 목록에서 방금 승격한 사람이 조건에 안 맞는데도
 * 자리에 남고, 전체 건수·페이지 수도 어긋난다. 목록의 정본은 서버다.
 */
export default function AdminUserRoleSelect({
  userId,
  role,
  lockedReason,
}: AdminUserRoleSelectProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeRole = async (next: string) => {
    if (pending || next === role) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        setError(body.message);
        setPending(false);
        return;
      }

      router.refresh();
      setPending(false);
    } catch {
      setError(NETWORK_ERROR);
      setPending(false);
    }
  };

  const selectId = `role-${userId}`;
  const reasonId = lockedReason ? `${selectId}-reason` : undefined;

  return (
    <div className="flex flex-col items-end gap-[4px]">
      <label htmlFor={selectId} className="sr-only">
        역할 변경
      </label>

      <select
        id={selectId}
        value={role}
        disabled={pending || lockedReason !== undefined}
        aria-describedby={reasonId}
        onChange={(e) => changeRole(e.target.value)}
        className={[
          // 44px 터치 타깃. lg 에서는 표 행이 낮아 32px 로 줄인다
          // (AdminPageStatusActions 의 버튼과 같은 규격).
          "h-11 w-full min-w-[104px] rounded-pill border border-gray2 px-[12px] lg:h-[32px]",
          "cursor-pointer bg-white text-[14px] leading-[18px] text-gray4 transition-colors",
          "hover:border-brand-red hover:text-brand-red",
          "disabled:cursor-not-allowed disabled:bg-brand-red-white disabled:hover:border-gray2 disabled:hover:text-gray4",
        ].join(" ")}
      >
        {ROLES.map((value) => (
          <option key={value} value={value}>
            {ROLE_LABEL[value]}
          </option>
        ))}
      </select>

      {lockedReason && (
        <p id={reasonId} className="text-[12px] leading-[16px] text-gray3">
          {lockedReason}
        </p>
      )}

      {error && (
        <p role="alert" className="text-[12px] leading-[16px] text-brand-red">
          {error}
        </p>
      )}
    </div>
  );
}
