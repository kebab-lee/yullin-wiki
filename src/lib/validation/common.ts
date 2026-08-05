// =============================================================
// 공통 검증 규칙
//
// 엔터티와 무관한 재사용 규칙만 둔다. "아이디는 몇 자인가" 같은
// 엔터티별 규칙은 user.ts 가 이 규칙들을 조합해서 만든다.
//
// UI 에 의존하지 않는 순수 함수다 (React/DOM import 금지).
// 같은 함수를 나중에 service 레이어가 그대로 재사용한다 —
// 클라이언트 검증은 편의고, 진짜 방어선은 서버다.
// =============================================================

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly message: string };

export const VALID: ValidationResult = { valid: true };

export const invalid = (message: string): ValidationResult => ({
  valid: false,
  message,
});

/** 값 하나를 받아 통과 여부를 돌려주는 규칙. */
export type Rule = (value: string) => ValidationResult;

export const required =
  (message: string): Rule =>
  (value) =>
    value.trim().length > 0 ? VALID : invalid(message);

export const minLength =
  (min: number, message: string): Rule =>
  (value) =>
    value.length >= min ? VALID : invalid(message);

export const maxLength =
  (max: number, message: string): Rule =>
  (value) =>
    value.length <= max ? VALID : invalid(message);

export const lengthBetween =
  (min: number, max: number, message: string): Rule =>
  (value) =>
    value.length >= min && value.length <= max ? VALID : invalid(message);

export const pattern =
  (regex: RegExp, message: string): Rule =>
  (value) =>
    regex.test(value) ? VALID : invalid(message);

/** 선택지(성별·소속처럼 DB CHECK 로도 걸리는 값)를 검사한다. */
export const oneOf =
  (allowed: readonly string[], message: string): Rule =>
  (value) =>
    allowed.includes(value) ? VALID : invalid(message);

/** 비밀번호 확인처럼 다른 필드와 같은 값이어야 할 때. */
export const equals =
  (other: string, message: string): Rule =>
  (value) =>
    value === other ? VALID : invalid(message);

/**
 * 규칙을 순서대로 적용하고 첫 실패를 돌려준다.
 * 한 필드에 에러 문구는 하나만 띄우므로 전부 모으지 않는다.
 */
export function validate(
  value: string,
  rules: readonly Rule[],
): ValidationResult {
  for (const rule of rules) {
    const result = rule(value);
    if (!result.valid) return result;
  }
  return VALID;
}

/** 실패면 문구, 통과면 undefined. 에러 맵을 만들 때 쓴다. */
export function errorOf(result: ValidationResult): string | undefined {
  return result.valid ? undefined : result.message;
}

/** 값이 존재하는 항목만 남긴 에러 맵을 만든다. */
export function collectErrors<K extends string>(
  entries: Partial<Record<K, string | undefined>>,
): Partial<Record<K, string>> {
  const errors: Partial<Record<K, string>> = {};
  for (const [key, message] of Object.entries(entries) as [
    K,
    string | undefined,
  ][]) {
    if (message) errors[key] = message;
  }
  return errors;
}
