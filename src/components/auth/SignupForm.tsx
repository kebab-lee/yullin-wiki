"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import FieldMessage from "@/components/common/FieldMessage";
import FormRow from "@/components/common/FormRow";
import RadioGroup from "@/components/common/RadioGroup";
import SelectField from "@/components/common/SelectField";
import TextField from "@/components/common/TextField";
import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import type { ApiErrorBody } from "@/lib/api/types";
import { GENDERS, GENDER_LABEL } from "@/lib/types";
import {
  LOGIN_ID_AVAILABLE,
  LOGIN_ID_TAKEN,
  PASSWORD_HINT,
  validateLoginId,
  validateSignup,
  type SignupErrors,
  type SignupInput,
} from "@/lib/validation/user";

const EMPTY_FORM: SignupInput = {
  loginId: "",
  password: "",
  passwordConfirm: "",
  name: "",
  gender: "",
  birthDate: "",
  phone: "",
  churchMember: "",
};

/** 서버가 돌려준 fields 중 이 폼이 그릴 수 있는 키만 추린다. */
const SIGNUP_FIELD_KEYS = Object.keys(EMPTY_FORM) as (keyof SignupInput)[];

const GENDER_OPTIONS = GENDERS.map((gender) => ({
  value: gender,
  label: GENDER_LABEL[gender],
}));

const CHURCH_MEMBER_OPTIONS = [
  { value: "MEMBER", label: "열린교회 교인입니다" },
  { value: "NON_MEMBER", label: "아닙니다" },
] as const;

const NEEDS_DUPLICATE_CHECK = "⚠ 아이디 중복 확인을 해주세요";

/** 중복확인 결과. 어떤 아이디를 확인한 것인지까지 들고 있어야 뜻이 있다. */
type DuplicateCheck = { loginId: string; available: boolean };

/** 실패 응답 바디에서 필드 문구를 꺼낸다. 모양이 어긋나면 조용히 비운다. */
function toSignupErrors(body: ApiErrorBody): SignupErrors {
  const errors: SignupErrors = {};
  if (!body.fields) return errors;

  for (const key of SIGNUP_FIELD_KEYS) {
    const message = body.fields[key];
    if (typeof message === "string") errors[key] = message;
  }
  return errors;
}

/**
 * 회원가입 폼 — Figma 1:1194 (필드 상태 variants 1:1312).
 *
 * 검증은 src/lib/validation/user.ts 의 순수 함수에 맡긴다. 이 컴포넌트는
 * "언제 검증하고 어디에 문구를 띄우는가"만 결정한다 — 규칙 자체를 여기 두면
 * service 레이어가 같은 규칙을 다시 써야 한다.
 *
 * 서버 호출은 자기 도메인 API 두 개뿐이다. Supabase 의 존재를 알지 못하며,
 * 백엔드가 Java 로 바뀌어도 이 파일은 그대로다.
 */
