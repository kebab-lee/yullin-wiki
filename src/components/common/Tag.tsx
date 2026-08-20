import Link from "next/link";

type TagProps = {
  name: string;
};

/**
 * 태그 링크의 목적지. **경로 조립이 여기 한 곳뿐이다.**
 *
 * 태그를 그리는 자리(게시물 상세 헤더 · 목록 줄 · 전체 태그 목록)가 전부 이
 * 컴포넌트를 쓰므로 href 를 밖으로 내보낼 이유가 없다. 밖에서 조립하면
 * `encodeURIComponent` 를 한 곳에서 빠뜨려 한글 태그가 그 경로에서만 깨진다.
 *
 * **URL 이 tag id 가 아니라 이름인 근거:** tags.name 은 unique 이고 태그에는
 * 이름과 별개의 표시명이 없다. 카테고리가 slug 라는 불변 식별자를 따로 갖는
 * 이유는 표시명(name/full_name)이 바뀔 수 있어서인데, 태그에는 바뀔 표시명이
 * 없고 이름을 고치는 문도 없다 — 게시물 편집에서 태그를 갈아 끼우는 것은
 * `UPDATE tags SET name` 이 아니라 **다른 태그를 붙이는 것**이라
 * (pageRepository.upsertTags), 옛 URL 은 깨지는 대신 문서 0건인 태그가 된다.
 * 게시물 계약(PageSummary.tags)이 이미 이름 배열인 것도 같은 결이다.
 *
 * 한글 태그는 퍼센트 인코딩되어 복사될 수 있다. 주소창은 디코드해서 보여주고
 * Next 가 params 를 디코드해 주므로, 읽히는 주소의 값이 그 불편보다 크다.
 */
function tagHref(name: string): string {
  return `/tags/${encodeURIComponent(name)}`;
}

/**
 * 태그 칩 (Figma 1:1364 — 높이 26px, 좌우 4px 인셋)
 *
 * **링크다.** 예전에는 `span` 이었고 그 이유는 "태그별 목록 라우트가 없어서"
 * 였는데, `/tags/[name]` 이 생기면서 그 유보가 풀렸다. 이 컴포넌트 하나를 바꾸면
 * 태그가 그려지는 모든 자리(상세 헤더 · 목록 줄 · 전체 태그 목록)가 함께 링크가
 * 된다 — 그러라고 한 벌로 둔 것이다.
 *
 * 태그를 쓰는 두 화면(PageListItem · SearchResultItem 계열)이 행 전체를 Link 로
 * 감싸지 않는 것이 이 링크의 전제다. `a` 안의 `a` 는 HTML 이 허용하지 않아
 * 브라우저가 마크업을 쪼갠다 — 그쪽 주석이 이 시점을 미리 적어 두고 있다.
 *
 * **크기는 lg 에서만 시안 값(26px)이다.** 링크가 된 이상 터치 타깃 최소 44px
 * 규칙(CLAUDE.md "반응형/모바일")이 걸리는데, 26px 짜리 칩을 손가락으로 정확히
 * 누를 수 없다. Pagination 이 같은 긴장을 푼 방식을 그대로 따른다 — 모바일은
 * 44px(`h-11` · `min-w-11`), lg 이상은 시안 그대로.
 *
 * 패딩을 눌러 탭 영역만 넓히는 방법은 **쓸 수 없다.** `h-[26px]` 가 걸린 채
 * border-box 라 세로 패딩이 26px 안쪽으로 들어가 실제 면적이 그대로이고,
 * 음수 마진이나 가상 요소로 밖으로 밀면 태그 줄이 여러 줄로 접힐 때
 * (`gap-[10px]`) 위아래 줄의 영역이 18px 씩 겹쳐 엉뚱한 태그가 눌린다.
 */
export default function Tag({ name }: TagProps) {
  return (
    <Link
      href={tagHref(name)}
      className={[
        "inline-flex h-11 min-w-11 items-center justify-center px-[10px]",
        "lg:h-[26px] lg:min-w-0 lg:px-[4px]",
        "rounded-badge bg-category-green-light text-card-tag text-category-green-dark",
        "transition-colors hover:bg-category-green2 hover:text-white",
      ].join(" ")}
    >
      {name}
    </Link>
  );
}
