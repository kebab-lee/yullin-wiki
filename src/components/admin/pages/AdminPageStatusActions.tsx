"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import type { PageStatus } from "@/lib/types";
import { allowedTransitions } from "@/lib/validation/pageStatus";

import { PAGE_STATUS_ACTION_LABEL } from "./statusLabel";

type AdminPageStatusActionsProps = {
  pageId: string;
  status: PageStatus;
};

/**
 * 목록 한 줄의 상태 전환 버튼 (DRAFT → 공개 / PUBLISHED → 숨김 / HIDDEN → 공개)
 *
 * **허용되지 않는 전환은 아예 렌더링하지 않는다.** disabled 로 남겨 두지 않는
 * 이유: 눌리지 않는 버튼이 세 칸씩 늘어서면 목록이 무엇을 할 수 있는 화면인지
 * 읽히지 않고, "왜 안 눌리는가"라는 질문에 화면이 답하지 못한다.
 *
 * 어떤 전환이 가능한지를 **여기서 판단하지 않는다.** 규칙은 전환표
 * (validation/pageStatus)가 갖고 이 컴포넌트는 allowedTransitions 로 물어보기만
 * 한다. `status === 'DRAFT' ? … : …` 로 적으면 서버가 400 으로 거절할 조합을
 * 화면이 버튼으로 내주는 어긋남이 생긴다. 같은 함수를 서버(transition)와
 * 클라이언트가 함께 쓰는 것은 검증 규칙 공유의 원칙 그대로다.
 *
 * **표시용 판정이라는 점은 변하지 않는다.** 버튼을 안 그리는 것은 실수를 줄일
 * 뿐이고, 진짜 차단은 pageService.changePageStatus 의 assertRole 과 canTransition
 * 이 한다 — API 는 이 화면을 거치지 않고 직접 호출된다.
 */
export default function AdminPageStatusActions({
  pageId,
  status,
}: AdminPageStatusActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeStatus = async (to: PageStatus) => {
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/pages/${pageId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: to }),
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        setError(body.message);
        setPending(false);
        return;
      }

      // 응답의 status 를 상태로 들고 있지 않고 목록을 다시 그린다. 이 줄만
      // 갱신하면 상태 필터(`?status=DRAFT`)가 걸린 목록에서 방금 공개한 글이
      // 조건에 안 맞는데도 자리에 남아 있게 되고, 전체 건수·페이지 수도
      // 어긋난다. 목록의 정본은 서버다.
      router.refresh();
      setPending(false);
    } catch {
      setError(NETWORK_ERROR);
      setPending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-[6px]">
      {allowedTransitions(status).map((to) => (
        <button
          key={to}
          type="button"
          onClick={() => changeStatus(to)}
          disabled={pending}
          className={[
            // 44px 터치 타깃. lg 에서는 표 행이 낮아 32px 로 줄인다.
            "h-11 shrink-0 rounded-pill border border-brand-red px-[14px] lg:h-[32px]",
            "text-[14px] font-bold leading-[18px] text-brand-red transition-colors",
            "hover:bg-brand-red hover:text-white disabled:opacity-40",
          ].join(" ")}
        >
          {pending ? "처리 중..." : PAGE_STATUS_ACTION_LABEL[to]}
        </button>
      ))}

      {error && (
        <p role="alert" className="w-full text-right text-[13px] text-brand-red">
          {error}
        </p>
      )}
    </div>
  );
}
