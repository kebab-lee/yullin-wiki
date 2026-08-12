// =============================================================
// 게시물 조회 조건 (정본)
//
// "무엇이 공개인가 / 어드민에게 무엇이 보이는가"를 쿼리마다 적으면 조건이
// 함수 수만큼 늘어난다. 실제로 그렇게 흩어져 있었고, 상태에 HIDDEN 이 늘자
// **한 함수만 고치면 목록에는 안 뜨는 글이 다른 목록에서는 뜨는** 어긋남이
// 곧바로 가능해졌다. 조건을 여기 한 곳에 둔다.
//
// **repository 레이어에 있는 이유.** 이 함수들은 supabase-js 쿼리 빌더를 받아서
// 조건을 붙인다 — 즉 SDK 를 만지므로 repositories 밖에 나갈 수 없다
// (CLAUDE.md 레이어 규칙). Java 로 옮길 때는 이 파일이 JPA Specification /
// QueryDSL Predicate 한 벌로 대응된다. 조건의 "내용"은 그대로 남는다.
//
// ⚠️ **SQL 사본이 한 벌 더 있다.** 검색은 RPC(search_pages)라 조건이 함수 본문에
// 박혀 있다 (정본은 supabase/migrations/20260812100000_search_pages_category.sql —
// 20260807000000 의 3인자 판을 드롭하고 항목 필터를 더한 판이다). 여기 공개
// 조건을 고치면 그 마이그레이션도 함께 고쳐야 한다 — 유일하게 코드로 공유할 수
// 없는 지점이라 주석으로 묶어 둔다.
// =============================================================

import type { PageStatus } from "@/lib/types";

/** 공개 화면에 노출되는 유일한 상태. isPublic(pageService)이 보는 값과 같다. */
export const PUBLIC_STATUS: PageStatus = "PUBLISHED";

/** 임시저장소가 모으는 상태. */
export const DRAFT_STATUS: PageStatus = "DRAFT";

/**
 * 조건을 더할 수 있는 쿼리 빌더의 최소 모양.
 *
 * 필요한 것은 "eq / is 로 조건을 더할 수 있는 무언가"뿐이다. PostgrestFilterBuilder
 * 의 구체 제네릭을 적으면 select 문자열이 바뀔 때마다 타입이 흔들리고 이 파일이
 * Supabase 타입 정의에 더 깊이 묶인다.
 */
interface Filterable {
  eq(column: string, value: string): unknown;
  is(column: string, value: null): unknown;
}

// ── 아래 함수들이 빌더를 돌려주지 않는 이유 ─────────────────
// PostgREST 빌더는 조건을 **자기 자신에 쌓고 this 를 돌려주는** mutable 체인이라,
// 인자로 받은 그 객체에 조건을 붙이면 호출부의 변수에 그대로 반영된다. 그래서
// `const q = …; publicPages(q); await q.order(…)` 로 쓴다.
//
// `<T extends Filterable>(q: T): T` 로 두어 체이닝을 잇는 편이 읽기에는 낫지만
// **그렇게 쓸 수 없다** — 빌더의 제네릭이 깊어서 T 추론이
// TS2589(Type instantiation is excessively deep)로 컴파일을 멈춘다. 반환 타입을
// 버리는 대신 호출부가 빌더의 정확한 타입을 그대로 유지한다(.returns<T>() 까지
// 체이닝이 살아 있다).

/**
 * 공개 조회 — `status = 'PUBLISHED' and deleted_at is null`.
 *
 * 홈 최근 목록 · 전체 목록 · 카테고리 목록이 전부 이것을 쓴다. HIDDEN 과 DRAFT 가
 * 여기서 함께 빠지는 것이 핵심이다 — "공개가 아닌 상태"를 열거하지 않고
 * "공개인 상태"만 통과시키므로, 상태가 하나 더 늘어도 이 함수는 안 바뀐다.
 */
export function publicPages(query: Filterable): void {
  query.eq("status", PUBLIC_STATUS);
  query.is("deleted_at", null);
}

/**
 * 어드민 조회 — `deleted_at is null` (status 무관).
 *
 * 어드민은 DRAFT·PUBLISHED·HIDDEN 을 모두 본다. 감춘 글이 어드민 목록에서도
 * 사라지면 되살릴 방법이 없어진다. 지워진 글만 빠진다.
 */
export function adminPages(query: Filterable): void {
  query.is("deleted_at", null);
}

/**
 * 임시저장소 조회 — `status = 'DRAFT' and deleted_at is null and author_id = ?`.
 *
 * 여기만 작성자를 본다. 수정·삭제는 소유권을 보지 않지만(위키는 공동 편집)
 * **남의 초안은 다르다** — 아직 내놓지 않은 글이라 목록에 오르면 안 된다.
 *
 * 임시저장소 화면(AdSaved)은 아직 없어서 이 조건을 쓰는 조회 함수도 아직 없다.
 * 그럼에도 지금 적어 두는 이유는 이 파일이 "게시물 조회 조건의 정본"이라는
 * 약속이기 때문이다 — 세 조건 중 하나만 다른 곳에 적히면 다음 사람은 어디가
 * 정본인지 다시 찾아야 한다.
 */
export function draftPages(query: Filterable, authorId: string): void {
  query.eq("status", DRAFT_STATUS);
  query.eq("author_id", authorId);
  query.is("deleted_at", null);
}
