// =============================================================
// 전화번호 표시 형식
//
// 이 함수가 만드는 모양은 validation/user.ts 의 PHONE_PATTERN
// (/^01[016789]-\d{3,4}-\d{4}$/) 이 통과시키는 모양과 **같아야 한다.**
// 검증은 하이픈이 있는 값을 기대하고, DB(users.phone varchar(20))에도
// 하이픈이 포함된 채로 저장된다 — 즉 여기서 만드는 값이 곧 저장되는 값이다.
//
// 국제 번호는 다루지 않는다. 01x 로 시작하는 국내 휴대폰만이 검증 대상이다.
// =============================================================

import { digitsOf, groupDigits } from "./mask";

/** 010-0000-0000. 11자리를 넘는 입력은 버린다. */
const MAX_DIGITS = 11;

/** 11자리는 3-4-4, 10자리 이하는 3-3-4. 둘 다 PHONE_PATTERN 의 \d{3,4} 안이다. */
const GROUPS_11 = [3, 4, 4] as const;
const GROUPS_10 = [3, 3, 4] as const;

/**
 * 입력 중인 값을 `010-0000-0000` 모양으로 만든다.
 *
 * 숫자만 남기고 다시 끊으므로, 사용자가 하이픈을 직접 넣었든 안 넣었든,
 * 붙여넣었든 한 글자씩 쳤든 같은 결과가 나온다.
 */
export function formatPhone(value: string): string {
  const digits = digitsOf(value).slice(0, MAX_DIGITS);
  return groupDigits(digits, digits.length > 10 ? GROUPS_11 : GROUPS_10, "-");
}
