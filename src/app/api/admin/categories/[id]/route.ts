// PATCH  /api/admin/categories/[id] — 항목 수정 (표시명 · 아이콘 · 순서)
// DELETE /api/admin/categories/[id] — 항목 삭제
//
// **slug 는 이 경로로 바뀌지 않는다.** 바디에 실려 와도 parseCategoryEdit 이 읽지
// 않고 UpdateCategoryData 에도 그 필드가 없다 — URL(`/categories/[slug]`)과 코드
// 분기가 걸린 불변 식별자라 바뀌면 기존 링크가 전부 깨진다 (CLAUDE.md
// "카테고리 표시명"). 화면의 읽기 전용 표시는 안내일 뿐 방어가 아니다.
//
// **삭제는 문서가 한 건이라도 있으면 거부된다(409).** 미분류로 옮기지도, 소프트
// 삭제로 감추지도 않는다 — 근거와 순서는 categoryService.deleteCategory 에 있다.
//
// 여기서 role 을 검사하지 않는 것은 형제 라우트와 같은 규칙이다. 권한 판정은
// categoryService 의 assertRole 이 전담한다.

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { CategoryUpdatedBody } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/errors";
import * as categoryService from "@/lib/services/categoryService";

/**
 * 공개 화면의 카테고리 캐시를 턴다 (REVALIDATE.categories = 3600).
 *
 * revalidateTag 가 아니라 revalidatePath 를 쓰는 이유, 그리고 이 코드가 Java
 * 이관 때 어떻게 되는지는 형제 라우트(../route.ts)의 같은 함수 주석에 적어 두었다.
 * 두 줄짜리 함수를 공용 모듈로 빼지 않는 것은 의도다 — Next 전용 관심사가
 * `src/app/api/**` 밖으로 나가는 순간 이관 시 손댈 곳이 그 레이어를 벗어난다.
 */
function revalidateCategories(): void {
  revalidatePath("/", "layout");
}

export async function PATCH(
  request: Request,
  // Next 15 에서 동적 세그먼트는 Promise 로 온다.
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);

    const category = await categoryService.updateCategory(session, id, body);
    revalidateCategories();

    return NextResponse.json<CategoryUpdatedBody>({ id: category.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const { id } = await params;

    await categoryService.deleteCategory(session, id);
    revalidateCategories();

    // 204. 돌려줄 것이 없다 — 화면이 성공 후에 하는 일은 팝업을 닫고 목록을
    // 다시 그리는 것뿐이다.
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
