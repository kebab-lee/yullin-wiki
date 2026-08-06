type TagProps = {
  name: string;
};

/**
 * 태그 칩 (Figma 1:1364 — 높이 26px, 좌우 4px 인셋)
 *
 * 아직 링크가 아니다. 태그별 목록 라우트가 없어서 지금 href 를 붙이면 없는
 * 페이지로 보내게 된다. 목록이 생기면 이 컴포넌트 한 곳만 Link 로 바꾼다.
 */
export default function Tag({ name }: TagProps) {
  return (
    <span className="inline-flex h-[26px] items-center rounded-badge bg-category-green-light px-[4px] text-card-tag text-category-green-dark">
      {name}
    </span>
  );
}
