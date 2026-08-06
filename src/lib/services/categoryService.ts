// =============================================================
// 카테고리 서비스
//
// 카테고리는 공개 읽기 전용이다 (관리 UI 를 만들지 않는다 — 항목은 시드로
// 고정). 권한 판단이 없는 것은 규칙을 빠뜨린 게 아니라 이 도메인의 규칙이다.
//
// 그래도 repository 를 route handler 가 직접 부르지 않고 이 레이어를 거친다.
// 나중에 "숨김 카테고리" 같은 규칙이 생기면 붙일 자리가 여기 하나여야 한다.
// =============================================================

import * as categoryRepository from "@/lib/repositories/categoryRepository";
import type { Category } from "@/lib/types";

/** 전체 카테고리를 표시 순서(sortOrder)대로. 홈 · 푸터 · 에디터가 함께 쓴다. */
export async function listCategories(): Promise<Category[]> {
  return categoryRepository.findAll();
}
