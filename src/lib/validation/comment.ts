// =============================================================
// 댓글 검증
//
// common.ts 의 공통 규칙을 조합한다. 순수 함수이며 React/DOM 을 모른다 —
// 같은 함수를 댓글 폼(클라이언트)과 commentService(서버)가 함께 쓴다.
// 클라이언트 검증은 편의고 진짜 방어선은 service 다.
//
// **게시물 본문(page.ts)과 결정적으로 다른 점: 댓글은 평문이다.** 여기에
// ProseMirror JSON 을 좁히는 코드가 들어오면 안 된다. 댓글 본문은 문자열
// 하나이고, 화면에서는 JSX 텍스트로 렌더된다(React 가 이스케이프한다).
// =============================================================

import {
  lengthBetween,
  required,
  validate,
  type ValidationResult,
} from "./common";

// ── 문구 ──────────────────────────────────────────────────────
const CONTENT_REQUIRED = "⚠️ 댓글 내용을 입력해주세요.";
const CONTENT_TOO_LONG = "⚠️ 댓글은 1000자를 넘을 수 없습니다.";

/** service 가 쓰는 문구. 폼이 미리 판정할 수 없는 규칙들이다. */
export const PARENT_NOT_FOUND = "⚠️ 답글을 달 댓글을 찾을 수 없습니다.";
export const PARENT_TOO_DEEP = "⚠️ 답글에는 다시 답글을 달 수 없습니다.";

// ── 한계값 ────────────────────────────────────────────────────
/**
 * 본문 최대 길이.
 *
 * **DB 가 정해 주지 않는 값이다.** comments.content 는 `text` 라 길이 제한이
 * 없고, 제한이 없으면 목록 응답 한 건의 크기가 사실상 무한이 된다(댓글은
 * 페이지네이션 없이 전부 내려간다).
 *
 * 1000 자로 잡은 근거는 화면이다. Figma 의 댓글 항목(1:546)은 800px 폭에
 * 높이 89 / 137 두 판뿐이고, 본문 폭 569px 기준 한 줄이 대략 35자다 —
 * 시안이 상정한 댓글은 길어야 서너 줄이다. 1000 자면 그보다 한참 여유가
 * 있어 정상적인 의견은 잘리지 않으면서, 한 건이 목록을 통째로 밀어내는
 * 일도 막힌다. pages.title(200)처럼 DB 가 22001 로 거절하는 값이 아니라
 * 순수한 업무 규칙이므로 정본은 이 상수 하나다.
 */
export const COMMENT_CONTENT_MAX = 1000;

// ── 필드별 검증 ───────────────────────────────────────────────
/**
 * 본문이 규칙에 맞는가.
 *
 * 앞뒤 공백을 걷어낸 값으로 판정한다. 공백만 친 댓글은 DB 의
 * comments_content_chk(`length(trim(content)) > 0`)가 어차피 거절하는데,
 * 그건 폼에 띄울 문구가 없는 실패다.
 *
 * 길이 상한도 같은 trim 값에 건다 — 뒤에 공백 1000자를 붙여 상한을 넘기는
 * 입력을 "너무 김"으로 답하면 사용자는 무엇을 지워야 할지 알 수 없다.
 */
export function validateCommentContent(value: string): ValidationResult {
  return validate(value.trim(), [
    required(CONTENT_REQUIRED),
    lengthBetween(1, COMMENT_CONTENT_MAX, CONTENT_TOO_LONG),
  ]);
}

// ── 폼 단위 검증 ──────────────────────────────────────────────
/**
 * 댓글 폼 입력. 폼의 상태이자 곧 POST 바디의 모양이다.
 *
 * **작성자가 없다.** authorId 는 세션에서 오고 요청 바디의 값은 신뢰하지
 * 않는다 (pageService 가 작성자를 입력에서 받지 않는 것과 같은 규칙).
 */
export type CommentFormInput = {
  content: string;
  /** 최상위 댓글이면 null. 값이 있으면 그 댓글에 대한 답글이다. */
  parentId: string | null;
  isAnonymous: boolean;
};

export type CommentFormErrors = Partial<Record<"content", string>>;

/** 폼과 service 가 함께 쓰는 필드별 규칙. 통과하면 빈 객체. */
export function validateCommentForm(
  input: Pick<CommentFormInput, "content">,
): CommentFormErrors {
  const result = validateCommentContent(input.content);
  return result.valid ? {} : { content: result.message };
}

export type CommentFormParseResult =
  | { readonly ok: true; readonly value: CommentFormInput }
  | { readonly ok: false; readonly errors: CommentFormErrors };

/**
 * 바디를 unknown 으로 받아 검증하고, 통과한 입력만 좁혀서 돌려준다.
 *
 * Route Handler 가 `as CommentFormInput` 으로 단정하면 검증 이전에 거짓말이
 * 한 번 들어가고 그 캐스팅이 라우트마다 복붙된다 (parsePageForm 과 같은 규칙).
 *
 * parentId 는 문자열이 아니면 null 로 접는다. "답글이 아니다"와 "이상한 값이
 * 왔다"를 같게 취급하는 것은 이 값이 폼의 입력 칸이 아니라 화면이 붙이는
 * 파라미터이기 때문이다 — 틀렸을 때 문구를 띄울 자리가 없다. 실재하는 댓글인지,
 * 같은 게시물인지, 답글의 답글은 아닌지는 DB 를 봐야 아는 질문이라 service 가
 * 답한다 (validateCategoryId 가 존재 여부를 판정하지 않는 것과 같은 경계).
 */
export function parseCommentForm(body: unknown): CommentFormParseResult {
  const source: Record<string, unknown> =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const content = typeof source.content === "string" ? source.content : "";
  const parentId =
    typeof source.parentId === "string" && source.parentId.trim().length > 0
      ? source.parentId.trim()
      : null;

  const errors = validateCommentForm({ content });
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      // 저장되는 값은 trim 된 본문이다. 검증이 본 값과 저장되는 값이 달라지면
      // 상한을 통과한 입력이 DB 에서는 다른 길이가 된다.
      content: content.trim(),
      parentId,
      // 값이 없으면 실명이다. 익명은 사용자가 명시적으로 켤 때만 켜진다.
      isAnonymous: source.isAnonymous === true,
    },
  };
}

/** 삭제 권한이 없을 때의 문구. service 가 던지고 화면이 그대로 그린다. */
export const COMMENT_DELETE_FORBIDDEN = "본인이 작성한 댓글만 삭제할 수 있습니다.";

/** 없는 댓글 · 이미 지워진 댓글. */
export const COMMENT_NOT_FOUND = "댓글을 찾을 수 없습니다.";
