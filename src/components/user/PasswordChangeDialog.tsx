"use client";

import { useState } from "react";

import FieldMessage from "@/components/common/FieldMessage";
import TextField from "@/components/common/TextField";
import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import {
  PASSWORD_HINT,
  validateCurrentPassword,
  validatePassword,
  validatePasswordConfirm,
} from "@/lib/validation/user";

type PasswordChangeDialogProps = {
  onClose: () => void;
};

/** 성공 알림 문구 — Figma 1:1259. */
const SUCCESS_MESSAGE = "비밀번호가 변경되었습니다 ✅";

type Step = "current" | "next" | "done";

/**
 * 비밀번호 변경 팝업 — Figma 1:1373(현재 확인) → 1:1385(새 비밀번호) → 1:1259(성공).
 *
 * **현재 비밀번호 확인용 엔드포인트를 따로 두지 않았다.** 1단계의 "확인" 버튼은
 * 서버를 부르지 않고 입력만 받아 2단계로 넘어가고, 대조는 마지막 제출 한 번에서
 * 일어난다. 확인 전용 API 를 만들면 "이 비밀번호가 맞는가"를 답해주는 창구가
 * 하나 더 생기는데, 그건 세션을 쥔 쪽에게 비밀번호를 무제한 시험하게 해주는
 * 것과 같다. 판정 지점은 변경 요청 하나로 유지한다.
 *
 * 대신 401 이 오면 1단계로 되돌린다 — 틀린 값은 현재 비밀번호이므로 사용자가
 * 고쳐야 할 칸도 그쪽이다.
 *
 * 형식 검증은 회원가입과 같은 함수를 쓴다 (validation/user.ts).
 */
export default function PasswordChangeDialog({
  onClose,
}: PasswordChangeDialogProps) {
  const [step, setStep] = useState<Step>("current");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [currentError, setCurrentError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** 1단계: 빈 값만 막고 넘어간다. 맞는지는 서버만 안다. */
  const handleConfirmCurrent = () => {
    const result = validateCurrentPassword(currentPassword);
    if (!result.valid) {
      setCurrentError(result.message);
      return;
    }

    setCurrentError(null);
    setStep("next");
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const format = validatePassword(newPassword);
    if (!format.valid) {
      setNewError(format.message);
      return;
    }

    const match = validatePasswordConfirm(newPasswordConfirm, newPassword);
    if (!match.valid) {
      setNewError(match.message);
      return;
    }

    setNewError(null);
    setFormError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const body = await readErrorBody(response);

        // 401 = 현재 비밀번호가 틀렸다. 고칠 칸이 1단계에 있으므로 되돌린다.
        if (response.status === 401) {
          setCurrentError(body.message);
          setCurrentPassword("");
          setStep("current");
          return;
        }

        // 400 = 새 비밀번호 쪽 문제(형식·현재와 동일). 필드 문구가 있으면 그걸 쓴다.
        setNewError(body.fields?.newPassword ?? null);
        if (!body.fields?.newPassword) setFormError(body.message);
        return;
      }

      setStep("done");
    } catch {
      setFormError(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-dialog-title"
    >
      <div className="w-full max-w-[400px] rounded-[16px] bg-white p-[28px]">
        <h2
          id="password-dialog-title"
          className="text-[18px] font-bold leading-[22px] text-black"
        >
          비밀번호 변경
        </h2>

        {step === "current" && (
          <>
            <p className="mt-[10px] text-[14px] font-light leading-[20px] text-gray4">
              본인 확인을 위해 현재 비밀번호를 입력해주세요.
            </p>

            {/* Figma 1:1373 — 입력 300x44 + 확인 버튼 72x48 */}
            <div className="mt-[16px] flex items-start gap-[8px]">
              <div className="flex-1">
                <TextField
                  label="현재 비밀번호"
                  name="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(value) => {
                    setCurrentPassword(value);
                    setCurrentError(null);
                  }}
                  autoComplete="current-password"
                />
              </div>
              <button
                type="button"
                onClick={handleConfirmCurrent}
                className="h-[44px] w-[72px] shrink-0 rounded-badge bg-brand-red text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                확인
              </button>
            </div>

            {currentError && (
              <FieldMessage tone="error">{currentError}</FieldMessage>
            )}
          </>
        )}

        {step === "next" && (
          <>
            {/* Figma 1:1385 — 새 비밀번호 / 확인, 각 300x44 */}
            <div className="mt-[16px] flex flex-col gap-[8px]">
              <TextField
                label="새 비밀번호"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(value) => {
                  setNewPassword(value);
                  setNewError(null);
                }}
                autoComplete="new-password"
              />
              <TextField
                label="새 비밀번호 확인"
                name="newPasswordConfirm"
                type="password"
                value={newPasswordConfirm}
                onChange={(value) => {
                  setNewPasswordConfirm(value);
                  setNewError(null);
                }}
                autoComplete="new-password"
              />
            </div>

            {newError ? (
              <FieldMessage tone="error">{newError}</FieldMessage>
            ) : (
              <FieldMessage tone="hint">{PASSWORD_HINT}</FieldMessage>
            )}

            {formError && <FieldMessage tone="error">{formError}</FieldMessage>}

            <div className="mt-[20px] flex justify-end gap-[10px]">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-full border border-gray2 px-[20px] py-[8px] text-[14px] text-gray3 transition-colors hover:border-brand-red hover:text-brand-red disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-full bg-brand-red px-[24px] py-[8px] text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {submitting ? "변경 중..." : "변경하기"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            {/* Figma 1:1259 */}
            <p
              role="status"
              className="mt-[16px] text-[15px] font-medium leading-[22px] text-black"
            >
              {SUCCESS_MESSAGE}
            </p>

            <div className="mt-[20px] flex justify-end">
              <button
                type="button"
                onClick={onClose}
                autoFocus
                className="rounded-full bg-brand-red px-[24px] py-[8px] text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                확인
              </button>
            </div>
          </>
        )}

        {step === "current" && (
          <div className="mt-[20px] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray2 px-[20px] py-[8px] text-[14px] text-gray3 transition-colors hover:border-brand-red hover:text-brand-red"
            >
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
