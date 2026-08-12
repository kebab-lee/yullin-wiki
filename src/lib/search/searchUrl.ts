// =============================================================
// 검색 · 항목 조건의 URL 조립 (정본)
//
// **검색어와 항목은 서로를 지우지 않는 두 조건이고, 그 상태는 URL 이 갖는다**
// (CLAUDE.md 반응형 규칙: 필터 상태를 클라이언트 상태로 들지 않는다). 그래서
// "조건 하나를 바꾼 다음 URL" 을 만드는 일이 화면 여러 곳에서 벌어진다 —
// 사이드 네비의 항목 칩, 검색 입력의 제출, 조건 해제 링크, 페이지네이션의 기준
// 경로. 그 조립을 각자 하면 한 곳만 빠뜨렸을 때 그 경로로만 조건이 사라진다.
//
// React·DOM 을 모르는 순수 함수라 서버 컴포넌트와 클라이언트 컴포넌트가 함께
// 쓴다 (validation 모듈과 같은 결).
// =============================================================

/**
 * 지금 걸려 있는 두 조건.
 *
 * 둘 다 없을 수 있다(빈 검색 화면). 항목만 있는 상태는 이 타입이 아니라
 * `/categories/[slug]` 경로가 표현한다 — 아래 categoryHref 참조.
 */
export type SearchFilters = {
  /** 검색어. 빈 문자열이면 "검색어 없음". */
  query?: string | null;
  /** 항목 slug. null 이면 전체. */
  category?: string | null;
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * 검색 결과 경로. 검색어가 있을 때만 쓴다.
 *
 * `page` 를 여기서 붙이지 않는 것이 의도다 — 조건이 바뀌면 페이지는 언제나 1로
 * 돌아가야 하고(3페이지에서 항목을 바꾸면 그 항목의 3페이지가 아니라 처음부터
 * 봐야 한다), 페이지 번호를 잇는 일은 Pagination 이 basePath 위에서 한다.
 */
export function searchHref({ query, category }: SearchFilters): string {
  const params = new URLSearchParams();

  const q = clean(query);
  if (q) params.set("q", q);

  const slug = clean(category);
  if (slug) params.set("category", slug);

  return params.size > 0 ? `/search?${params.toString()}` : "/search";
}

/**
 * "이 항목을 고른다" 는 링크의 목적지.
 *
 * **검색어 유무로 경로 자체가 갈린다.** 검색어가 없으면 항목 목록
 * (`/categories/[slug]` — 최신순 컬렉션)이고, 있으면 그 항목 안에서의 검색
 * (`/search?q=&category=` — 유사도 순위)이다. 두 화면은 정렬과 응답 계약이
 * 다르므로 한 경로로 합치지 않는다.
 *
 * 검색어가 없을 때 기존 경로를 그대로 쓰는 덕분에 `/categories/space` 링크가
 * 예전과 똑같이 동작한다.
 */
export function categoryHref(slug: string, query?: string | null): string {
  const q = clean(query);
  return q
    ? searchHref({ query: q, category: slug })
    : `/categories/${encodeURIComponent(slug)}`;
}

/**
 * 검색 결과 화면에서 현재 URL 의 `category` 를 읽는 규칙.
 *
 * 빈 문자열(`?category=`)은 "없음"이다. service 가 같은 판정을 한 번 더 하지만,
 * 화면이 그 전에 필터 배지를 그릴지 말지를 알아야 한다.
 */
export function readCategoryParam(value: string | null | undefined): string | null {
  return clean(value);
}
