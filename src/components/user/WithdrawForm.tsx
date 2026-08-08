"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import FieldMessage from "@/components/common/FieldMessage";
import TextField from "@/components/common/TextField";
import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";

/** 성공 알림 문구 — Figma 1:1424. */
const SUCCESS_MESSAGE = "계정이 삭제되었습니다 ✅";

type Step = "form" | "confirm" | "done";

/**
 * 탈퇴 폼 — Figma 탈퇴하기 1:1163 (Frame 1494, 537x245).
 *
 * **아이디를 입력받지만 그 값으로 대상을 고르지는 않는다.** 지우는 대상은 언제나
 * 세션의 주인이고(서버가 세션 id 로 읽는다), 이 칸은 "정말 이 계정을 지울
 * 생각인가"를 되묻는 확인 절차다. 그래서 일치 판정도 클라이언트가 하지 않는다 —
 * 여기서 미리 맞춰보면 남의 계정 아이디를 넣어보며 존재 여부를 훑을 수 있다.
 * 화면이 막는 것은 "빈 칸"까지이고, 대조는 서버가 한다.
 *
 * 제출 → 확인 팝업(Figma 1:1412) → 성공 알림(1:1424) → 홈.
 * 팝업에서 아이디를 한 번 더 받지 않는다. 시안의 팝업은 게시물 삭제용이라
 * 그 화면에는 입력 칸이 없었지만, 여기서는 바로 위 폼에 이미 같은 값을 적었다 —
 * 같은 값을 두 번 적게 하는 것은 확인을 더해주지 않고 오타만 늘린다.
 */
export default function WithdrawForm({ loginId }: { loginId: string }) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [confirmLoginId, setConfirmLoginId] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 시안의 활성 조건 그대로다 — 아이디를 적었고 동의했는가.
  // 값이 맞는지는 판정하지 않는다 (위 주석 참조).
  const canSubmit = confirmLoginId.trim().length > 0 && agreed;

  const handleWithdraw = async () => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmLoginId }),
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        // 아이디 불일치는 입력 칸에 붙는 문구다. 고칠 자리가 폼이므로 되돌린다.
        setError(body.fields?.confirmLoginId ?? body.message);
        setStep("form");
        return;
      }

      setStep("done");
    } catch {
      setError(NETWORK_ERROR);
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  /** 성공 알림을 닫으면 홈으로. 세션 쿠키는 서버가 이미 만료시켰다. */
  const handleDone = () => {
    router.push("/");
    // 헤더가 서버 컴포넌트라 라우터 캐시에 로그인 상태가 남아 있다. 버려야
    // 로그아웃된 헤더가 그려진다.
    router.refresh();
  };

  return (
    // Figma Frame 1494 (537x245)
    <div className="w-full min-w-0 lg:w-[537px] lg:shrink-0">
      <h2 className="text-[15px] font-medium leading-[18px] text-black">
        계정 삭제하기
      </h2>
      {/* Figma: y=36 구분선 */}
      <hr className="mt-[18px] border-t border-gray2" />

      {/* 아이디 입력 254x30 */}
      <div className="mt-[15px] w-full lg:w-[254px]">
        <TextField
          label="아이디"
          name="confirmLoginId"
          value={confirmLoginId}
          onChange={(value) => {
            setConfirmLoginId(value);
            setError(null);
          }}
          placeholder={loginId}
          autoComplete="off"
          size="sm"
        />
      </div>

      {/* Figma Frame 1538 (y=45): 라벨 87 + 안내·체크박스 407 */}
      <div className="mt-[45px] flex flex-col gap-[8px] lg:flex-row lg:items-start lg:gap-0">
        <span className="w-full text-[14px] lg:w-[87px] lg:shrink-0 font-medium leading-[17px] text-black">
          계정삭제 동의
        </span>

        <div className="w-full min-w-0 lg:w-[407px] lg:shrink-0">
          <p className="text-[14px] font-light leading-[22px] text-gray4">
            계정 삭제를 진행하면 계정 복구는 불가능합니다.
            <br />
            {/* 되돌릴 수 없는 결과 중에서도 사용자가 가장 놓치기 쉬운 항목이라
                굵게 둔다. strong 은 시각 효과가 아니라 의미다. */}
            <strong className="font-bold text-black">
              탈퇴한 아이디는 다시 사용할 수 없습니다.
            </strong>
            <br />
            작성하신 문서와 댓글은 삭제되지 않고 남습니다.{" "}
            <Link
              href="/policy"
              className="text-brand-red underline underline-offset-2"
            >
              자세히 보기
            </Link>
            <br />
            이에 동의하시면 아래 체크박스에 체크하고 계정 삭제를 진행해주세요.
          </p>

          {/* Figma: y=50, 103x30 */}
          <label className="mt-[20px] flex h-11 items-center gap-[8px] lg:h-[30px] text-[14px] font-normal leading-[17px] text-black">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="size-[20px] shrink-0 accent-brand-red lg:size-[16px]"
            />
            동의합니다
          </label>
        </div>
      </div>

      {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}

      {/* Figma: x=206 y=155, 125x36 */}
      <div className="mt-[20px] lg:pl-[206px]">
        <button
          type="button"
          onClick={() => setStep("confirm")}
          disabled={!canSubmit}
          className="h-11 w-full rounded-badge lg:h-[36px] lg:w-[125px] bg-brand-red text-[14px] font-medium leading-[17px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          계정 삭제하기
        </button>
      </div>

      {step === "confirm" && (
        // Figma 1:1412 (639x324) — 게시물 삭제 팝업과 같은 구조를 계정용 문구로 쓴다.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-dialog-title"
        >
          <div className="w-full max-w-[500px] rounded-[16px] bg-white p-[28px]">
            <h2
              id="withdraw-dialog-title"
              className="text-[18px] font-bold leading-[22px] text-black"
            >
              계정 삭제 버튼을 누르셨습니다
            </h2>
            <p className="mt-[10px] text-[14px] font-light leading-[22px] text-gray4">
              계정 삭제를 진행하면 되돌릴 수 없습니다.
              <br />
              정말 <strong className="font-bold text-black">
                {confirmLoginId}
              </strong>{" "}
              계정을 삭제하시겠습니까?
            </p>

            <div className="mt-[20px] flex justify-end gap-[10px]">
              <button
                type="button"
                onClick={() => setStep("form")}
                disabled={submitting}
                className="rounded-full border border-gray2 px-[20px] py-[8px] text-[14px] text-gray3 transition-colors hover:border-brand-red hover:text-brand-red disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={submitting}
                className="rounded-full bg-brand-red px-[24px] py-[8px] text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {submitting ? "삭제 중..." : "계정 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "done" && (
        // Figma 1:1424 (500x222)
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-done-title"
        >
          <div className="w-full max-w-[500px] rounded-[16px] bg-white p-[28px]">
            <p
              id="withdraw-done-title"
              role="status"
              className="text-[15px] font-medium leading-[22px] text-black"
            >
              {SUCCESS_MESSAGE}
            </p>

            <div className="mt-[20px] flex justify-end">
              <button
                type="button"
                onClick={handleDone}
                autoFocus
                className="rounded-full bg-brand-red px-[24px] py-[8px] text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
