// =============================================================
// 검색 결과 발췌 · 하이라이트
//
// 순수 함수만 둔다. React 를 import 하지 않는다 — 아래 두 함수는 서로 다른
// 레이어에서 불린다.
//
//   cutAroundQuery   repository 가 검색 결과 행을 PageSummary 로 옮길 때.
//                    본문 전체를 클라이언트까지 실어 보내지 않기 위해 서버에서 자른다.
//   splitByQuery     UI(SearchResultItem)가 잘린 발췌 안에서 일치 구간을 나눌 때.
//
// **하이라이트를 문자열(HTML)로 만들지 않는 것이 이 모듈의 설계다.** 검색어는
// 사용자 입력이라 `<mark>` 를 문자열로 조립해 dangerouslySetInnerHTML 로 넘기면
// 그 자리가 곧바로 XSS 가 된다. 여기서는 "어디부터 어디까지가 일치인가"라는
// 사실만 조각(Segment) 배열로 돌려주고, 엘리먼트를 만드는 것은 컴포넌트의 몫이다.
// (지시받은 "React 엘리먼트 배열"과 결과는 같고, lib 이 React 에 의존하지 않는다)
// =============================================================

/** 발췌 최대 길이. 목록 카드(pageRepository.EXCERPT_LENGTH)와 같은 120자다. */
export const EXCERPT_LENGTH = 120;

/**
 * 일치 지점 앞에 남겨 둘 글자 수.
 *
 * 0 이면 발췌가 항상 검색어로 시작해서 어떤 문맥에서 나온 말인지 알 수 없다.
 * 반대로 너무 크면 검색어가 발췌 끝으로 밀려 잘려 나간다. 120자 창의 앞 1/4 을
 * 문맥에 준다.
 */
const CONTEXT_BEFORE = 30;

const ELLIPSIS = "…";

/** 발췌 한 조각. matched 인 구간만 화면에서 강조된다. */
export type ExcerptSegment = {
  readonly text: string;
  readonly matched: boolean;
};

/** 앞뒤 공백을 하나로 접은 문자열. 발췌 위치 계산은 접은 뒤에 한다. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * 대소문자를 무시한 첫 일치 위치. 없으면 -1.
 *
 * 정규식을 쓰지 않는다 — 검색어가 사용자 입력이라 `.` `*` `(` 같은 문자가 그대로
 * 패턴이 되어 버리고, 이스케이프를 잊는 순간 결과가 조용히 틀어진다.
 */
function indexOfQuery(text: string, query: string): number {
  return text.toLowerCase().indexOf(query.toLowerCase());
}

/**
 * 검색어가 보이도록 본문을 잘라낸다.
 *
 * 목록 카드처럼 앞에서 120자를 자르면 검색어가 본문 뒤쪽에 있을 때 발췌에
 * 검색어가 한 글자도 안 보인다 — "왜 이 글이 결과에 있는가"를 답하지 못하는
 * 발췌가 된다.
 *
 * **일치가 없어도 빈 문자열을 돌려주지 않는다.** 오타 검색(트라이그램)으로 걸린
 * 문서는 검색어가 문자 그대로는 들어 있지 않은데, 그 경우 앞에서부터 자른 평범한
 * 미리보기를 보여준다.
 */
export function cutAroundQuery(
  plainText: string,
  query: string,
  maxLength: number = EXCERPT_LENGTH,
): string {
  const text = normalize(plainText);
  const keyword = query.trim();

  const hit = keyword ? indexOfQuery(text, keyword) : -1;
  const start = hit < 0 ? 0 : Math.max(hit - CONTEXT_BEFORE, 0);
  const end = Math.min(start + maxLength, text.length);

  const body = text.slice(start, end).trim();

  return [
    start > 0 ? ELLIPSIS : "",
    body,
    end < text.length ? ELLIPSIS : "",
  ].join("");
}

/**
 * 발췌를 일치 구간 기준으로 쪼갠다. 일치가 없으면 조각 하나짜리 배열이다.
 *
 * 검색어가 여러 번 나오면 전부 나눈다 — 하나만 강조하면 사용자가 나머지를
 * 놓친 것으로 읽는다.
 */
export function splitByQuery(
  text: string,
  query: string,
): readonly ExcerptSegment[] {
  const keyword = query.trim();
  if (!keyword) return [{ text, matched: false }];

  const segments: ExcerptSegment[] = [];
  let cursor = 0;

  for (;;) {
    const hit = indexOfQuery(text.slice(cursor), keyword);
    if (hit < 0) break;

    const from = cursor + hit;
    if (from > cursor) {
      segments.push({ text: text.slice(cursor, from), matched: false });
    }
    // 원문의 대소문자를 그대로 살린다. 검색어로 갈아치우면 화면의 글자가 바뀐다.
    segments.push({
      text: text.slice(from, from + keyword.length),
      matched: true,
    });
    cursor = from + keyword.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }

  return segments;
}
