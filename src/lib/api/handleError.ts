// =============================================================
// 도메인 에러 → HTTP 응답
//
// 매핑을 route 마다 복붙하면 라우트가 늘어날 때마다 상태 코드가 갈린다.
// 이 파일이 유일한 매핑 지점이다.
//
//   ValidationError   → 400
//   UnauthorizedError → 401
//   ForbiddenError    → 403
//   ConflictError     → 409
//   그 외             → 500 (내부 사정은 클라이언트에 노출하지 않는다)
// =============================================================

import { NextResponse } from "next/server";

import type { ApiErrorBody } from "@/lib/api/types";
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";

const INTERNAL_ERROR_MESSAGE =
  "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";

export function handleError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { message: error.message, fields: error.fields },
      { status: 400 },
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      { message: error.message, fields: error.fields },
      { status: 409 },
    );
  }

  // 예상 못 한 실패(DB 장애 등). 원인은 서버 로그에만 남긴다.
  console.error("[api] unhandled error", error);
  return NextResponse.json(
    { message: INTERNAL_ERROR_MESSAGE },
    { status: 500 },
  );
}
