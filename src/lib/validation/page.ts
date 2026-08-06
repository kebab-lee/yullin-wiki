// =============================================================
// 게시물(작성) 검증
//
// common.ts 의 공통 규칙을 조합해 필드별 규칙을 만든다. 순수 함수이며
// React/DOM 을 모른다 — 같은 함수를 에디터 폼과 pageService 가 함께 쓴다.
// 클라이언트 검증은 편의고 진짜 방어선은 service 다.
//
// **본문(content)의 좁히기가 여기 있는 이유.** 밖에서 들어오는 본문은
// 신뢰할 수 없는 unknown 이고, 그것을 도메인 정본인 PageContent 로 바꾸는
// 판정은 "값이 규칙에 맞는가"와 같은 질문이다. 그래서 Tiptap 의 JSONContent 를
// 아는 유일한 도메인 쪽 파일이 여기다 — 타입 전용 import 라 런타임 의존은
// 없고, 도메인 모델(types/page.ts)은 계속 PageContent 만 안다.
// =============================================================

import type { JSONContent } from "@tiptap/core";

import type { PageContent } from "@/lib/types";

import {
  collectErrors,
  errorOf,
  invalid,
  maxLength,
  required,
  validate,
  VALID,
  type ValidationResult,
} from "./common";

// ── 문구 ──────────────────────────────────────────────────────
// 문구의 정본은 검증 모듈이 소유한다. 컴포넌트는 받아서 그리기만 한다.
const TITLE_REQUIRED = "⚠️ 제목을 입력해주세요.";
const TITLE_TOO_LONG = "⚠️ 제목은 200자를 넘을 수 없습니다.";
const CATEGORY_REQUIRED = "⚠️ 항목을 선택해주세요.";
export const CATEGORY_NOT_FOUND = "⚠️ 존재하지 않는 항목입니다.";
const CONTENT_REQUIRED = "⚠️ 내용을 입력해주세요.";
const CONTENT_MALFORMED = "⚠️ 본문 형식을 확인해주세요.";
const TAG_TOO_LONG = "⚠️ 태그는 30자를 넘을 수 없습니다.";
const TAG_TOO_MANY = "⚠️ 태그는 최대 10개까지 붙일 수 있습니다.";

// ── 한계값 ────────────────────────────────────────────────────
// pages.title varchar(200) / tags.name varchar(30) 과 맞춘다. 여기서 막지 않으면
// DB 가 22001 로 거절하는데, 그건 폼에 띄울 문구가 없는 실패다.
const TITLE_MAX = 200;
const TAG_MAX = 30;
const TAG_COUNT_MAX = 10;

/**
 * 텍스트가 없어도 본문이 비어 있지 않은 것으로 치는 노드.
 *
 * 이미지 한 장만 올린 글은 plain_text 가 빈 문자열이지만 분명히 내용이 있다.
 * "글자가 없으면 빈 글"이라고 판정하면 그런 글을 저장할 수 없다.
 */
const LEAF_NODE_TYPES = new Set(["image", "horizontalRule"]);

