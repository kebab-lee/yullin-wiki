// =============================================================
// categories 테이블 접근
//
// DB row(snake_case)를 도메인 모델(Category, camelCase)로 옮기는 것이 이 레이어의
// 책임이다. full_name → fullName 변환이 여기서 끝나야 프론트가 Java 백엔드로
// 갈아끼워도 그대로 붙는다.
//
// 표시명은 name(짧은 형)/full_name(긴 형) 두 벌이 정본이며 한쪽으로 통일하지
// 않는다. 어느 쪽을 쓸지는 화면이 정한다 (CLAUDE.md "카테고리 표시명").
// =============================================================

import type { Category } from "@/lib/types";

import { getSupabase } from "./supabaseClient";

const TABLE = "categories";

/**
 * Postgres invalid_text_representation. uuid 컬럼에 uuid 가 아닌 문자열을
 * 비교할 때 온다. (pageRepository 와 같은 이유의 상수다)
 */
const PG_INVALID_TEXT_REPRESENTATION = "22P02";

/** 도메인 모델로 옮길 때 읽는 컬럼. 타임스탬프는 화면이 쓰지 않아 뺀다. */
const CATEGORY_COLUMNS = "id, slug, name, full_name, icon, sort_order";

// ── row 타입 ──────────────────────────────────────────────────
type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  full_name: string;
  icon: string;
  sort_order: number;
};

// ── 변환 ──────────────────────────────────────────────────────
function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    fullName: row.full_name,
    icon: row.icon,
    sortOrder: row.sort_order,
  };
}

// ── 조회 ──────────────────────────────────────────────────────
/**
 * 전체 카테고리를 sortOrder 오름차순으로 가져온다.
 *
 * 항목이 세 개뿐이라 페이지네이션이 없다. 정렬을 호출자에게 맡기지 않는 이유는
 * 홈 버튼 · 푸터 · 에디터 셀렉트가 전부 같은 순서로 보여야 하기 때문이다.
 */
export async function findAll(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(CATEGORY_COLUMNS)
    .order("sort_order", { ascending: true })
    .returns<CategoryRow[]>();

  if (error) throw new Error(`카테고리 조회 실패: ${error.message}`);
  return (data ?? []).map(toCategory);
}

/**
 * id 로 카테고리를 찾는다. 없으면 null.
 *
 * slug 판이 따로 있는데도 필요한 이유: 게시물 작성 폼이 보내는 값은 slug 가
 * 아니라 category_id 다(표시명·slug 가 바뀌어도 저장된 값이 안 흔들리도록).
 * 그 값이 실재하는 항목인지 확인하는 데 쓴다 — FK 위반으로 터뜨리면 사용자에게
 * 보여줄 문구가 없다.
 */
export async function findById(id: string): Promise<Category | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(CATEGORY_COLUMNS)
    .eq("id", id)
    .maybeSingle<CategoryRow>();

  if (error) {
    // uuid 컬럼에 uuid 아닌 문자열을 비교하면 드라이버가 22P02 를 준다.
    // 드라이버 사정이므로 여기서 끝내고 "그런 행이 없다"로 올린다.
    if (error.code === PG_INVALID_TEXT_REPRESENTATION) return null;
    throw new Error(`카테고리 조회 실패: ${error.message}`);
  }

  return data ? toCategory(data) : null;
}

/**
 * slug 로 카테고리를 찾는다. 없으면 null.
 *
 * `/categories/[slug]` 가 "없는 항목"인지 "글이 없는 항목"인지 가르는 데 쓴다.
 * 조회 키가 표시명이 아니라 slug 인 것이 중요하다 — 표시명은 바뀌어도 slug 는
 * 불변 식별자다.
 */
export async function findBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(CATEGORY_COLUMNS)
    .eq("slug", slug)
    .maybeSingle<CategoryRow>();

  if (error) throw new Error(`카테고리 조회 실패: ${error.message}`);
  return data ? toCategory(data) : null;
}
