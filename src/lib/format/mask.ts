// =============================================================
// 숫자 입력 마스킹 — 엔터티와 무관한 공통 규칙
//
// validation/common.ts 가 검증에 대해 하는 역할을 포맷에 대해 한다.
// "몇 자리씩 끊어서 무엇으로 잇는가"만 알고, 그것이 전화번호인지 생년월일인지는
// 모른다. 엔터티별 규칙은 phone.ts / birthDate.ts 가 이 함수들을 조합해서 만든다.
//
// React·DOM 을 모르는 순수 함수다. 클라이언트 폼과 서버가 함께 쓸 수 있다
// (검증 모듈과 같은 원칙).
// =============================================================

/** 숫자 이외의 글자를 전부 버린다. 붙여넣기가 이 함수 하나로 처리된다. */
export function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * `digits` 를 `groups` 길이대로 끊어 `separator` 로 잇는다.
 *
 * **끝에 구분자를 남기지 않는다.** `groupDigits("010", [3,4,4], "-")` 가
 * `"010-"` 을 돌려주면, 사용자가 세 자리를 지우려고 백스페이스를 눌러도
 * 구분자가 되살아나서 지워지지 않는 것처럼 보인다.
 */
export function groupDigits(
  digits: string,
  groups: readonly number[],
  separator: string,
): string {
  const parts: string[] = [];
  let offset = 0;

  for (const size of groups) {
    if (offset >= digits.length) break;
    parts.push(digits.slice(offset, offset + size));
    offset += size;
  }

  return parts.join(separator);
}

/**
 * `value` 의 앞에서 `end` 번째 글자까지 중 숫자가 몇 개인가.
 *
 * **커서를 지키는 열쇠다.** 포맷된 문자열의 인덱스는 구분자가 끼어드는 순간
 * 뜻을 잃지만, "커서 앞에 숫자가 몇 개 있었는가"는 포맷이 바뀌어도 변하지
 * 않는다. 그 개수를 기억했다가 새 문자열에서 같은 자리를 다시 찾는다.
 */
export function countDigits(value: string, end: number): number {
  return digitsOf(value.slice(0, end)).length;
}

/** `formatted` 에서 `count` 번째 숫자 바로 뒤의 인덱스. countDigits 의 역함수. */
export function caretAfterDigits(formatted: string, count: number): number {
  if (count <= 0) return 0;

  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      seen += 1;
      if (seen === count) return i + 1;
    }
  }
  return formatted.length;
}

/** 커서 위치까지 함께 돌려주는 포맷 결과. */
export type MaskedValue = { value: string; caret: number };

/**
 * 입력이 바뀐 뒤의 값과 커서 자리를 함께 계산한다.
 *
 * 브라우저가 만든 raw 값(구분자가 섞였을 수도, 지워졌을 수도 있다)을 그대로
 * 다시 포맷하고, 커서는 "앞에 있던 숫자 개수"를 기준으로 되찾는다. 이렇게
 * 하지 않고 값만 갈아끼우면 controlled input 이 다시 그려질 때 커서가 항상
 * 맨 뒤로 튄다 — 가운데를 고칠 수 없게 되는 가장 흔한 실패다.
 */
export function applyMask(
  raw: string,
  caret: number,
  format: (value: string) => string,
): MaskedValue {
  const digitsBefore = countDigits(raw, caret);
  const value = format(raw);
  return { value, caret: caretAfterDigits(value, digitsBefore) };
}

/**
 * 커서 앞(`Backspace`) 또는 뒤(`Delete`)의 **숫자 한 개**를 지운 결과.
 *
 * 구분자 위에서 지우기를 눌렀을 때 필요하다. 브라우저 기본 동작은 구분자를
 * 지우지만 곧바로 재포맷되어 되살아나므로, 사용자 눈에는 아무 일도 일어나지
 * 않는다. 그래서 구분자 대신 그 너머의 숫자를 지운다.
 *
 * 지울 숫자가 없으면(맨 앞에서 Backspace 등) null 을 돌려주고, 호출자는
 * 기본 동작에 맡긴다.
 */
export function deleteDigit(
  value: string,
  caret: number,
  direction: "backward" | "forward",
  format: (value: string) => string,
): MaskedValue | null {
  const digits = digitsOf(value);
  const digitsBefore = countDigits(value, caret);
  const target = direction === "backward" ? digitsBefore - 1 : digitsBefore;

  if (target < 0 || target >= digits.length) return null;

  const next = format(digits.slice(0, target) + digits.slice(target + 1));
  return { value: next, caret: caretAfterDigits(next, target) };
}
