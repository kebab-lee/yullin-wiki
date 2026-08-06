// =============================================================
// 도메인 에러
//
// service 레이어가 실패를 "의미"로 던지고, Route Handler(src/lib/api/handleError.ts)가
// 그 의미를 HTTP 상태 코드로 옮긴다. service 는 상태 코드를 모른다 —
// 그래야 Java 이관 시 그대로 @ResponseStatus 예외로 대응된다.
//
// fields 는 "어느 입력 칸이 문제인가"를 담는다. 폼이 필드 아래에 문구를
// 그대로 띄울 수 있어야 하므로, 문구의 정본은 validation 모듈이 소유한다.
// =============================================================

/** 필드명 → 사용자에게 보일 문구. 키는 폼 입력 필드명과 같다. */
export type FieldErrors = Record<string, string>;

/** 입력값이 규칙을 어겼다. → 400 */
export class ValidationError extends Error {
  readonly fields: FieldErrors;

  constructor(fields: FieldErrors, message = "입력값을 확인해주세요.") {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
  }
}

/** 값 자체는 올바르나 이미 점유된 상태다 (아이디 중복 등). → 409 */
export class ConflictError extends Error {
  readonly fields: FieldErrors;

  constructor(fields: FieldErrors, message = "이미 사용 중인 값입니다.") {
    super(message);
    this.name = "ConflictError";
    this.fields = fields;
  }
}

/**
 * 누구인지 모른다 — 세션이 없거나, 만료됐거나, 자격 증명이 틀렸다. → 401
 *
 * fields 가 없다. 로그인 실패는 어느 칸이 틀렸는지 알려주면 안 되기 때문이다
 * (계정 열거 공격). 폼 단위 문구 하나로만 답한다.
 */
export class UnauthorizedError extends Error {
  constructor(message = "로그인이 필요합니다.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * 요청한 리소스가 없다 — 없는 slug, 없는 게시물 id, 비공개(DRAFT)·삭제된 게시물. → 404
 *
 * fields 가 없다. 어느 입력 칸이 틀린 문제가 아니라 대상 자체가 없는 것이라
 * 폼 단위 문구 하나로만 답한다.
 *
 * "삭제됨"과 "없음"을 구분해서 알려주지 않는다 — 비공개 게시물의 존재 여부가
 * 상태 코드로 새어나가지 않게 둘 다 404 로 답한다.
 */
export class NotFoundError extends Error {
  constructor(message = "요청하신 대상을 찾을 수 없습니다.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** 누구인지는 알지만 권한이 없다. → 403 */
export class ForbiddenError extends Error {
  constructor(message = "권한이 없습니다.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
