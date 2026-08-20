// =============================================================
// tags 테이블 접근
//
// **게시물에 붙은 태그를 읽는 것은 여기가 아니라 pageRepository 다.**
// (`page_tags(tags(name))` 임베디드 조회 — 게시물 계약의 일부라 그쪽에 산다.)
// 이 파일이 답하는 질문은 반대 방향이다: "어떤 태그들이 있고 각각 공개 문서가
// 몇 건인가", "이 이름의 태그가 실재하는가".
//
// DB row 를 도메인 모델(TagSummary)로 옮기는 것은 다른 repository 와 같다 —
// PostgREST 임베디드 aggregate 의 중첩 모양(`pages: [{ count }]`)이 위로 새면
// Java 로 갈아끼울 때 프론트까지 흔들린다.
// =============================================================

import type { TagSummary } from "@/lib/types";

import { publicPages } from "./pageFilters";
import { getSupabase } from "./supabaseClient";

const TABLE = "tags";

/**
 * 태그별 공개 문서 수를 **한 질의로** 센다.
 *
 * `tags → pages` 는 page_tags 를 사이에 낀 다대다인데, PostgREST 가 그 조인
 * 테이블을 알아보고 m2m 관계로 풀어 준다. 그래서 select 문자열에 page_tags 가
 * 등장하지 않는다 — `pages(count)` 하나가 "이 태그에 걸린 pages 의 수"다.
 * 임베디드 aggregate 에 조건을 걸면 세기 **전에** 걸러지는 것도 목록 조회의
 * `comments(count)` + `.eq("comments.status", "VISIBLE")` 과 같은 규칙이다.
 *
 * ⚠️ **항목마다 count 질의를 던지지 마라.** `/admin/categories` 가 그 방식이고
 * (categoryService.listCategoriesForAdmin), 실측으로 그 화면만 100ms 대다.
 * 거기서는 N 이 카테고리 수(3)로 고정이고 카운트가 삭제 판정과 같은 함수여야
 * 한다는 별도 이유가 있었지만, 태그는 EDITOR 가 글을 쓸 때마다 늘어나므로
 * 같은 방식을 쓰면 목록 한 번에 태그 수만큼 왕복이 붙는다.
 *
 * 조건을 손으로 적지 않고 publicPages 에서 받는다 — `deleted_at`/`status` 를
 * 여기 다시 쓰면 "무엇이 공개인가"의 사본이 하나 더 생긴다 (pageFilters).
 * 다만 이 필터는 pages 행이 아니라 **임베디드 pages** 에 걸어야 해서 컬럼명에
 * 접두사가 필요하다. publicPages 가 받는 것은 "eq/is 를 가진 무언가"뿐이므로
 * 접두사를 붙여 주는 얇은 어댑터를 넘긴다.
 *
 * 공개 문서가 0건인 태그도 그대로 올라온다. 그 줄을 목록에서 뺄지는 화면의
 * 규칙이라 service 가 정한다.
 */
export async function findAll(): Promise<TagSummary[]> {
  const query = getSupabase().from(TABLE).select("name, pages(count)");

  publicPages({
    eq: (column, value) => query.eq(`pages.${column}`, value),
    is: (column, value) => query.is(`pages.${column}`, value),
  });

  const { data, error } = await query.returns<TagRow[]>();

  if (error) throw new Error(`태그 목록 조회 실패: ${error.message}`);

  return (data ?? []).map(toSummary);
}

/**
 * 이 이름의 태그가 실재하는가.
 *
 * **"공개 문서가 있는가"가 아니다.** 문서가 전부 숨겨지거나 지워져도 태그 행은
 * 남고, 그때 이 함수는 여전히 true 를 준다 — 화면이 404("없는 태그")가 아니라
 * 빈 목록으로 답해야 하기 때문이다. 있던 링크가 "그런 태그는 없다"로 바뀌면
 * 사용자는 자기가 주소를 잘못 쳤다고 읽는다. (그 판정의 근거는 pageService)
 *
 * head 조회라 행을 실어 오지 않는다. 필요한 것은 있고 없고뿐이다.
 * `tags_name_key`(unique 제약의 인덱스)가 이 질의를 받는다.
 */
export async function existsByName(name: string): Promise<boolean> {
  const { count, error } = await getSupabase()
    .from(TABLE)
    .select("name", { count: "exact", head: true })
    .eq("name", name);

  if (error) throw new Error(`태그 조회 실패: ${error.message}`);
  return (count ?? 0) > 0;
}

// ── row 타입 ──────────────────────────────────────────────────
/**
 * 임베디드 aggregate 는 배열 한 줄로 온다. 배열인 것도 nullable 인 것도
 * PostgREST 사정이지 도메인 사정이 아니다 (pageRepository 의 CommentCountRows
 * 와 같은 모양).
 */
type TagRow = {
  name: string;
  pages: { count: number }[] | null;
};

function toSummary(row: TagRow): TagSummary {
  return { name: row.name, pageCount: row.pages?.[0]?.count ?? 0 };
}
