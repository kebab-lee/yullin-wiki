// =============================================================
// 검색어 검증
//
// common.ts 의 공통 규칙을 조합한다. 순수 함수이며 React/DOM 을 모른다 —
// 같은 함수를 검색 입력(SearchInput)과 pageService.searchPages 가 함께 쓴다.
// =============================================================

import {
  lengthBetween,
  maxLength,
  minLength,
  required,
  validate,
  type ValidationResult,
} from "./common";

// ── 문구 ──────────────────────────────────────────────────────
export const QUERY_REQUIRED = "⚠️ 검색어를 입력해주세요.";
export const QUERY_TOO_SHORT = "⚠️ 검색어는 2글자 이상 입력해주세요.";
export const QUERY_TOO_LONG = "⚠️ 검색어는 100자를 넘을 수 없습니다.";

// ── 한계값 ────────────────────────────────────────────────────
/**
 * 검색어 최소 길이 2.
 *
 * **트라이그램은 3글자 묶음이 단위다.** 그래서 길이별로 결과의 성질이 다르다.
 *   1글자  "교" 같은 질의는 그 글자가 든 거의 모든 문서와 걸린다. 트라이그램이
 *          만들어지지 않아(패딩만 남는다) 순위도 서지 않는다 — 결과가 나와도
 *          정렬이 무의미하므로 아예 막는다.
 *   2글자  트라이그램 유사도는 약해지지만 ILIKE 부분일치 갈래(search_pages 의 ⓐ)가
 *          그대로 동작하므로 "교회" 같은 질의는 정확히 든 문서를 다 찾는다.
 *          오타 보정만 흐려질 뿐 결과 자체는 쓸 만해서 허용한다.
 *   3글자~ 트라이그램이 온전히 동작한다.
 *
 * 즉 경계를 2 로 잡은 것은 "트라이그램이 되는 최소"가 아니라 **"결과에 순위를
 * 매길 수 있는 최소"** 다.
 */
const QUERY_MIN = 2;

/**
 * 최대 100자. pages.title(200) 보다 짧게 잡는다 — 그보다 긴 질의는 오려붙인
 * 문단이지 검색어가 아니고, 트라이그램 집합이 커져 인덱스 스캔만 무거워진다.
 */
const QUERY_MAX = 100;

/**
 * 검색어가 검색을 시도할 만한 값인가.
 *
 * 빈 값과 짧은 값의 문구를 나눈다 — 사용자가 할 일이 다르다("입력해라" vs
 * "더 길게 써라"). lengthBetween 하나로 합치면 두 경우가 같은 문구를 받는다.
 */
export function validateSearchQuery(value: string): ValidationResult {
  return validate(value.trim(), [
    required(QUERY_REQUIRED),
    minLength(QUERY_MIN, QUERY_TOO_SHORT),
    maxLength(QUERY_MAX, QUERY_TOO_LONG),
  ]);
}

/**
 * 화면이 검색을 보낼 값인지 미리 아는 데 쓴다.
 *
 * 검증 실패를 폼 에러로 띄우는 대신 **제출 자체를 막는** 입력이라(SearchInput),
 * 문구가 아니라 boolean 이 필요하다. 규칙은 위와 같은 것을 쓴다 — 두 벌로 적으면
 * 입력은 보내는데 서버가 400 으로 되돌리는 상태가 생긴다.
 */
export function isSearchable(value: string): boolean {
  return validate(value.trim(), [
    lengthBetween(QUERY_MIN, QUERY_MAX, QUERY_TOO_SHORT),
  ]).valid;
}
