// =============================================================
// 카테고리 서비스
//
// 읽기는 공개, 쓰기는 ADMIN 전용이다. 두 성질이 한 파일에 있는 것은 도메인이
// 같기 때문이고(레이어는 라우트가 아니라 도메인으로 나눈다), 섞이지 않는 이유는
// 아래 "관리자용" 구역의 모든 함수가 assertRole 로 시작하기 때문이다.
//
// **쓰기 기준이 ADMIN 이다. EDITOR 가 아니다.** 위키 관리(/admin/pages)와 선이
// 다르다 — 카테고리는 사이트의 구조이지 문서가 아니다. 항목 하나를 고치면 홈의
// 원형 버튼과 푸터 목록, 그리고 `/categories/[slug]` 라는 주소 체계가 함께
// 움직인다. 글을 쓰는 권한과는 층위가 다르므로 화면 가드(requireRole("ADMIN"))도
// 같은 선이며, 그쪽이 이 가드를 대체하지 않는다 (API 는 화면을 거치지 않는다).
// =============================================================

import { assertRole } from "@/lib/auth/guards";
import type { SessionPayload } from "@/lib/auth/session";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import * as categoryRepository from "@/lib/repositories/categoryRepository";
import type { AdminCategorySummary, Category } from "@/lib/types";
import {
  CATEGORY_NOT_FOUND,
  SLUG_TAKEN,
  categoryHasPages,
  parseCategoryEdit,
  parseCategoryForm,
} from "@/lib/validation/category";

/** 전체 카테고리를 표시 순서(sortOrder)대로. 홈 · 푸터 · 에디터가 함께 쓴다. */
export async function listCategories(): Promise<Category[]> {
  return categoryRepository.findAll();
}

// ── 관리자용 ──────────────────────────────────────────────────
// 여기부터는 전부 assertRole(session, "ADMIN") 으로 시작한다. 새 함수를 더할 때
// 이 구역 위쪽(공개 조회)에 넣지 마라.

/**
 * 항목 관리 목록 (`/admin/categories`). 각 항목에 문서 수를 달아서 준다.
 *
 * **assertRole 이 첫 줄이다.** 조회조차 그 뒤다 — 권한 없는 요청에 응답 모양이
 * 조금이라도 새어나가면 안 된다 (userService.listUsersForAdmin 과 같은 규칙).
 *
 * 목록이 공개 조회(listCategories)와 갈린 이유는 문서 수 하나다. 그 수를 공개
 * 응답에 얹으면 홈·푸터가 매번 카운트 질의를 끌고 다닌다 (AdminCategorySummary 주석).
 *
 * ── 항목마다 카운트를 한 번씩 도는 것(N+1)이 의도다 ─────────────
 * `group by category_id` 한 방이 더 빨라 보이지만, supabase-js 로 그것을 하려면
 * RPC(DB 함수)를 새로 만들거나 pages 의 category_id 를 전부 읽어 와 TS 에서
 * 세야 한다. 앞은 CLAUDE.md 의 "DB 안에 넣는 로직은 최소로" 와 정면으로
 * 부딪히고(현재 DB 로직은 트리거 하나뿐이다), 뒤는 문서가 늘수록 전송량이
 * 늘어 카운트보다 나빠진다. **N 은 카테고리 수(현재 3)이고 늘어날 여지도 거의
 * 없다** — 페이지네이션이 없는 것과 같은 전제다.
 *
 * 무엇보다 이 카운트가 삭제를 막는 그 카운트와 **같은 함수**여야 한다. 목록의
 * 수와 삭제 판정의 수가 다른 질의에서 나오면 화면이 "0건"이라고 그린 항목의
 * 삭제가 거부되는 어긋남이 생긴다.
 */
export async function listCategoriesForAdmin(
  session: SessionPayload | null,
): Promise<AdminCategorySummary[]> {
  assertRole(session, "ADMIN");

  const categories = await categoryRepository.findAll();

  return Promise.all(
    categories.map(async (category) => ({
      ...category,
      pageCount: await categoryRepository.countPagesByCategoryId(category.id),
    })),
  );
}

