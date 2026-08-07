"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import FieldMessage from "@/components/common/FieldMessage";
import FormRow from "@/components/common/FormRow";
import RadioGroup from "@/components/common/RadioGroup";
import SelectField from "@/components/common/SelectField";
import TextField from "@/components/common/TextField";
import PasswordChangeDialog from "@/components/user/PasswordChangeDialog";
import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import type { ApiErrorBody } from "@/lib/api/types";
import type { User } from "@/lib/types";
import { GENDERS, GENDER_LABEL } from "@/lib/types";
import {
  CHURCH_MEMBER_LABEL,
  CHURCH_MEMBER_VALUES,
  validateProfile,
  type ProfileErrors,
  type ProfileInput,
} from "@/lib/validation/user";

const GENDER_OPTIONS = GENDERS.map((gender) => ({
  value: gender,
  label: GENDER_LABEL[gender],
}));

const CHURCH_MEMBER_OPTIONS = CHURCH_MEMBER_VALUES.map((value) => ({
  value,
  label: CHURCH_MEMBER_LABEL[value],
}));

/** 서버가 돌려준 fields 중 이 폼이 그릴 수 있는 키만 추린다. */
const PROFILE_FIELD_KEYS: (keyof ProfileInput)[] = [
  "name",
  "gender",
  "birthDate",
  "phone",
  "churchMember",
];

/**
 * 도메인 모델 → 폼 상태.
 *
 * 폼은 값을 전부 문자열로 다룬다(ProfileInput). boolean 인 isChurchMember 를
 * 선택지 값으로 되돌리는 것이 이 함수의 일이며, 저장할 때의 반대 방향 변환은
 * service 가 한다 — 화면 문구가 바뀌어도 DB 컬럼은 그대로다.
 */
function toFormValues(user: User): ProfileInput {
  return {
    name: user.name ?? "",
    gender: user.gender ?? "",
    birthDate: user.birthDate ?? "",
    phone: user.phone ?? "",
    churchMember: user.isChurchMember ? "MEMBER" : "NON_MEMBER",
  };
}

function toProfileErrors(body: ApiErrorBody): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!body.fields) return errors;

  for (const key of PROFILE_FIELD_KEYS) {
    const message = body.fields[key];
    if (typeof message === "string") errors[key] = message;
  }
  return errors;
}

/**
 * 회원정보 수정 폼 — Figma 1:1146 (회원정보 variants 1:1366 재사용).
 *
 * 필드 컴포넌트(FormRow / TextField / SelectField / RadioGroup)와 검증 함수를
 * 회원가입과 **그대로 공유한다.** 같은 값을 받는 두 화면이라 규칙도 컴포넌트도
 * 갈라 둘 이유가 없다 — 갈라 두면 한쪽만 고쳐질 때 가입은 통과하는 값이
 * 수정에서 막힌다.
 *
 * **아이디는 수정 불가다.** 입력으로 두지 않고 읽기 전용으로 그린다. 서버 쪽도
 * 마찬가지라, 바디에 loginId 를 넣어도 route handler 의 화이트리스트에서 빠진다.
 */
export default function ProfileEditForm({ user }: { user: User }) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileInput>(() => toFormValues(user));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const setField = (field: keyof ProfileInput) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const nextErrors = validateProfile(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        const fieldErrors = toProfileErrors(body);

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          setFormError(body.message);
        }
        return;
      }

      router.push("/mypage");
      // 조회 화면은 서버 컴포넌트다. 라우터 캐시에 남은 이전 렌더를 버려야
      // 방금 저장한 값이 보인다.
      router.refresh();
    } catch {
      setFormError(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // Figma: 우측 폼 537폭 (회원가입과 같은 폭)
    <form onSubmit={handleSubmit} noValidate className="w-[537px] shrink-0">
      <h2 className="text-[15px] font-medium leading-[18px] text-black">
        회원정보 수정
      </h2>
      <hr className="mt-[18px] border-t border-gray2" />

      <div className="mt-[18px] flex flex-col gap-[20px]">
        {/* 아이디 — 읽기 전용. 인풋으로 두지 않는다(고칠 수 없는 칸을 고칠 수
            있는 것처럼 그리면 안 된다). */}
        <FormRow label="아이디" controlWidth="w-[254px]">
          <p className="flex h-[30px] items-center text-[14px] font-light leading-[17px] text-gray4">
            {user.loginId}
          </p>
        </FormRow>

        <FormRow label="비밀번호" controlWidth="w-[286px]">
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="h-[30px] rounded-badge border border-brand-red px-[12px] text-[13px] font-medium leading-[16px] text-brand-red transition-colors hover:bg-brand-red-pink"
          >
            비밀번호 변경
          </button>
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

      {/* Figma: 하단 중앙 제출 버튼 73x36 */}
      <div className="mt-[20px] flex flex-col items-center">
        {formError ? (
          <FieldMessage tone="error">{formError}</FieldMessage>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-[5px] h-[36px] w-[73px] rounded-badge bg-brand-red text-[14px] font-medium leading-[17px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          수정
        </button>
      </div>

      {passwordOpen && (
        <PasswordChangeDialog onClose={() => setPasswordOpen(false)} />
      )}
    </form>
  );
}
