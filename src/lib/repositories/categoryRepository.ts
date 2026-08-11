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

import { ConflictError } from "@/lib/errors";
import type { Category } from "@/lib/types";
import { CATEGORY_IN_USE, SLUG_TAKEN } from "@/lib/validation/category";

import { getSupabase } from "./supabaseClient";

const TABLE = "categories";

/**
 * 문서 수를 셀 때만 보는 테이블.
 *
 * **pages 를 categoryRepository 가 읽는 것이 의도다.** 이 질의가 답하는 질문은
 * "이 항목을 지울 수 있는가"라서 게시물이 아니라 카테고리의 수명에 속한다.
 * pageRepository 에 두면 카테고리 삭제 규칙이 두 파일에 걸치고, 그쪽의 조회
 * 함수들은 전부 "발행·미삭제" 조건을 기본으로 깔고 있어서(pageFilters) 이
 * 카운트가 그 조건을 물려받는 사고가 나기 쉽다 — 여기서는 반대로 **아무것도
 * 거르지 않는 것**이 정답이다 (countPagesByCategoryId 주석).
 */
const PAGES_TABLE = "pages";

/**
 * Postgres invalid_text_representation. uuid 컬럼에 uuid 가 아닌 문자열을
 * 비교할 때 온다. (pageRepository 와 같은 이유의 상수다)
 */
const PG_INVALID_TEXT_REPRESENTATION = "22P02";

/** Postgres unique_violation. slug unique 제약과 부딪혔을 때 온다. */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Postgres foreign_key_violation. 문서가 남은 항목을 지우려 할 때
 * `pages.category_id ... on delete restrict` 가 낸다.
 */
const PG_FOREIGN_KEY_VIOLATION = "23503";

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

// ── 입력 타입 ─────────────────────────────────────────────────
/** 새 항목. id 와 타임스탬프는 DB 기본값에 맡긴다. */
export type NewCategory = {
  slug: string;
  name: string;
  fullName: string;
  icon: string;
  sortOrder: number;
};

/**
 * 고칠 수 있는 값. **slug 가 없는 것이 이 타입의 핵심이다.**
 *
 * slug 는 URL(`/categories/[slug]`)과 코드 분기용 불변 식별자라(CLAUDE.md
 * "카테고리 표시명") 바뀌면 기존 링크가 전부 깨진다. 타입에서 빼 두면 service 가
 * 실수로 넘기려 해도 컴파일이 막고, 요청 바디에 slug 가 섞여 들어와도 이 모양으로
 * 옮기는 과정에서 그냥 사라진다 — 화면에서 읽기 전용으로 그리는 것은 안내일 뿐
 * 방어가 아니다 (UpdateUserData 가 role 을 빼 둔 것과 같은 장치).
 *
 * **여기에 slug 를 추가하지 마라.** 주소를 바꿔야 하는 상황이 생기면 그것은
 * 수정이 아니라 "새 항목을 만들고 문서를 옮긴다"는 별개의 조작이다.
 */
