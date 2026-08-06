// GET /api/categories — 전체 카테고리 (sortOrder 오름차순)
//
// 홈 카테고리 버튼 · 푸터(fullName) · 에디터 셀렉트가 모두 이 응답 하나를 본다.
// 어느 표시명을 쓸지는 화면이 정하므로 여기서 name/fullName 을 가려서 내리지
// 않는다 (CLAUDE.md "카테고리 표시명").

import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type { CategoryListBody } from "@/lib/api/types";
import * as categoryService from "@/lib/services/categoryService";

export async function GET() {
  try {
    const categories = await categoryService.listCategories();

    return NextResponse.json<CategoryListBody>({ categories });
  } catch (error) {
    return handleError(error);
  }
}
