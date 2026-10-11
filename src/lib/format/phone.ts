// =============================================================
// 전화번호 표시 형식
//
// 이 함수가 만드는 모양은 validation/user.ts 의 PHONE_PATTERN
// (/^01[016789]-\d{3,4}-\d{4}$/) 이 통과시키는 모양과 **같아야 한다.**
// 검증은 하이픈이 있는 값을 기대하고, 하이픈이 포함된 채로 암호화되어
// 저장된다(repositories/fieldCipher) — 즉 여기서 만드는 값이 곧 잠기는 평문이다.
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

/** 뒤에서 남기는 자리 수. 동명이인을 가르는 데 쓰는 것이 이 네 자리다. */
const VISIBLE_TAIL = 4;

/**
 * 가운데 자리를 가린다 — `010-5837-0000` → `010-****-0000`.
 *
 * 관리 화면에서 동명이인을 가를 때 쓴다(AdminUserSummary.maskedPhone).
 * **앞 3자리는 정보가 아니다** (거의 다 010) — 남기는 것은 모양을 알아보게
 * 하려는 것이고, 실제로 사람을 가르는 것은 뒷자리 4개다. 가운데 자리 수는
 * 그대로 둔다(3-3-4 번호는 별표 셋).
 *
 * 숫자만 남겨서 다시 끊으므로 저장된 값에 하이픈이 있든 없든 같은 결과다.
 * 뒷자리 4개조차 안 되는 값이 오면(검증을 통과한 값이면 없다) 통째로 가린다.
 */
export function maskPhone(phone: string): string {
  const digits = digitsOf(phone);
  if (digits.length <= VISIBLE_TAIL + 3) return "*".repeat(digits.length);

  const head = digits.slice(0, 3);
  const tail = digits.slice(-VISIBLE_TAIL);
  const middle = "*".repeat(digits.length - head.length - tail.length);
  return [head, middle, tail].join("-");
}
