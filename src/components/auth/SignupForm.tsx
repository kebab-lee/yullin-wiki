"use client";

import { useState } from "react";

import FieldMessage from "@/components/common/FieldMessage";
import FormRow from "@/components/common/FormRow";
import RadioGroup from "@/components/common/RadioGroup";
import SelectField from "@/components/common/SelectField";
import TextField from "@/components/common/TextField";
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

const GENDER_OPTIONS = GENDERS.map((gender) => ({
  value: gender,
  label: GENDER_LABEL[gender],
}));

const CHURCH_MEMBER_OPTIONS = [
  { value: "MEMBER", label: "열린교회 교인입니다" },
  { value: "NON_MEMBER", label: "아닙니다" },
] as const;

/**
 * 서버가 붙기 전까지 "중복" 상태를 눈으로 확인하기 위한 임시 목록.
 * 실제 판정은 서버가 하며, 이 상수는 API 연결과 함께 사라진다.
 */
const TAKEN_LOGIN_IDS = ["admin", "yullin"];

type DuplicateState = "idle" | "available" | "taken";

const NEEDS_DUPLICATE_CHECK = "⚠ 아이디 중복 확인을 해주세요";

/**
 * 회원가입 폼 — Figma 1:1194 (필드 상태 variants 1:1312).
 *
 * 검증은 src/lib/validation/user.ts 의 순수 함수에 맡긴다. 이 컴포넌트는
 * "언제 검증하고 어디에 문구를 띄우는가"만 결정한다 — 규칙 자체를 여기 두면
 * 회원가입 API 가 붙을 때 service 레이어가 같은 규칙을 다시 써야 한다.
 *
 * 지금은 퍼블리싱 단계라 제출이 서버로 나가지 않는다.
 */
export default function SignupForm() {
  const [values, setValues] = useState<SignupInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [duplicate, setDuplicate] = useState<DuplicateState>("idle");

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
    // 아이디가 바뀌면 이전 중복 확인 결과는 그 아이디의 것이 아니다.
    if (field === "loginId") setDuplicate("idle");
  };

  const handleDuplicateCheck = () => {
    const result = validateLoginId(values.loginId);
    if (!result.valid) {
      setErrors((prev) => ({ ...prev, loginId: result.message }));
      setDuplicate("idle");
      return;
    }

    // TODO: GET /api/users/check-duplicate?userId=
    setDuplicate(
      TAKEN_LOGIN_IDS.includes(values.loginId.toLowerCase())
        ? "taken"
        : "available",
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next.loginId;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors = validateSignup(values);
    // 형식이 맞아도 중복 확인을 안 거쳤으면 넘기지 않는다.
    // (진짜 판정은 서버 몫이고, 여기서는 확인 절차를 강제할 뿐이다.)
    if (!nextErrors.loginId && duplicate !== "available") {
      nextErrors.loginId = NEEDS_DUPLICATE_CHECK;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // TODO: POST /api/users
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
              className="h-[30px] shrink-0 whitespace-nowrap rounded-badge border border-brand-red px-[10px] text-[13px] font-medium leading-[16px] text-brand-red transition-colors hover:bg-brand-red-pink"
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
      <div className="mt-[20px] flex justify-center">
        <button
          type="submit"
          className="h-[36px] w-[98px] rounded-badge bg-brand-red text-[14px] font-medium leading-[17px] text-white transition-opacity hover:opacity-90"
        >
          가입하기
        </button>
      </div>
    </form>
  );
}
