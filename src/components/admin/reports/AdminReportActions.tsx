"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import type { AdminReportSummary } from "@/lib/types";

import ConfirmDialog from "@/components/common/ConfirmDialog";

type AdminReportActionsProps = {
  report: AdminReportSummary;
};

/**
 * 어느 확인 팝업이 열려 있는가. **boolean 셋 대신 하나의 상태값이다** —
 * 셋으로 두면 둘이 동시에 true 인 상태가 표현 가능해지고, 실제로 그렇게 되면
 * 팝업이 겹쳐 그려진다 (CLAUDE.md "상태 플래그 난립 금지"와 같은 결).
 */
type OpenDialog = "delete" | "ignore" | "block" | null;

/**
 * 신고 한 건의 처리 버튼 셋 (Figma AdReport 1:2213).
 *
 * ── 세 액션이 두 개의 라우트로 갈린다 ───────────────────────
 * · 댓글 삭제 / 신고 무시 → `PATCH /api/admin/reports/[id]` (신고 종결)
 * · 사용자 차단          → `PATCH /api/admin/users/[id]/status` (계정 상태)
 *
 * 차단이 신고 종결과 갈려 있는 것이 의도다. 차단은 신고를 끝내는 조작이 아니라
 * 별개의 조치이고 — "차단하되 이 댓글은 남긴다"가 정상적인 처리다 — 사용자
 * 관리 화면의 차단 버튼과 같은 규칙을 써야 한다. 한 요청에 묶으면 규칙이 두
 * 벌이 된다 (근거는 validation/report 의 REPORT_ACTIONS 주석).
 *
 * **표시용 판정이라는 점은 변하지 않는다.** 처리된 신고에서 버튼을 감추는 것은
 * 실수를 줄일 뿐이고, 진짜 차단은 reportService 의 assertRole·PENDING 확인과
 * userService 의 자기 자신·ADMIN·탈퇴 규칙이 한다 — API 는 이 화면을 거치지
 * 않고 직접 호출된다 (AdminUserRoleSelect 와 같은 규칙).
 *
 * 성공 후 이 줄만 갱신하지 않고 목록을 다시 그린다(router.refresh). 상태 필터
 * (`?status=PENDING`)가 걸린 목록에서 방금 처리한 신고가 조건에 안 맞는데도
 * 자리에 남고, 전체 건수·페이지 수도 어긋나기 때문이다. 목록의 정본은 서버다.
 */
export default function AdminReportActions({
  report,
}: AdminReportActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState<OpenDialog>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHandled = report.status !== "PENDING";
  const isBlocked = report.authorStatus === "BLOCKED";
  // 이미 지워진 댓글에는 삭제 버튼을 그리지 않는다. 다른 관리자가 먼저 지웠거나
  // 작성자가 스스로 거둔 경우다 — service 는 그때도 신고를 종결시켜 주지만
  // (목록에 영영 남지 않도록), 버튼 이름이 실제로 일어나는 일과 달라진다.
  const canDeleteComment = report.commentStatus === "VISIBLE";
  // 탈퇴한 계정은 차단할 수 없다 (userService.changeUserStatus 의 규칙).
  const canBlock = report.authorStatus !== "WITHDRAWN";

  const send = async (url: string, body: unknown) => {
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await readErrorBody(response);
        setError(errorBody.message);
        setPending(false);
        return;
      }

      setOpen(null);
      setPending(false);
      router.refresh();
    } catch {
      setError(NETWORK_ERROR);
      setPending(false);
    }
  };

  const close = () => {
    if (pending) return;
    setOpen(null);
    setError(null);
  };

  const buttonClass = [
    // 44px 터치 타깃. lg 에서는 행이 낮아 32px 로 줄인다
    // (AdminUserRoleSelect 와 같은 규격).
    "min-h-11 rounded-pill border border-gray2 px-[14px] text-[14px] leading-[18px] text-gray4",
    "transition-colors hover:border-brand-red hover:text-brand-red lg:min-h-[32px]",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray2 disabled:hover:text-gray4",
  ].join(" ");

  return (
    <div className="flex flex-wrap items-center gap-[8px]">
      {!isHandled && (
        <>
          <button
            type="button"
            onClick={() => setOpen("delete")}
            disabled={!canDeleteComment}
            className={buttonClass}
          >
            댓글 삭제
          </button>

          <button
            type="button"
            onClick={() => setOpen("ignore")}
            className={buttonClass}
          >
            신고 무시
          </button>
        </>
      )}

      {/* 차단은 처리 여부와 무관하게 그린다 — 신고를 종결한 뒤에도 작성자에
          대한 조치는 따로 필요할 수 있다. 이미 차단됐으면 해제 버튼이 된다. */}
      <button
        type="button"
        onClick={() => setOpen("block")}
        disabled={!canBlock}
        className={buttonClass}
      >
        {isBlocked ? "차단 해제" : "사용자 차단"}
      </button>

      {error && !open && (
        <p role="alert" className="w-full text-[13px] text-brand-red">
          {error}
        </p>
      )}

      {open === "delete" && (
        <ConfirmDialog
          title="댓글을 삭제하시겠습니까?"
          confirmLabel="삭제"
          pendingLabel="삭제 중..."
          pending={pending}
          error={error}
          onClose={close}
          onConfirm={() =>
            send(`/api/admin/reports/${report.id}`, {
              action: "DELETE_COMMENT",
            })
          }
        />
      )}

      {open === "ignore" && (
        <ConfirmDialog
          title="신고를 무시하시겠습니까?"
          confirmLabel="무시"
          pendingLabel="처리 중..."
          pending={pending}
          error={error}
          onClose={close}
          onConfirm={() =>
            send(`/api/admin/reports/${report.id}`, { action: "IGNORE" })
          }
        />
      )}

      {open === "block" && (
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
          onClose={close}
          onConfirm={() =>
            send(`/api/admin/users/${report.authorId}/status`, {
              status: isBlocked ? "ACTIVE" : "BLOCKED",
            })
          }
        />
      )}
    </div>
  );
}
