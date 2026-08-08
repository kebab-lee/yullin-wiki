import type { TocEntry } from "@/lib/editor/toc";

type ArticleTocProps = {
  entries: TocEntry[];
};

/**
 * 목차 (Figma 1:551 Content-목차, 245x448)
 *
 * - lg 이상: 시안 그대로 좌측 245px 고정(sticky), 항상 펼쳐진 상태.
 * - lg 미만: 본문 시작 지점에 **접힌 채로** 놓인다. 좁은 화면에서 목차가 펼쳐져
 *   있으면 본문 첫 줄이 한참 아래로 밀린다.
 *
 * ── `<details>/<summary>` 를 쓰지 않은 이유 ──
 * 접기를 JS 없이 하려는 목적에는 맞지만 **lg 에서 항상 펼쳐 둘 수가 없다.**
 * 열림 여부는 `open` 속성이라 CSS 로 못 켜는데, 서버 컴포넌트는 뷰포트를 모르니
 * `open` 을 조건부로 줄 수도 없다. 닫힌 `<details>` 의 내용은 `display` 를 덮어써도
 * 그려지지 않는다 — 브라우저가 `content-visibility` 로 감추기 때문이고, 이를 푸는
 * `::details-content` 는 아직 오래된 브라우저에 없다. 그 브라우저에서는 **데스크톱**
 * 목차가 접힌 채로 뜨는데, 그건 시안과 다른 화면이다.
 *
 * 그래서 체크박스 + `peer` 로 순수 CSS 토글을 만든다. 목적(JS 없이 동작)은 그대로고,
 * 펼침 상태가 `display` 하나로 결정되므로 lg 에서 미디어쿼리가 항상 이긴다.
 * 이 컴포넌트는 여전히 서버 컴포넌트이고 앵커도 순수 `<a href="#...">` 다.
 *
 * 번호 매기기는 하지 않는다 — 이미 매겨진 값을 받아서 그리기만 한다
 * (규칙은 src/lib/editor/toc.ts).
 */
export default function ArticleToc({ entries }: ArticleTocProps) {
  // 헤딩이 없으면 빈 상자를 그리지 않는다. 모바일에서는 본문 위에 놓이므로
  // 빈 목차가 본문을 그만큼 밀어낸다.
  if (entries.length === 0) return null;

  return (
    <nav
      aria-label="목차"
      className="w-full shrink-0 rounded-card bg-brand-red-white p-[20px] lg:sticky lg:top-[40px] lg:w-[245px]"
    >
      {/* 토글 상태만 담는다. 화면에는 보이지 않지만 포커스는 받아야 해서
          `hidden` 이 아니라 `sr-only` 다 (키보드로도 열 수 있어야 한다). */}
      <input
        type="checkbox"
        id="article-toc-toggle"
        aria-label="목차 펼치기"
        className="peer sr-only"
      />

      <label
        htmlFor="article-toc-toggle"
        // lg 에서는 목록이 늘 보이므로 여는 손잡이가 아니라 그냥 제목이다.
        //
        // 셰브론 회전은 `peer-checked:[&>svg]:` 로 건다. `peer-checked:` 만으로는
        // 안 된다 — 형제 결합자(`~`)라 체크박스의 **형제**에만 걸리는데
        // 셰브론은 이 label 의 자식이다.
        className="flex min-h-11 cursor-pointer items-center justify-between gap-[10px] text-[16px] font-bold leading-[19px] text-black peer-focus-visible:underline peer-checked:[&>svg]:rotate-180 lg:min-h-0 lg:cursor-default lg:pointer-events-none"
      >
        <span>
          목차
          {/* 개수는 접혀 있을 때만 의미가 있다. lg 에서는 목록이 통째로 보인다. */}
          <span className="ml-[4px] font-normal text-gray3 lg:hidden">
            ({entries.length})
          </span>
        </span>

        <svg
          width="12"
          height="8"
          viewBox="0 0 12 8"
          aria-hidden
          className="shrink-0 stroke-gray3 transition-transform lg:hidden"
        >
          <path
            d="M1 1.5L6 6.5L11 1.5"
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </label>

      {/* 펼침은 `display` 하나로 결정된다 — lg 미디어쿼리가 뒤에 오므로
          체크 여부와 무관하게 데스크톱에서는 항상 펼쳐진다. */}
      <ul className="mt-[15px] hidden flex-col gap-[8px] peer-checked:flex lg:flex">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.level > 1 ? "pl-[14px]" : ""}>
            <a
              href={`#${entry.id}`}
              // `-my/py` 짝은 배치를 그대로 둔 채 터치 영역만 넓힌다
              // (CLAUDE.md "반응형"). lg 에서는 둘 다 0 으로 돌린다.
              className="-my-[12px] flex gap-[6px] py-[12px] text-[14px] leading-[20px] text-gray4 transition-colors hover:text-brand-red lg:my-0 lg:py-0"
            >
              <span className="shrink-0 text-gray3">{entry.number}</span>
              <span className="min-w-0">{entry.text}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