/**
 * 항목을 새로 만든다.
 *
 * 순서에 규칙이 있다.
 *   ① 권한 — ADMIN 만.
 *   ② 형식 검증 — 폼과 **같은 규칙**(parseCategoryForm). 두 벌로 짜지 않는다.
 *   ③ slug 중복 — DB 를 봐야 아는 질문이라 검증 모듈이 아니라 여기서 답한다.
 *   ④ INSERT.
 *
 * ③을 두고도 repository 가 unique_violation 을 다시 잡는 것은 중복이 아니다.
 * ③과 ④ 사이에 다른 요청이 같은 slug 를 채갈 수 있고(TOCTOU), 그때 사용자에게
 * 보여줄 문구는 여기서 걸렀을 때와 같아야 한다 — 그래서 양쪽이 같은 정본
 * (SLUG_TAKEN)을 쓴다.
 */
export async function createCategory(
  session: SessionPayload | null,
  input: unknown,
): Promise<Category> {
  assertRole(session, "ADMIN");

  const parsed = parseCategoryForm(input);
  if (!parsed.ok) throw new ValidationError(parsed.errors);

  if (await categoryRepository.findBySlug(parsed.value.slug)) {
    throw new ConflictError({ slug: SLUG_TAKEN });
  }

  return categoryRepository.create(parsed.value);
}

/**
 * 표시명·아이콘·순서를 고친다. **slug 는 바뀌지 않는다.**
 *
 * 바디에 slug 가 실려 와도 parseCategoryEdit 이 읽지 않고, UpdateCategoryData 에도
 * 그 필드가 없다. 검증을 빠뜨렸는지에 의존하지 않고 타입이 경로를 끊는다.
 *
 * 대상 존재 확인을 UPDATE 보다 먼저 한다. supabase-js 의 update 는 맞는 행이
 * 없으면 에러 대신 빈 결과를 주는데, `.single()` 이 그것을 "행 하나가 아니다"라는
 * 드라이버 에러로 바꿔 500 이 된다 — 없는 항목을 고치려 한 것은 404 다.
 */
export async function updateCategory(
  session: SessionPayload | null,
  id: string,
  input: unknown,
): Promise<Category> {
  assertRole(session, "ADMIN");

  const parsed = parseCategoryEdit(input);
  if (!parsed.ok) throw new ValidationError(parsed.errors);

  const target = await categoryRepository.findById(id);
  if (!target) throw new NotFoundError(CATEGORY_NOT_FOUND);

  return categoryRepository.update(id, parsed.value);
}

/**
 * 항목을 지운다.
 *
 * 순서에 규칙이 있다.
 *   ① 권한 — ADMIN 만.
 *   ② 대상이 있는가 — 없으면 404.
 *   ③ 문서가 남았는가 — 한 건이라도 있으면 거부(409). **건수를 문구에 싣는다.**
 *   ④ DELETE.
 *
 * ── ③ 이 이 함수의 전부다 ──────────────────────────────────────
 * 문서를 "미분류"로 옮기지도, 항목에 소프트 삭제를 도입하지도 않는다는 결정의
 * 다른 쪽 면이다. 앞은 `pages.category_id` 를 nullable 로 바꿔야 하는데 그러면
 * 모든 조회·렌더가 "항목 없는 문서"를 다루게 되고, 뒤는 지워진 항목을 계속
 * 걸러내야 하는 조건이 공개 조회 전체에 붙는다. 교회 위키에서 항목은 자주
 * 바뀌지 않으므로 **"문서를 먼저 옮기세요"** 가 스키마도 안 건드리고 사용자에게도
 * 더 명확한 답이다.
 *
 * 그래서 건수가 문구에 실린다. 거절만 하고 수를 말하지 않으면 사용자는 어디를
 * 얼마나 정리해야 이 조작이 끝나는지 알 수 없다.
 *
 * ③과 ④ 사이의 경합(그 틈에 글이 하나 쓰이는 경우)까지는 여기서 막지 못한다.
 * 그 마지막 그물은 FK 제약이고, repository 가 그 거절을 같은 종류의 도메인
 * 에러로 옮긴다 — 잠금을 들이는 대신 DB 가 이미 갖고 있는 보증을 쓴다.
 */
export async function deleteCategory(
  session: SessionPayload | null,
  id: string,
): Promise<void> {
  assertRole(session, "ADMIN");

  const target = await categoryRepository.findById(id);
  if (!target) throw new NotFoundError(CATEGORY_NOT_FOUND);

  const pageCount = await categoryRepository.countPagesByCategoryId(id);
  if (pageCount > 0) {
    throw new ConflictError({}, categoryHasPages(pageCount));
  }

  await categoryRepository.delete(id);
}
