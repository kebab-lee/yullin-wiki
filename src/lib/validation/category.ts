// =============================================================
// 카테고리(항목) 검증
//
// common.ts 의 공통 규칙을 조합해 필드별 규칙을 만든다. 순수 함수이며
// React/DOM 을 모른다 — 같은 함수를 어드민 폼과 categoryService 가 함께 쓴다.
// 클라이언트 검증은 편의고 진짜 방어선은 service 다.
//
// **생성과 수정의 규칙이 갈린다.** 게시물(page.ts)은 작성·수정이 채우는 칸이
// 같아서 한 타입을 공유하지만, 여기는 slug 가 생성 시에만 정해지는 값이다
// (아래 CategoryEditInput 주석). 그래서 폼 단위 함수가 두 벌이고, 필드 단위
// 규칙은 한 벌이다 — 갈리는 것은 "어느 칸을 받는가"이지 "그 칸의 규칙"이 아니다.
// =============================================================

import {
  collectErrors,
  errorOf,
  intInRange,
  invalid,
  maxLength,
  pattern,
  required,
  validate,
  VALID,
  type ValidationResult,
} from "./common";

// ── 문구 ──────────────────────────────────────────────────────
// 문구의 정본은 검증 모듈이 소유한다. 컴포넌트는 받아서 그리기만 한다.
const SLUG_REQUIRED = "⚠️ 주소를 입력해주세요.";
const SLUG_INVALID = "⚠️ 주소는 영문 소문자와 하이픈(-)만 쓸 수 있습니다.";
const SLUG_TOO_LONG = "⚠️ 주소는 50자를 넘을 수 없습니다.";
const NAME_REQUIRED = "⚠️ 짧은 이름을 입력해주세요.";
const NAME_TOO_LONG = "⚠️ 짧은 이름은 5자를 넘을 수 없습니다.";
const FULL_NAME_REQUIRED = "⚠️ 긴 이름을 입력해주세요.";
const FULL_NAME_TOO_LONG = "⚠️ 긴 이름은 30자를 넘을 수 없습니다.";
const ICON_REQUIRED = "⚠️ 아이콘을 입력해주세요.";
const ICON_NOT_EMOJI = "⚠️ 아이콘은 이모지 한 글자여야 합니다.";
const SORT_ORDER_REQUIRED = "⚠️ 순서를 입력해주세요.";
const SORT_ORDER_INVALID = "⚠️ 순서는 0 이상 999 이하의 정수여야 합니다.";

/** slug unique 제약과 부딪혔을 때. repository 와 service 가 같은 문구를 쓴다. */
export const SLUG_TAKEN = "⚠️ 이미 사용 중인 주소입니다.";

/** 없는 항목을 고치거나 지우려 할 때. 입력 칸의 문제가 아니라 대상의 부재다. */
export const CATEGORY_NOT_FOUND = "요청하신 항목을 찾을 수 없습니다.";

/**
 * 문서가 남아 있어 삭제를 거부할 때의 문구.
 *
 * **건수를 문구에 박아 넣는다.** "삭제할 수 없습니다"만으로는 사용자가 다음에
 * 무엇을 해야 하는지 알 수 없다 — 몇 건을 어디로 옮겨야 끝나는지가 이 조작의
 * 유일한 다음 단계이므로, 그 수가 답의 일부다.
 */
export function categoryHasPages(count: number): string {
  return `이 항목에 문서가 ${count}건 있어 삭제할 수 없습니다. 문서를 다른 항목으로 먼저 옮겨주세요.`;
}

/**
 * 위와 같은 거절이지만 **건수를 말할 수 없는 경우**의 문구.
 *
 * service 가 건수를 센 뒤 DELETE 를 쏘기까지의 사이에 누군가 그 항목으로 글을
 * 쓰면(TOCTOU) 0건으로 통과한 삭제가 FK 제약에서 거절된다. 그 자리에서 다시
 * 세어 정확한 수를 말할 수도 있지만, 그 재조회 역시 같은 경합에 열려 있어
 * 정확해 보이는 수를 한 번 더 지어내는 셈이다 — 대신 목록을 다시 보라고 한다.
 */
