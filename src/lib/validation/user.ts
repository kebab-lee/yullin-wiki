// =============================================================
// 사용자(회원가입 · 회원정보) 검증
//
// common.ts 의 공통 규칙을 조합해 필드별 규칙을 만든다.
// 순수 함수이며 React/DOM 을 모른다 — 같은 함수를 회원가입 API 가 붙을 때
// service 레이어가 그대로 재사용한다.
//
// 문구는 Figma 회원가입(1:1194) / 필드 variants(1:1312) 정본.
// =============================================================

import { GENDERS, isGender, type Gender } from "@/lib/types";

import {
  collectErrors,
  equals,
  errorOf,
  lengthBetween,
  oneOf,
  pattern,
  required,
  validate,
  type ValidationResult,
} from "./common";

// ── 문구 ──────────────────────────────────────────────────────
/** 비밀번호 입력 아래에 항상 떠 있는 안내. */
export const PASSWORD_HINT = "영문, 숫자, 특수문자를 포함한 8~20자리";
const FORMAT_ERROR = "⚠️ 형식을 확인해주세요.";
const PASSWORD_MISMATCH = "⚠️ 비밀번호가 일치하지 않습니다";
/** 입력이 아니라 선택인 필드(성별·소속)는 "형식"이 아니라 미선택이 문제다. */
const CHOICE_REQUIRED = "⚠️ 선택해주세요.";

/** 아이디 중복 확인 결과 문구. 실제 확인은 서버가 한다. */
export const LOGIN_ID_AVAILABLE = "✅ 사용 가능한 아이디입니다";
export const LOGIN_ID_TAKEN = "⚠ 중복된 아이디입니다";

/**
 * 로그인 실패 문구. 필드 검증이 아니라 인증 결과지만, 사용자에게 보이는 문구의
 * 정본은 이 모듈이 소유한다는 원칙에 따라 여기 둔다. 문구 자체는 Figma 1:1432 정본.
 *
 * **아이디가 없는 경우와 비밀번호가 틀린 경우가 반드시 같은 문구여야 한다.**
 * 구분해서 알려주면 어떤 아이디가 존재하는지 훑을 수 있다(계정 열거).
 */
export const LOGIN_FAILED = "아이디 혹은 비밀번호가 잘못되었습니다.";

// ── 규칙 ──────────────────────────────────────────────────────
// users.login_id varchar(30) / name varchar(50) / phone varchar(20) 과 맞춘다.
const LOGIN_ID_PATTERN = /^[a-z0-9_]{4,20}$/;
/** 영문·숫자·특수문자를 모두 포함한 공백 없는 8~20자. */
const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,20}$/;
const NAME_PATTERN = /^[가-힣a-zA-Z\s]{2,50}$/;
const BIRTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_PATTERN = /^01[016789]-\d{3,4}-\d{4}$/;

export const CHURCH_MEMBER_VALUES = ["MEMBER", "NON_MEMBER"] as const;
export type ChurchMemberChoice = (typeof CHURCH_MEMBER_VALUES)[number];

/** isGender 와 같은 이유의 가드 — service 가 캐스팅 없이 좁히게 한다. */
export function isChurchMemberChoice(
  value: string,
): value is ChurchMemberChoice {
  return (CHURCH_MEMBER_VALUES as readonly string[]).includes(value);
}

/** 달력에 실제로 존재하는 과거 날짜인가 (2026-02-30, 미래 생일 배제). */
function isRealPastDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  const exists =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return exists && date.getTime() <= Date.now();
}

// ── 필드별 검증 ───────────────────────────────────────────────
export function validateLoginId(value: string): ValidationResult {
  return validate(value, [
    required(FORMAT_ERROR),
    pattern(LOGIN_ID_PATTERN, FORMAT_ERROR),
  ]);
}

export function validatePassword(value: string): ValidationResult {
  return validate(value, [
    required(FORMAT_ERROR),
    pattern(PASSWORD_PATTERN, FORMAT_ERROR),
  ]);
}

export function validatePasswordConfirm(
  value: string,
  password: string,
): ValidationResult {
  return validate(value, [
    required(PASSWORD_MISMATCH),
    equals(password, PASSWORD_MISMATCH),
  ]);
}

