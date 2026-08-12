"use client";

/**
 * 확인 팝업 (Figma 1:2500 / 1:2508 / 1:2516 — 전부 500x222 계열)
 *
 * ── 셋을 한 컴포넌트로 두는 이유 ────────────────────────────
 * 시안의 세 팝업(댓글 삭제 · 신고 무시 · 사용자 차단)은 **문구와 버튼 이름만
 * 다르고 구조가 같다.** 각각을 파일로 만들면 규격을 하나 고칠 때 세 곳을 맞춰야
 * 하고 결국 어긋난다 (AdminUserList 가 두 화면을 한 컴포넌트로 둔 것과 같은
 * 근거). 다른 것은 밖에서 받는다.
 *
 * ── DeletePageDialog 와 나눠 두는 이유 ──────────────────────
 * 저쪽은 **제목을 그대로 옮겨 적어야** 통과한다. 위키 문서는 소유권을 보지 않아
 * 남의 글도 지울 수 있고 되돌릴 수 없어서 일부러 둔 한 겹이다. 여기 셋은 그
 * 절차가 없다 — 확인 문구만으로 충분한 조작이다:
 *   · 댓글 삭제 — 대상이 눈앞의 한 줄이고 본문이 목록에 그대로 보인다.
 *   · 신고 무시 — 아무것도 파괴하지 않는다.
 *   · 사용자 차단 — 되돌릴 수 있다 (해제 버튼이 같은 자리에 있다).
 * 한 컴포넌트로 합치면 확인 강도의 이 차이가 사라지고, 결국 더 위험한 조작에
 * 더 약한 확인이 붙는 쪽으로 끌려간다.
 *
 * 여기서 막는 것은 실수이지 권한이 아니다. 권한은 reportService·userService 가
 * 판정하고, 이 팝업을 건너뛰고 API 를 직접 불러도 그쪽에서 막힌다.
 */
type ConfirmDialogProps = {
  title: string;
  /** 제목 아래 보조 설명. 차단 팝업(1:2516)에만 있다. */
  description?: string;
  /** 확인 버튼의 이름. 시안이 조작마다 다르게 적어 둔 값이다 (삭제/무시/차단). */
  confirmLabel: string;
  /** 진행 중 문구. 버튼이 눌린 뒤의 이름. */
  pendingLabel: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* 시안 500x222. 375px 에서는 좌우 패딩 안으로 접힌다. */}
      <div className="w-full max-w-[500px] rounded-[16px] bg-white p-[28px]">
        <h2
          id="confirm-dialog-title"
          className="text-[18px] font-bold leading-[26px] text-black"
        >
          {title}
        </h2>

        {description && (
          <p className="mt-[10px] text-[14px] leading-[22px] text-gray4">
            {description}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-[12px] text-[13px] text-brand-red">
            {error}
          </p>
        )}

        <div className="mt-[24px] flex justify-end gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="min-h-11 rounded-full border border-gray2 px-[20px] text-[14px] text-gray3 transition-colors hover:border-brand-red hover:text-brand-red disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="min-h-11 rounded-full bg-brand-red px-[24px] text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
