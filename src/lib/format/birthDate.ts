// =============================================================
// 생년월일 입력 형식
//
// formatDate(date.ts)와 다른 일을 한다. 저기는 저장된 ISO 값을 **읽기 좋게**
// 그리는 함수(2026.08.06)이고, 여기는 사용자가 **치는 중인** 값을 저장 형식
// (YYYY-MM-DD)으로 만드는 함수다. 한쪽은 출력, 한쪽은 입력이라 규칙도 다르다.
//
// 이 모양은 validation/user.ts 의 BIRTH_DATE_PATTERN 이 기대하는 형식이자
// users.birth_date(date 컬럼)에 그대로 넘어가는 형식이다.
//
// **달력에 실제로 있는 날짜인지는 보지 않는다.** 2000-99-99 도 이 함수는
// 만들어 준다 — 치는 도중에는 아직 완성되지 않은 값이 정상이고, 옳고 그름은
// validateBirthDate 가 판정한다. 포맷터가 값을 고치기 시작하면 사용자가
// 입력하려던 것과 다른 값이 화면에 남는다.
// =============================================================

import { digitsOf, groupDigits } from "./mask";

/** YYYY(4) + MM(2) + DD(2). */
const MAX_DIGITS = 8;
const GROUPS = [4, 2, 2] as const;

/** 입력 중인 값을 `2000-01-01` 모양으로 만든다. */
export function formatBirthDate(value: string): string {
  return groupDigits(digitsOf(value).slice(0, MAX_DIGITS), GROUPS, "-");
}