export function validateName(value: string): ValidationResult {
  return validate(value.trim(), [
    required(FORMAT_ERROR),
    lengthBetween(2, 50, FORMAT_ERROR),
    pattern(NAME_PATTERN, FORMAT_ERROR),
  ]);
}

export function validateGender(value: string): ValidationResult {
  return validate(value, [oneOf(GENDERS, CHOICE_REQUIRED)]);
}

/** YYYY-MM-DD. users.birth_date 가 date 컬럼이라 그대로 넘길 수 있는 형식. */
export function validateBirthDate(value: string): ValidationResult {
  const format = validate(value, [
    required(FORMAT_ERROR),
    pattern(BIRTH_DATE_PATTERN, FORMAT_ERROR),
  ]);
  if (!format.valid) return format;

  return isRealPastDate(value)
    ? format
    : { valid: false, message: FORMAT_ERROR };
}

export function validatePhone(value: string): ValidationResult {
  return validate(value, [
    required(FORMAT_ERROR),
    pattern(PHONE_PATTERN, FORMAT_ERROR),
  ]);
}

export function validateChurchMember(value: string): ValidationResult {
  return validate(value, [oneOf(CHURCH_MEMBER_VALUES, CHOICE_REQUIRED)]);
}

// ── 폼 단위 검증 ──────────────────────────────────────────────
/**
 * 회원가입 입력. 폼 상태이자 곧 API 요청 바디의 모양이라
 * 값은 전부 문자열로 받는다 (도메인 타입 변환은 service 몫).
 */
export type SignupInput = {
  loginId: string;
  password: string;
  passwordConfirm: string;
  name: string;
  gender: string;
  birthDate: string;
  phone: string;
  churchMember: string;
};

export type SignupErrors = Partial<Record<keyof SignupInput, string>>;

/** 필드별 규칙을 한 번에 돌린다. 통과하면 빈 객체. */
export function validateSignup(input: SignupInput): SignupErrors {
  return collectErrors<keyof SignupInput>({
    loginId: errorOf(validateLoginId(input.loginId)),
    password: errorOf(validatePassword(input.password)),
    passwordConfirm: errorOf(
      validatePasswordConfirm(input.passwordConfirm, input.password),
    ),
    name: errorOf(validateName(input.name)),
    gender: errorOf(validateGender(input.gender)),
    birthDate: errorOf(validateBirthDate(input.birthDate)),
    phone: errorOf(validatePhone(input.phone)),
    churchMember: errorOf(validateChurchMember(input.churchMember)),
  });
}

/**
 * 검증을 통과한 회원가입 입력.
 *
 * 선택 필드가 유니온으로 좁혀져 있고, 확인용 비밀번호는 빠져 있다
 * (저장할 값이 아니라 입력 검사용이었으므로).
 */
export type ParsedSignupInput = {
  loginId: string;
  password: string;
  name: string;
  gender: Gender;
  birthDate: string;
  phone: string;
  churchMember: ChurchMemberChoice;
};

export type SignupParseResult =
  | { readonly ok: true; readonly value: ParsedSignupInput }
  | { readonly ok: false; readonly errors: SignupErrors };

/**
 * 폼과 똑같은 규칙으로 검증하되, 통과한 입력을 도메인 값으로 좁혀서 돌려준다.
 *
 * 폼은 문구만 필요하므로 validateSignup 을 쓰고, service 는 이 함수를 쓴다.
 * 검증과 타입 좁히기를 한 번에 끝내야 service 안에 `as Gender` 같은 캐스팅이
 * 생기지 않는다 — 규칙 자체는 위 함수들을 그대로 재사용한다.
 */
export function parseSignup(input: SignupInput): SignupParseResult {
  const errors = validateSignup(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const { gender, churchMember } = input;
  // 위 validateSignup 의 oneOf 가 이미 통과시킨 값이라 도달하지 않는다.
  // 타입 좁히기를 성립시키기 위한 방어 분기다.
  if (!isGender(gender) || !isChurchMemberChoice(churchMember)) {
    return {
      ok: false,
      errors: collectErrors<keyof SignupInput>({
        gender: errorOf(validateGender(gender)),
        churchMember: errorOf(validateChurchMember(churchMember)),
      }),
    };
  }

  return {
    ok: true,
    value: {
      loginId: input.loginId,
      password: input.password,
      name: input.name.trim(),
      gender,
      birthDate: input.birthDate,
      phone: input.phone,
      churchMember,
    },
  };
}
