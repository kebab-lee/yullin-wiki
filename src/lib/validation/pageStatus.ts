// =============================================================
// 게시물 상태 전환 규칙
//
// **허용 전환을 표 하나로 둔다.** service 에 `if (page.status === 'DRAFT') …`
// 를 흩뿌리면 규칙이 함수 수만큼 늘어나고, 상태가 하나 늘 때 어느 조건절을
// 고쳐야 하는지 알 수 없게 된다. 여기는 표와 그 표를 읽는 순수 함수뿐이며
// DB·HTTP·React 를 모른다 — Java 이관 시 그대로 enum + EnumMap 이 된다.
//
// 문구의 정본도 검증 모듈이 갖는다 (CLAUDE.md "검증"). service 는 문구를 만들지
// 않고 여기서 받아 ValidationError 에 실어 던진다.
// =============================================================

import type { PageStatus } from "@/lib/types";

// ── 문구 ──────────────────────────────────────────────────────
export const STATUS_UNKNOWN = "⚠️ 알 수 없는 상태입니다.";
export const STATUS_ALREADY = "⚠️ 이미 해당 상태입니다.";
export const STATUS_NOT_ALLOWED = "⚠️ 이 상태로는 바꿀 수 없습니다.";

/**
 * 상태별로 **갈 수 있는 곳**의 목록. 여기 없는 조합은 전부 거절이다.
 *
 *   DRAFT     → PUBLISHED   발행. 초안이 세상에 나오는 유일한 길.
 *   PUBLISHED → HIDDEN      숨김.
 *   HIDDEN    → PUBLISHED   숨김 해제.
 *
 * 빠진 조합의 근거:
 *   DRAFT → HIDDEN      발행된 적 없는 글은 감출 것이 없다. 감춤은 "보이던 것을
 *                       안 보이게 하는" 조작이고 초안은 애초에 안 보인다.
 *                       (초안을 안 보이게 두고 싶으면 그냥 두면 된다)
 *   PUBLISHED → DRAFT   발행 취소는 숨김(HIDDEN)이 이미 답하는 요구다. 두 길을
 *   HIDDEN    → DRAFT   열면 "공개 안 되는 글"이 두 값으로 갈려 어드민 목록이
 *                       같은 것을 두 곳에서 세게 된다.
 *   자기 자신 → 자기 자신 아래 canTransition 이 별도로 막는다 (문구가 다르다).
 *
 * 삭제(deleted_at)는 이 표에 없다. 상태 축이 아니기 때문이다.
 */
const ALLOWED: Readonly<Record<PageStatus, readonly PageStatus[]>> = {
  DRAFT: ["PUBLISHED"],
  PUBLISHED: ["HIDDEN"],
  HIDDEN: ["PUBLISHED"],
};

export type TransitionResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly message: string };

/**
 * from 에서 to 로 갈 수 있는가.
 *
 * 같은 상태로의 전환을 "허용"이 아니라 별도 실패로 답하는 이유: 멱등하게 통과
 * 시키면 "숨김 해제"를 두 번 눌렀을 때 두 번 다 성공으로 보이는데, 실제로는
 * 두 번째 요청이 아무것도 하지 않았다. 화면이 그 차이를 알아야 한다.
 */
export function canTransition(
  from: PageStatus,
  to: PageStatus,
): TransitionResult {
  if (from === to) return { valid: false, message: STATUS_ALREADY };

  return ALLOWED[from].includes(to)
    ? { valid: true }
    : { valid: false, message: STATUS_NOT_ALLOWED };
}

// ── 바디 좁히기 ───────────────────────────────────────────────
/**
 * 상태 변경 요청이 지정할 수 있는 값.
 *
 * **DRAFT 가 없는 것이 의도다.** 발행·숨김·숨김 해제는 운영 조작이지만 "초안으로
 * 되돌리기"는 위 표에 없는 전환이라, 받아 두면 항상 400 으로 끝나는 값을 계약에
 * 적어 두는 셈이 된다.
 */
export const CHANGEABLE_STATUSES = ["PUBLISHED", "HIDDEN"] as const;

export type ChangeableStatus = (typeof CHANGEABLE_STATUSES)[number];

export type StatusChangeParseResult =
  | { readonly ok: true; readonly status: ChangeableStatus }
  | { readonly ok: false; readonly message: string };

function isChangeable(value: unknown): value is ChangeableStatus {
  return (
    typeof value === "string" &&
    (CHANGEABLE_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * `PATCH /api/admin/pages/[id]/status` 의 바디를 좁힌다.
 *
 * 라우트가 `as { status: PageStatus }` 로 단정하지 않도록 좁히기를 검증 쪽에
 * 모아 둔다 (parsePageForm 과 같은 규칙).
 */
export function parseStatusChange(body: unknown): StatusChangeParseResult {
  const source: Record<string, unknown> =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  return isChangeable(source.status)
    ? { ok: true, status: source.status }
    : { ok: false, message: STATUS_UNKNOWN };
}

// ── 작성 시점의 상태 ──────────────────────────────────────────
/**
 * 새 게시물이 가질 수 있는 상태. "게시하기"와 "임시저장" 두 버튼에 대응한다.
 *
 * HIDDEN 이 없다 — 숨김은 발행된 글에만 의미가 있고(위 표), 처음부터 감춰서
 * 만들 글은 그냥 DRAFT 다.
 *
 * **클라이언트가 보내는 것은 상태값이 아니라 의도다.** 그 의도를 무엇으로
 * 해석할지(발행 시각을 언제로 찍을지, 무엇이 공개인지)는 pageService 가 정한다 —
 * 규칙이 폼으로 내려가면 안 된다는 원래 원칙은 그대로다.
 *
 * 값이 없거나 이상하면 PUBLISHED 로 본다. 상태를 싣지 않던 예전 클라이언트의
 * 요청이 곧 "발행"이었기 때문이다.
 */
export function parseCreateStatus(body: unknown): PageStatus {
  const source: Record<string, unknown> =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  return source.status === "DRAFT" ? "DRAFT" : "PUBLISHED";
}
