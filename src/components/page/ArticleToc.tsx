import type { TocEntry } from "@/lib/editor/toc";

type ArticleTocProps = {
  entries: TocEntry[];
};

/**
 * 좌측 사이드 목차 (Figma 1:551 Content-목차, 245x448)
 *
 * 번호 매기기는 하지 않는다 — 이미 매겨진 값을 받아서 그리기만 한다
 * (규칙은 src/lib/editor/toc.ts). 앵커는 순수 `<a href="#...">` 라 클라이언트
 * 컴포넌트가 아니다. 스크롤 이동은 CSS `scroll-behavior` 가 맡는다.
 */
export default function ArticleToc({ entries }: ArticleTocProps) {
  if (entries.length === 0) return null;

  return (
    <nav
      aria-label="목차"
      className="sticky top-[40px] w-[245px] shrink-0 rounded-card bg-brand-red-white p-[20px]"
    >
      <p className="text-[16px] font-bold leading-[19px] text-black">목차</p>

      <ul className="mt-[15px] flex flex-col gap-[8px]">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.level > 1 ? "pl-[14px]" : ""}>
            <a
              href={`#${entry.id}`}
              className="flex gap-[6px] text-[14px] leading-[20px] text-gray4 transition-colors hover:text-brand-red"
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