// ── 본문 좁히기 ───────────────────────────────────────────────
function isJsonContent(value: unknown): value is JSONContent {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 문서에 실제로 읽을 것이 있는가.
 *
 * Tiptap 은 아무것도 안 쓴 상태에서도 빈 문단 하나를 담은 doc 을 내보내므로
 * `content.length > 0` 으로는 빈 글을 걸러내지 못한다. 텍스트 노드나 leaf 노드가
 * 하나라도 있어야 내용이 있는 것으로 본다.
 *
 * plain_text 추출(pageService)과 순회가 비슷하지만 답하는 질문이 다르다 —
 * 이쪽은 "저장을 허용할 것인가", 저쪽은 "검색용 사본에 무엇을 담을 것인가"다.
 * 레이어도 다르므로(validation 은 클라이언트도 쓴다) 합치지 않는다.
 */
function hasReadableContent(node: JSONContent): boolean {
  if (typeof node.text === "string" && node.text.trim().length > 0) return true;
  if (node.type && LEAF_NODE_TYPES.has(node.type)) return true;

  return (node.content ?? []).some(hasReadableContent);
}

// ── 필드별 검증 ───────────────────────────────────────────────
export function validateTitle(value: string): ValidationResult {
  return validate(value.trim(), [
    required(TITLE_REQUIRED),
    maxLength(TITLE_MAX, TITLE_TOO_LONG),
  ]);
}

/**
 * 항목이 선택되었는가. **존재하는 항목인가는 여기서 답하지 않는다** —
 * 그건 DB 를 봐야 아는 질문이라 service 가 categoryRepository 로 확인한다.
 * 순수 함수라는 이 모듈의 성질을 지키기 위한 경계다.
 */
export function validateCategoryId(value: string): ValidationResult {
  return validate(value.trim(), [required(CATEGORY_REQUIRED)]);
}

export function validateContent(value: unknown): ValidationResult {
  if (!isJsonContent(value) || value.type !== "doc") {
    return invalid(CONTENT_MALFORMED);
  }

  return hasReadableContent(value) ? VALID : invalid(CONTENT_REQUIRED);
}

export function validateTags(values: readonly string[]): ValidationResult {
  if (values.length > TAG_COUNT_MAX) return invalid(TAG_TOO_MANY);

  for (const tag of values) {
    const result = validate(tag.trim(), [maxLength(TAG_MAX, TAG_TOO_LONG)]);
    if (!result.valid) return result;
  }
  return VALID;
}

// ── 폼 단위 검증 ──────────────────────────────────────────────
/**
 * 새 게시물 입력. 에디터 폼의 상태이자 곧 POST 바디의 모양이다.
 *
 * content 만 unknown 인 이유: 서버는 이 값을 네트워크에서 받으므로 파싱 전까지
 * 모양을 알 수 없고, 클라이언트는 `editor.getJSON()` 을 그대로 넣기만 하면 된다
 * (JSONContent 는 unknown 에 그대로 들어간다). 양쪽이 같은 타입을 쓴다.
 */
export type NewPageInput = {
  title: string;
  categoryId: string;
  content: unknown;
  tags: readonly string[];
};

export type NewPageErrors = Partial<Record<keyof NewPageInput, string>>;

/** 필드별 규칙을 한 번에 돌린다. 통과하면 빈 객체. 에디터 폼이 쓴다. */
export function validateNewPage(input: NewPageInput): NewPageErrors {
  return collectErrors<keyof NewPageInput>({
    title: errorOf(validateTitle(input.title)),
    categoryId: errorOf(validateCategoryId(input.categoryId)),
    content: errorOf(validateContent(input.content)),
    tags: errorOf(validateTags(input.tags)),
  });
}

/** 검증을 통과한 새 게시물 입력. content 가 도메인 타입으로 좁혀져 있다. */
export type ParsedNewPageInput = {
  title: string;
  categoryId: string;
  content: PageContent;
  tags: readonly string[];
};

export type NewPageParseResult =
  | { readonly ok: true; readonly value: ParsedNewPageInput }
  | { readonly ok: false; readonly errors: NewPageErrors };

/** 임의의 값에서 문자열만 안전하게 꺼낸다. 아니면 빈 문자열 → 검증이 걸러낸다. */
function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

/**
 * 태그 배열을 다듬는다 — 공백 제거 · 빈 값 제거 · **중복 제거**.
 *
 * 중복 제거가 편의가 아니라 필수인 이유: repository 의 태그 upsert 가 같은
 * 이름을 한 번에 두 번 넣으면 Postgres 가 "ON CONFLICT DO UPDATE command cannot
 * affect row a second time" 으로 거절한다. 그 사정을 저장 시점에 알게 되면
 * 사용자에게는 원인 없는 500 으로 보인다.
 */
function readTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const tag = item.trim();
    if (tag) seen.add(tag);
  }
  return [...seen];
}

/**
 * 폼과 똑같은 규칙으로 검증하되, 통과한 입력을 도메인 값으로 좁혀서 돌려준다.
 *
 * 바디를 unknown 으로 받는다. Route Handler 가 `as NewPageInput` 같은 캐스팅으로
 * 모양을 단정하면 검증 이전에 거짓말이 한 번 들어가는 셈이고, 그 캐스팅은
 * 라우트마다 복붙된다. 좁히기를 검증과 같은 자리에서 끝낸다.
 */
export function parseNewPage(body: unknown): NewPageParseResult {
  const source: Record<string, unknown> =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const input: NewPageInput = {
    title: readString(source, "title"),
    categoryId: readString(source, "categoryId"),
    content: source.content,
    tags: readTags(source.tags),
  };

  const errors = validateNewPage(input);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // validateContent 를 통과했으므로 doc 이다. 그 사실을 타입으로 옮기는 캐스팅이
  // 여기 한 번뿐이도록 좁히기를 이 함수에 모아 둔다.
  const content = input.content as JSONContent;

  return {
    ok: true,
    value: {
      title: input.title.trim(),
      categoryId: input.categoryId.trim(),
      content: { ...content, type: "doc" },
      tags: input.tags,
    },
  };
}