export const CATEGORY_IN_USE =
  "이 항목에 문서가 남아 있어 삭제할 수 없습니다. 목록을 새로고침해 문서 수를 확인해주세요.";

// ── 한계값 ────────────────────────────────────────────────────
/** categories.slug varchar(50) 과 맞춘다. */
const SLUG_MAX = 50;

/**
 * 짧은 이름의 상한.
 *
 * **화면이 정한 수다.** 홈의 원형 카테고리 버튼(CategoryButton, Figma 1:709)이
 * 110x110 에 안쪽 여백 10px 이라 글자가 놓일 폭이 90px 이고, 라벨 토큰
 * `text-category-label` 은 18px 볼드다. 한글 한 자가 18px 를 차지하므로 5자면
 * 90px 를 정확히 채운다 — 6자부터 줄이 깨지거나 원 밖으로 밀린다.
 * 게시물 배지(CategoryBadge)는 `whitespace-nowrap` 이라 더 관대하지만, 둘 중
 * 좁은 쪽이 상한이다. DB(varchar(50))가 아니라 여기가 진짜 제약이다.
 */
const NAME_MAX = 5;

/**
 * 긴 이름의 상한. DB 는 varchar(100) 이지만 그보다 앞서 화면이 걸린다 —
 * Footer 카테고리 목록의 한 줄이고(SiteFooter), 거기서 줄바꿈되면 목록의
 * 행 높이가 항목마다 달라진다. 현재 값("열린교회 속 공간")이 9자다.
 */
const FULL_NAME_MAX = 30;

/** 정렬 순서. 음수를 받지 않는다 — "위로 올리려고 -1" 같은 임시 조작이 쌓이면
 *  순서가 사람이 못 읽는 수가 된다. 항목이 세 개 규모라 999 면 충분하다. */
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 999;

// ── 패턴 ──────────────────────────────────────────────────────
/**
 * 영문 소문자 + 하이픈. 하이픈으로 시작·끝나거나 연달아 오는 것을 막는다
 * (`-space`, `space-`, `sp--ace`). URL 의 한 조각이 되는 값이라 눈으로 읽어서
 * 구분되는 모양만 허용한다.
 */
const SLUG_PATTERN = /^[a-z]+(?:-[a-z]+)*$/;

/** 숫자만. 범위 판정은 intInRange 가 이어서 한다. */
const SORT_ORDER_PATTERN = /^\d+$/;

/**
 * 이모지인가. `Extended_Pictographic` 는 그림문자 전체를 덮는 유니코드 속성이라
 * 이모지 목록을 손으로 유지하지 않아도 된다.
 */
const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;

/**
 * 사람이 세는 "한 글자" 단위로 자르는 도구.
 *
 * `value.length` 도 `[...value].length` 도 답이 틀린다 — 현재 쓰이는 `⛪️` 는
 * 기호 하나에 이형자 선택자(U+FE0F)가 붙은 **두 코드포인트**라 둘 다 2 로 센다.
 * 자소(grapheme) 단위로 세야 화면에 보이는 글자 수와 일치한다.
 *
 * Segmenter 가 없는 런타임에서는 코드포인트 수로 떨어진다. 그 경우 `⛪️` 같은
 * 값이 거절되지만, 검증이 느슨해지는 쪽이 아니라 빡빡해지는 쪽이라 안전하다.
 */
const GRAPHEME_SEGMENTER =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter()
    : null;

function graphemeLength(value: string): number {
  if (!GRAPHEME_SEGMENTER) return [...value].length;

  return [...GRAPHEME_SEGMENTER.segment(value)].length;
}

