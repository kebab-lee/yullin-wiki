// =============================================================
// 업로드 서비스 — 본문에 넣을 이미지를 받아 스토리지에 올린다
//
// pageService 가 아니라 별도 파일인 이유: service 는 라우트 경로가 아니라
// **도메인 기준**으로 나눈다 (CLAUDE.md "레이어 규칙"). 업로드는 게시물이
// 아직 없을 때도 일어나고(작성 중), 나중에 프로필 이미지처럼 게시물과 무관한
// 곳에서도 쓰인다. pages 의 규칙과 한 파일에 두면 그때 갈라내야 한다.
//
// 스토리지가 어디인지 모른다 — storageRepository 의 인터페이스만 안다.
// 아는 것은 "무엇을 허용하고, 어떻게 줄이고, 어떤 이름으로 저장하는가" 뿐이고
// 그 셋이 Java 로 그대로 옮겨갈 규칙이다.
// =============================================================

import { randomUUID } from "node:crypto";

import sharp from "sharp";

import { assertRole } from "@/lib/auth/guards";
import type { SessionPayload } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import * as storageRepository from "@/lib/repositories/storageRepository";
import { parseImageUpload } from "@/lib/validation/upload";

/**
 * 긴 변의 상한. 본문 폭이 832px(Figma 기준)이라 2배 해상도(Retina)를 덮고도
 * 남는 값이며, 원본 그대로 두면 무료 티어가 금방 찬다.
 */
const MAX_EDGE = 1600;

/**
 * webp 로 통일한다. 같은 화질에서 PNG 스크린샷보다 훨씬 작고, 우리가 받는
 * 네 형식 모두 webp 로 나갈 수 있어 저장된 파일의 형식이 하나로 정해진다
 * (렌더 쪽에서 형식별 분기가 생기지 않는다).
 */
const OUTPUT_CONTENT_TYPE = "image/webp";
const OUTPUT_EXTENSION = "webp";
const WEBP_QUALITY = 82;

const DECODE_FAILED =
  "⚠️ 이미지를 읽을 수 없습니다. 파일이 손상되었는지 확인해주세요.";

/** 업로드 결과. 화면이 src 에 그대로 넣을 URL 하나뿐이다. */
export type UploadedImage = { url: string };

/**
 * 저장 경로를 만든다. **클라이언트가 보낸 파일명은 쓰지 않는다.**
 *
 * 사용자 입력이 경로에 들어가면 두 가지가 열린다 — `../` 로 버킷 안 다른
 * 자리를 짚는 경로 조작, 그리고 같은 이름으로 남의 파일을 덮어쓰는 일이다.
 * uuid 는 둘 다 원천적으로 닫는다(추측도 불가능하다). 한글 파일명이 URL
 * 인코딩으로 깨지는 문제도 같이 사라진다.
 *
 * 연/월로 나누는 것은 나중에 스토리지를 사람이 들여다볼 때를 위한 것이다.
 * 한 폴더에 수천 개가 쌓이면 콘솔에서 아무것도 찾을 수 없다.
 */
function buildObjectPath(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}/${month}/${randomUUID()}.${OUTPUT_EXTENSION}`;
}

/**
 * 원본을 긴 변 MAX_EDGE 의 webp 로 줄인다.
 *
 * `fit: "inside"` + `withoutEnlargement` — 비율을 유지하고, 이미 작은 이미지는
 * 늘리지 않는다. 작은 아이콘을 1600px 로 부풀리면 용량만 커지고 화질은 나빠진다.
 *
 * `animated: true` 는 GIF 의 프레임을 전부 살려 애니메이션 webp 로 내보낸다.
 * 빼면 첫 프레임만 남아 움직이던 이미지가 조용히 정지 이미지가 된다.
 *
 * `.rotate()` 는 JPEG 에만 건다. 인자 없는 rotate 는 EXIF orientation 을
 * 적용하는 것인데, 그 정보를 갖는 것은 우리가 받는 넷 중 JPEG 뿐이고,
 * 다중 프레임 이미지에는 sharp 가 회전을 지원하지 않아 GIF 에서 터진다.
 *
 * sharp 는 기본적으로 메타데이터를 떨어뜨린다. 사진의 GPS 좌표가 공개 버킷에
 * 올라가지 않는다는 뜻이라 그대로 둔다(withMetadata 를 켜지 마라).
 *
 * 디코드 실패를 500 이 아니라 ValidationError 로 옮긴다. 여기까지 온 실패의
 * 실질은 "이 파일로는 안 된다"이고, 그건 사용자가 다른 파일을 골라 고칠 수
 * 있는 문제다 — content type 만 이미지인 파일이 대표적이다.
 */
async function toWebp(source: Uint8Array, type: string): Promise<Uint8Array> {
  const pipeline = sharp(source, { animated: true });

  if (type.startsWith("image/jpeg")) pipeline.rotate();

  try {
    return await pipeline
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    throw new ValidationError({ file: DECODE_FAILED });
  }
}

/**
 * 본문 이미지 한 장을 올린다.
 *
 * **권한 검증이 첫 줄이다** (pageService.createPage 와 같은 규칙). 검증 전에는
 * 파일을 읽지도 않는다 — 권한 없는 요청에 "4MB 를 넘습니다" 가 나가면 그것만으로
 * 어드민 API 의 계약이 새어나가고, 더 실질적으로는 아무나 서버에 이미지 변환
 * 작업을 시킬 수 있게 된다.
 *
 * 기준이 EDITOR 인 것은 게시물 작성과 같다. 본문에 넣을 이미지를 올리는 일은
 * 글을 쓰는 일의 일부이므로 두 권한이 갈리면 안 된다 — ADMIN 은 hasRole 의
 * 계층 비교로 자연히 통과한다.
 *
 * **route 에서 role 을 보지 않는다.** 판정은 이 줄 하나뿐이고, 그래서 Spring 의
 * @PreAuthorize 로 그대로 옮겨간다.
 */
export async function uploadImage(
  session: SessionPayload | null,
  input: unknown,
): Promise<UploadedImage> {
  assertRole(session, "EDITOR");

  const parsed = parseImageUpload(input);
  if (!parsed.ok) throw new ValidationError(parsed.errors);

  // 크기·형식을 통과한 뒤에야 메모리로 읽는다. 순서가 바뀌면 상한 검사가
  // 무의미해진다 — 이미 다 읽은 뒤이기 때문이다.
  const source = new Uint8Array(await parsed.value.arrayBuffer());

  const output = await toWebp(source, parsed.value.type);

  return storageRepository.upload(
    { data: output, contentType: OUTPUT_CONTENT_TYPE },
    buildObjectPath(),
  );
}
