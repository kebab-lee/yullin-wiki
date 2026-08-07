// POST /api/admin/uploads — 본문에 넣을 이미지 업로드
//
// 하는 일은 셋뿐이다: 세션을 읽고, multipart 에서 파일을 꺼내 service 에 넘기고,
// URL 을 JSON 으로 돌려준다.
//
// **여기서 role 을 검사하지 않는다.** 권한 판정은 uploadService.uploadImage 의
// assertRole 이 전담한다 (CLAUDE.md "권한"). 세션 유무만 보는 것은 권한 판정이
// 아니라 "service 에 넘길 신원이 있는가"이며, /api/admin/pages 와 같은 모양이다.
//
// **클라이언트가 스토리지로 직접 올리지 않는 이유가 이 라우트의 존재 이유다.**
// 브라우저에서 버킷으로 바로 쏘면 형식·용량 검증과 리사이즈가 통째로 건너뛰어지고,
// 그 둘은 클라이언트가 지켜 줄 수 있는 규칙이 아니다.

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { ImageUploadedBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/errors";
import * as uploadService from "@/lib/services/uploadService";

/**
 * sharp 는 네이티브 바이너리라 Edge 런타임에서 돌지 않는다. App Router 의
 * 기본값이 이미 nodejs 지만, 기본값에 기대면 나중에 누가 전역 설정을 바꿨을 때
 * 빌드가 아니라 런타임에 터진다. 이 라우트의 제약이므로 여기 명시해 둔다.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    // 파일은 unknown 그대로 넘긴다. 모양을 좁히는 일은 validation 이 한다 —
    // 라우트에서 `as File` 로 캐스팅하면 검증 이전에 거짓말이 한 번 들어간다.
    const form = await request.formData().catch(() => null);
    const image = await uploadService.uploadImage(session, form?.get("file"));

    return NextResponse.json<ImageUploadedBody>(image, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