export default function SignupForm() {
  const router = useRouter();
  const [values, setValues] = useState<SignupInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [check, setCheck] = useState<DuplicateCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /**
   * 확인한 아이디와 지금 입력된 아이디가 같을 때만 결과가 유효하다.
   * 입력이 바뀌면 자동으로 무효가 되고, 늦게 도착한 응답도 같은 이유로 버려진다.
   */
  const duplicate: "idle" | "available" | "taken" =
    check && check.loginId === values.loginId
      ? check.available
        ? "available"
        : "taken"
      : "idle";

  /** 입력을 고치는 순간 그 필드의 에러는 지운다 — 고치는 중에 빨간 문구를 붙잡아두지 않는다. */
  const setField = (field: keyof SignupInput) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      // 비밀번호를 고치면 "일치하지 않습니다"도 같이 무효가 된다.
      if (field === "password") delete next.passwordConfirm;
      return next;
    });
    setFormError(null);
  };

  const handleDuplicateCheck = async () => {
    const result = validateLoginId(values.loginId);
    if (!result.valid) {
      setErrors((prev) => ({ ...prev, loginId: result.message }));
      setCheck(null);
      return;
    }

    const loginId = values.loginId;
    setChecking(true);
    setFormError(null);
    try {
      const response = await fetch(
        `/api/users/check-duplicate?loginId=${encodeURIComponent(loginId)}`,
      );

      if (!response.ok) {
        const body = await readErrorBody(response);
        setErrors((prev) => ({
          ...prev,
          ...toSignupErrors(body),
        }));
        setCheck(null);
        return;
      }

      const { available }: { available: boolean } = await response.json();
      setCheck({ loginId, available });
      setErrors((prev) => {
        const next = { ...prev };
        delete next.loginId;
        return next;
      });
    } catch {
      setFormError(NETWORK_ERROR);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const nextErrors = validateSignup(values);
    // 형식이 맞아도 중복 확인을 안 거쳤으면 넘기지 않는다.
    // (진짜 판정은 서버 몫이고, 여기서는 확인 절차를 강제할 뿐이다.)
    if (!nextErrors.loginId && duplicate !== "available") {
      nextErrors.loginId = NEEDS_DUPLICATE_CHECK;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        // 400(검증) / 409(중복)는 필드 문구로, 그 외는 폼 단위 문구로 떨어뜨린다.
        const body = await readErrorBody(response);
        const fieldErrors = toSignupErrors(body);

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          // 서버가 중복이라고 답했으면 클라이언트의 "사용 가능" 판정도 무효다.
          if (fieldErrors.loginId) setCheck(null);
        } else {
          setFormError(body.message);
        }
        return;
      }

      router.push("/login");
    } catch {
      setFormError(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  const passwordMessage = errors.password ?? errors.passwordConfirm;

  return (
    // Figma Frame 1494 (537x571)
    <form onSubmit={handleSubmit} noValidate className="w-[537px] shrink-0">
      <h2 className="text-[15px] font-medium leading-[18px] text-black">
        회원정보
      </h2>
      <hr className="mt-[18px] border-t border-gray2" />

      {/* Figma: 구분선 아래 18px 부터 폼 영역(537x517), 행 간격 20px */}
      <div className="mt-[18px] flex flex-col gap-[20px]">
        {/* 아이디 — 인풋 + 중복확인 버튼이 254px 안에 나란히 */}
        <FormRow label="아이디" htmlFor="loginId" controlWidth="w-[254px]">
          <div className="flex items-center gap-[8px]">
            <TextField
              label="아이디"
              name="loginId"
              value={values.loginId}
              onChange={setField("loginId")}
              placeholder="영문·숫자 4~20자"
              autoComplete="username"
              size="sm"
              labelPlacement="external"
            />
            <button
              type="button"
              onClick={handleDuplicateCheck}
              disabled={checking}
              className="h-[30px] shrink-0 whitespace-nowrap rounded-badge border border-brand-red px-[10px] text-[13px] font-medium leading-[16px] text-brand-red transition-colors hover:bg-brand-red-pink disabled:opacity-50"
            >
              중복확인
            </button>
          </div>

          {/* 형식 에러 > 중복 확인 결과. 문구 자리는 하나만 쓴다. */}
          {errors.loginId ? (
            <FieldMessage tone="error">{errors.loginId}</FieldMessage>
          ) : duplicate === "taken" ? (
            <FieldMessage tone="error">{LOGIN_ID_TAKEN}</FieldMessage>
          ) : duplicate === "available" ? (
            <FieldMessage tone="success">{LOGIN_ID_AVAILABLE}</FieldMessage>
          ) : null}
        </FormRow>

        {/* 비밀번호 — 인풋 2개가 문구 한 줄을 공유한다 (Figma 286x91) */}
        <FormRow label="비밀번호" htmlFor="password" controlWidth="w-[286px]">
          <div className="flex flex-col gap-[8px]">
            <TextField
              label="비밀번호"
              name="password"
              type="password"
              value={values.password}
              onChange={setField("password")}
              autoComplete="new-password"
              size="sm"
              labelPlacement="external"
            />
            <TextField
              label="비밀번호 확인"
              name="passwordConfirm"
              type="password"
              value={values.passwordConfirm}
              onChange={setField("passwordConfirm")}
              placeholder="비밀번호 확인"
              autoComplete="new-password"
              size="sm"
            />
          </div>

          {passwordMessage ? (
            <FieldMessage tone="error">{passwordMessage}</FieldMessage>
          ) : (
            <FieldMessage tone="hint">{PASSWORD_HINT}</FieldMessage>
          )}
        </FormRow>

        <FormRow label="이름" htmlFor="name" controlWidth="w-[140px]">
          <TextField
            label="이름"
            name="name"
            value={values.name}
            onChange={setField("name")}
            autoComplete="name"
            size="sm"
            labelPlacement="external"
            error={errors.name}
          />
        </FormRow>

        <FormRow label="성별" htmlFor="gender" controlWidth="w-[180px]">
          <SelectField
            label="성별"
            name="gender"
            value={values.gender}
            onChange={setField("gender")}
            options={GENDER_OPTIONS}
            size="sm"
            labelPlacement="external"
            error={errors.gender}
          />
        </FormRow>

        <FormRow label="생년월일" htmlFor="birthDate" controlWidth="w-[218px]">
          <TextField
            label="생년월일"
            name="birthDate"
            value={values.birthDate}
            onChange={setField("birthDate")}
            placeholder="YYYY-MM-DD"
            autoComplete="bday"
            inputMode="numeric"
            maxLength={10}
            size="sm"
            labelPlacement="external"
            error={errors.birthDate}
          />
        </FormRow>

        <FormRow label="전화번호" htmlFor="phone" controlWidth="w-[218px]">
          <TextField
            label="전화번호"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={setField("phone")}
            placeholder="010-0000-0000"
            autoComplete="tel"
            inputMode="tel"
            maxLength={13}
            size="sm"
            labelPlacement="external"
            error={errors.phone}
          />
        </FormRow>

        {/* 라디오 그룹은 fieldset 이 스스로 이름을 가지므로 htmlFor 를 걸지 않는다. */}
        <FormRow label="열린교회 소속" controlWidth="w-[292px]">
          <RadioGroup
            legend="열린교회 소속"
            name="churchMember"
            value={values.churchMember}
            onChange={setField("churchMember")}
            options={CHURCH_MEMBER_OPTIONS}
            error={errors.churchMember}
          />
        </FormRow>
      </div>

      {/* Figma: 제출 버튼 98x36, 폼 하단 중앙 */}
      <div className="mt-[20px] flex flex-col items-center">
        {/* 필드로 귀속되지 않는 실패(네트워크·서버 오류)만 여기 뜬다. */}
        {formError ? (
          <FieldMessage tone="error">{formError}</FieldMessage>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-[5px] h-[36px] w-[98px] rounded-badge bg-brand-red text-[14px] font-medium leading-[17px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          가입하기
        </button>
      </div>
    </form>
  );
}