export type UpdateCategoryData = {
  name: string;
  fullName: string;
  icon: string;
  sortOrder: number;
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

/**
 * 이 항목을 참조하는 문서가 몇 건인가.
 *
 * **아무 조건도 걸지 않는다 — deleted_at 도, status 도 보지 않는다.** 이 수가
 * 답하는 질문은 "화면에 몇 건이 보이는가"가 아니라 **"이 항목을 지울 수
 * 있는가"** 이고, `pages.category_id` 의 `on delete restrict` 는 소프트 삭제된
 * 행이든 초안이든 가리지 않고 삭제를 막는다. 여기서 `deleted_at is null` 을
 * 붙이면 화면은 "0건이라 삭제 가능"이라고 그려 놓고 실제 DELETE 는 FK 위반으로
 * 터진다 — 사용자에게는 원인 없는 실패로 보인다.
 *
 * head 조회라 행을 실어 오지 않는다. 필요한 것은 수 하나뿐이다.
 * idx_pages_category_id 가 이 질의를 받는다.
 */
export async function countPagesByCategoryId(id: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from(PAGES_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (error) {
    // uuid 아닌 문자열이 왔으면 그런 항목이 없는 것이고, 없는 항목에 달린
    // 문서도 없다. findById 가 같은 코드를 "없다"로 접는 것과 같은 판단이다.
    if (error.code === PG_INVALID_TEXT_REPRESENTATION) return 0;
    throw new Error(`문서 수 조회 실패: ${error.message}`);
  }

  return count ?? 0;
}

// ── 생성 ──────────────────────────────────────────────────────
export async function create(input: NewCategory): Promise<Category> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert({
      slug: input.slug,
      name: input.name,
      full_name: input.fullName,
      icon: input.icon,
      sort_order: input.sortOrder,
    })
    .select(CATEGORY_COLUMNS)
    .single<CategoryRow>();

  if (error) {
    // service 의 중복 확인과 insert 사이에 다른 요청이 같은 slug 를 채간 경우.
    // 드라이버 에러 코드를 도메인 에러로 옮겨서 올린다. 문구는 service 가 미리
    // 걸러냈을 때와 같아야 하므로 정본(validation 모듈)을 그대로 쓴다
    // (userRepository.create 와 같은 처리).
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new ConflictError({ slug: SLUG_TAKEN });
    }
    throw new Error(`카테고리 생성 실패: ${error.message}`);
  }

  return toCategory(data);
}

// ── 수정 ──────────────────────────────────────────────────────
/**
 * 표시명·아이콘·순서를 고친다.
 *
 * 받는 값이 UpdateCategoryData 로 고정돼 있어 slug 는 이 경로로 바뀔 수 없다.
 * 아래 update 문에 그 컬럼이 아예 등장하지 않는 것이 그 결과다 —
 * **여기에 slug 를 추가하지 마라.**
 *
 * updated_at 은 categories_set_updated_at 트리거가 갱신한다.
 */
export async function update(
  id: string,
  data: UpdateCategoryData,
): Promise<Category> {
  const { data: row, error } = await getSupabase()
    .from(TABLE)
    .update({
      name: data.name,
      full_name: data.fullName,
      icon: data.icon,
      sort_order: data.sortOrder,
    })
    .eq("id", id)
    .select(CATEGORY_COLUMNS)
    .single<CategoryRow>();

  if (error) throw new Error(`카테고리 수정 실패: ${error.message}`);
  return toCategory(row);
}

// ── 삭제 ──────────────────────────────────────────────────────
/**
 * 항목을 지운다. **하드 삭제다.**
 *
 * 소프트 삭제(deleted_at)를 두지 않은 것은 결정이다 — 항목은 자주 바뀌지 않고,
 * 문서가 남아 있으면 애초에 삭제가 거부되므로(service) 되살릴 내용이 없다.
 * 같은 slug 로 다시 만들면 URL 까지 그대로 복구된다.
 *
 * "문서가 남았는가"를 여기서 판정하지 않는다. 그건 규칙이라 service 의 몫이고
 * (건수를 문구에 실어야 한다), 여기는 DELETE 한 문장만 책임진다. 다만 그 검사와
 * 이 문장 사이의 경합까지 service 가 막을 수는 없으므로, FK 제약이 낸 거절은
 * 마지막 그물로 여기서 도메인 에러로 옮긴다.
 *
 * 지워진 행을 돌려주지 않는다. 호출부가 필요로 하는 것은 "지워졌다"는 사실뿐이다.
 *
 * `delete` 는 예약어라 함수 이름으로 쓸 수 없다. 선언은 removeById 로 하고
 * 내보낼 때 이름을 바꾼다 — 호출부(`categoryRepository.delete(id)`)에서는
 * 형제 함수들과 같은 결로 읽힌다.
 */
async function removeById(id: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq("id", id);

  if (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new ConflictError({}, CATEGORY_IN_USE);
    }
    throw new Error(`카테고리 삭제 실패: ${error.message}`);
  }
}

export { removeById as delete };
