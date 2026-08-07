// =============================================================
// 이미지 업로드 검증
//
// common.ts 의 공통 규칙을 조합해 만든 순수 함수다. React/DOM 을 모른다 —
// 같은 함수를 에디터(올리기 전 미리 거르기)와 uploadService(진짜 방어선)가
// 함께 쓴다 (CLAUDE.md "검증").
//
// **File 타입을 import 하지 않고 구조로 선언한다.** DOM 의 File 을 쓰면 이
// 모듈이 lib.dom 에 묶이고, 서버(Node)와 클라이언트가 같은 함수를 쓴다는
// 전제가 흐려진다. 필요한 것은 type · size · arrayBuffer 셋뿐이라 그 셋만
// 요구한다 — 브라우저의 File 과 Node 의 FormData 값이 둘 다 그대로 들어맞는다.
// =============================================================

import { invalid, oneOf, VALID, type ValidationResult } from "./common";

// ── 문구 ──────────────────────────────────────────────────────
// 문구의 정본은 검증 모듈이 소유한다. 컴포넌트는 받아서 그리기만 한다.
const FILE_REQUIRED = "⚠️ 이미지 파일을 선택해주세요.";
const TYPE_NOT_ALLOWED = "⚠️ PNG · JPG · WEBP · GIF 이미지만 올릴 수 있습니다.";
const TOO_LARGE = "⚠️ 이미지는 4MB 를 넘을 수 없습니다.";

// ── 한계값 ────────────────────────────────────────────────────
/**
 * 받아 주는 원본 형식.
 *
 * page-images 버킷의 allowed_mime_types 와 같은 넷으로 맞춘다. 여기서 더 넓게
 * 열면 스토리지가 거절하는데 그건 폼에 띄울 문구가 없는 실패다.
 *
 * **SVG 를 넣지 않는다.** SVG 는 이미지가 아니라 스크립트를 품을 수 있는
 * XML 이고, 아래 리사이즈 단계에서 래스터화 대상도 아니다.
 * **HEIC 도 넣지 않는다.** sharp 의 배포용 바이너리가 HEIC 디코드를 빼고
 * 빌드돼 있어서, 받아 주면 검증은 통과하고 변환에서 터진다.
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/**
 * 원본 파일의 상한. **버킷 한도(5MB)가 아니라 4MB 인 것이 의도다.**
 *
 * 이 값이 걸리는 곳은 버킷이 아니라 그 앞의 요청 본문이다. Vercel 서버리스
 * 함수는 요청 바디를 4.5MB 에서 자르고, 그 거절은 우리 코드에 닿기 전에
 * 일어나므로 사용자에게는 문구 없는 413 으로 보인다. 플랫폼이 자르기 전에
 * 우리가 먼저 걸러야 폼에 띄울 문구가 생긴다.
 *
 * 버킷 한도는 리사이즈를 거친 **결과물**에 걸리는 값이라 별개다 — 4MB 짜리
 * 스크린샷도 1600px webp 로 줄면 수백 KB 다.
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * 검증에 필요한 최소 모양. 브라우저의 File 도, Node FormData 가 돌려주는
 * 값도 이 모양을 만족한다.
 */
export type ImageUploadFile = {
  readonly type: string;
  readonly size: number;
  readonly arrayBuffer: () => Promise<ArrayBuffer>;
};

/**
 * `image/png; charset=binary` 처럼 파라미터가 붙어 오는 경우를 접는다.
 * 접지 않으면 정상 파일이 oneOf 에서 걸린다.
 */
function normalizeType(value: string): string {
  return value.split(";")[0].trim().toLowerCase();
}

// ── 필드별 검증 ───────────────────────────────────────────────
/**
 * 올릴 수 있는 이미지인가.
 *
 * **형식을 크기보다 먼저 본다.** 20MB 짜리 PDF 를 올렸을 때 "4MB 를 넘습니다"
 * 라고 답하면 파일을 줄여서 다시 시도하게 된다. 애초에 못 올리는 형식이라는
 * 사실이 먼저 나가야 한다.
 *
 * 0 바이트는 "형식은 맞지만 내용이 없는" 상태다. 여기서 걸러야 sharp 가
 * 원인 없는 실패로 터지는 것을 막는다.
 */
export function validateImageUpload(
  file: { readonly type: string; readonly size: number } | null,
): ValidationResult {
  if (!file) return invalid(FILE_REQUIRED);

  const type = oneOf(ALLOWED_IMAGE_TYPES, TYPE_NOT_ALLOWED)(
    normalizeType(file.type),
  );
  if (!type.valid) return type;

  if (file.size <= 0) return invalid(FILE_REQUIRED);
  if (file.size > MAX_IMAGE_BYTES) return invalid(TOO_LARGE);

  return VALID;
}

// ── 폼 단위 검증 ──────────────────────────────────────────────
export type ImageUploadParseResult =
  | { readonly ok: true; readonly value: ImageUploadFile }
  | { readonly ok: false; readonly errors: { readonly file: string } };

function isUploadFile(value: unknown): value is ImageUploadFile {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ImageUploadFile>;
  return (
    typeof candidate.type === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.arrayBuffer === "function"
  );
}

/**
 * 폼과 똑같은 규칙으로 검증하되, 통과한 입력을 읽을 수 있는 값으로 좁혀
 * 돌려준다 (parsePageForm 과 같은 꼴).
 *
 * multipart 바디에서 꺼낸 값은 파일일 수도 문자열일 수도 없을 수도 있어서
 * unknown 으로 받는다. 라우트가 `as File` 로 단정하면 검증 이전에 거짓말이
 * 한 번 들어간다.
 *
 * 에러 키가 `file` 인 것은 multipart 필드명과 같게 하기 위함이다 — 화면이
 * 어느 자리에 문구를 붙일지 그대로 안다.
 */
export function parseImageUpload(value: unknown): ImageUploadParseResult {
  if (!isUploadFile(value)) return { ok: false, errors: { file: FILE_REQUIRED } };

  const result = validateImageUpload(value);
  if (!result.valid) return { ok: false, errors: { file: result.message } };

  return { ok: true, value };
}