// ── 필드별 검증 ───────────────────────────────────────────────
/**
 * 주소(slug).
 *
 * **중복인가는 여기서 답하지 않는다** — DB 를 봐야 아는 질문이라 service 가
 * categoryRepository 로 확인한다. 순수 함수라는 이 모듈의 성질을 지키기 위한
 * 경계이며, validateCategoryId(page.ts)에서 이미 같은 선을 그었다.
 */
export function validateSlug(value: string): ValidationResult {
  return validate(value.trim(), [
    required(SLUG_REQUIRED),
    maxLength(SLUG_MAX, SLUG_TOO_LONG),
    pattern(SLUG_PATTERN, SLUG_INVALID),
  ]);
}

export function validateName(value: string): ValidationResult {
  return validate(value.trim(), [
    required(NAME_REQUIRED),
    maxLength(NAME_MAX, NAME_TOO_LONG),
  ]);
}

export function validateFullName(value: string): ValidationResult {
  return validate(value.trim(), [
    required(FULL_NAME_REQUIRED),
    maxLength(FULL_NAME_MAX, FULL_NAME_TOO_LONG),
  ]);
}

/** 이모지 한 글자인가. 자소 수와 그림문자 여부를 함께 본다. */
export function validateIcon(value: string): ValidationResult {
  const icon = value.trim();

  const presence = validate(icon, [required(ICON_REQUIRED)]);
  if (!presence.valid) return presence;

  if (graphemeLength(icon) !== 1) return invalid(ICON_NOT_EMOJI);

  return EMOJI_PATTERN.test(icon) ? VALID : invalid(ICON_NOT_EMOJI);
}

export function validateSortOrder(value: string): ValidationResult {
  return validate(value.trim(), [
    required(SORT_ORDER_REQUIRED),
    pattern(SORT_ORDER_PATTERN, SORT_ORDER_INVALID),
    intInRange(SORT_ORDER_MIN, SORT_ORDER_MAX, SORT_ORDER_INVALID),
  ]);
}

// ── 폼 단위 검증 ──────────────────────────────────────────────
/**
 * 항목 추가 폼의 입력이자 곧 POST 바디의 모양이다.
 *
 * **sortOrder 가 문자열이다.** 폼의 값은 언제나 문자열이고(입력 칸에서 온다),
 * 여기서 number 로 두면 컴포넌트가 검증 이전에 `Number()` 를 부르게 된다 —
 * 그 순간 "빈 칸"과 "0"이 구분되지 않고(둘 다 0), 잘못된 값이 NaN 으로
 * 뭉개져서 붙일 문구가 사라진다. 숫자로 바꾸는 일은 검증을 통과한 뒤
 * parseCategoryForm 이 한 번만 한다.
 */
export type CategoryFormInput = {
  slug: string;
  name: string;
  fullName: string;
  icon: string;
  sortOrder: string;
};

/**
 * 항목 수정 폼의 입력. **slug 가 없다.**
 *
 * slug 는 URL(`/categories/[slug]`)과 코드 분기에 쓰이는 불변 식별자라
 * (CLAUDE.md "카테고리 표시명") 바뀌면 기존 링크가 전부 깨진다. 수정 가능한
 * 것은 표시명(name / fullName)과 아이콘 · 순서뿐이다.
 *
 * **화면에서 읽기 전용으로 그리는 것만으로는 부족하다.** 타입에서 빼야
 * 요청 바디에 slug 가 섞여 들어와도 이 모양으로 옮기는 과정에서 그냥 사라진다
 * (userRepository 의 UpdateUserData 가 role 을 빼 둔 것과 같은 장치).
 */
export type CategoryEditInput = Omit<CategoryFormInput, "slug">;

export type CategoryFormErrors = Partial<Record<keyof CategoryFormInput, string>>;

/** 추가 폼의 필드 규칙을 한 번에 돌린다. 통과하면 빈 객체. */
export function validateCategoryForm(
  input: CategoryFormInput,
): CategoryFormErrors {
  return collectErrors<keyof CategoryFormInput>({
    slug: errorOf(validateSlug(input.slug)),
    ...validateCategoryEdit(input),
  });
}

/** 수정 폼의 필드 규칙. 추가 폼도 slug 를 뺀 나머지에 이 규칙을 그대로 쓴다. */
export function validateCategoryEdit(
  input: CategoryEditInput,
): CategoryFormErrors {
  return collectErrors<keyof CategoryFormInput>({
    name: errorOf(validateName(input.name)),
    fullName: errorOf(validateFullName(input.fullName)),
    icon: errorOf(validateIcon(input.icon)),
    sortOrder: errorOf(validateSortOrder(input.sortOrder)),
  });
}

// ── 바디 좁히기 ───────────────────────────────────────────────
/** 검증을 통과한 추가 입력. sortOrder 가 숫자로 좁혀져 있다. */
export type ParsedCategoryForm = {
  slug: string;
  name: string;
  fullName: string;
  icon: string;
  sortOrder: number;
};

/** 검증을 통과한 수정 입력. slug 가 없다. */
export type ParsedCategoryEdit = Omit<ParsedCategoryForm, "slug">;

export type CategoryFormParseResult =
  | { readonly ok: true; readonly value: ParsedCategoryForm }
  | { readonly ok: false; readonly errors: CategoryFormErrors };

export type CategoryEditParseResult =
  | { readonly ok: true; readonly value: ParsedCategoryEdit }
  | { readonly ok: false; readonly errors: CategoryFormErrors };

/**
 * 임의의 값에서 문자열을 꺼낸다.
 *
 * 숫자를 문자열로 받아 주는 것이 요점이다 — 폼은 sortOrder 를 문자열로 들고
 * 있지만 JSON 으로 오갈 때는 `2` 처럼 숫자로 실릴 수 있다. 여기서 한 모양으로
 * 접어야 검증 규칙이 한 벌로 끝난다. 그 외에는 빈 문자열 → 검증이 걸러낸다.
 */
function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];

  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return "";
}

function toSource(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

/**
 * 폼과 똑같은 규칙으로 검증하되, 통과한 입력을 도메인 값으로 좁혀서 돌려준다.
 *
 * 바디를 unknown 으로 받는다. Route Handler 가 `as CategoryFormInput` 으로 모양을
 * 단정하면 검증 이전에 거짓말이 한 번 들어가고, 그 캐스팅은 라우트마다 복붙된다
 * (parsePageForm 과 같은 규칙).
 */
export function parseCategoryForm(body: unknown): CategoryFormParseResult {
  const source = toSource(body);

  const input: CategoryFormInput = {
    slug: readString(source, "slug"),
    name: readString(source, "name"),
    fullName: readString(source, "fullName"),
    icon: readString(source, "icon"),
    sortOrder: readString(source, "sortOrder"),
  };

  const errors = validateCategoryForm(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      slug: input.slug.trim(),
      name: input.name.trim(),
      fullName: input.fullName.trim(),
      icon: input.icon.trim(),
      sortOrder: Number(input.sortOrder.trim()),
    },
  };
}

/**
 * 수정 바디를 좁힌다. **slug 를 읽지 않는다** — 바디에 실려 와도 여기서 사라지며,
 * UpdateCategoryData 에도 그 필드가 없어 실수로 실어 보낼 수도 없다.
 */
export function parseCategoryEdit(body: unknown): CategoryEditParseResult {
  const source = toSource(body);

  const input: CategoryEditInput = {
    name: readString(source, "name"),
    fullName: readString(source, "fullName"),
    icon: readString(source, "icon"),
    sortOrder: readString(source, "sortOrder"),
  };

  const errors = validateCategoryEdit(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name: input.name.trim(),
      fullName: input.fullName.trim(),
      icon: input.icon.trim(),
      sortOrder: Number(input.sortOrder.trim()),
    },
  };
}
