import Pagination from "@/components/common/Pagination";
import SearchResultItem from "@/components/search/SearchResultItem";
import type { Category, PageSummary } from "@/lib/types";

type SearchResultListProps = {
  /** 서버가 실제로 검색에 쓴 문자열. 제목과 강조가 같은 값을 본다. */
  query: string;

  pages: PageSummary[];
  /** 검색어에 걸린 전체 건수. 마지막 페이지 계산에 쓴다. */
  total: number;

  /**
   * 항목 배지 표시명. **PageList 와 달리 optional 이 아니다.**
   *
   * PageList 는 넘기지 않으면 배지를 끄는데, 그건 이미 한 항목으로 좁혀진
   * 목록에서 같은 배지가 모든 줄에 반복되는 것을 막기 위한 규칙이었다. 검색은
   * 항목을 가로지르므로 배지가 꺼지면 결과를 읽을 수 없다 — 끌 수 없게 타입으로
   * 못박는다.
   */
  categories: Category[];

  basePath: string;
  /** 서버가 실제로 적용한 페이지 번호·크기. 요청값이 접혔을 수 있다. */
  currentPage: number;
  size: number;
};

/**
 * 검색 결과 본문 (Figma 검색 결과 Frame 1487 / 1:943 — 1006폭, 결과 목록 880폭)
 *
 * PageList 와 나란한 자리에 있지만 합치지 않는다. 헤더가 검색어를 따옴표로
 * 감싸 그리고, 줄이 88px 고정이며, 빈 상태 문구가 다르다 — 목록과 공유하는 것은
 * Pagination 과 (페이지 쪽에서) CategorySideNav 다.
 */
export default function SearchResultList({
  query,
  pages,
  total,
  categories,
  basePath,
  currentPage,
  size,
}: SearchResultListProps) {
  // 서버가 되돌려준 size 를 쓴다 — 요청한 size 가 상한(50)에서 접혔으면
  // 실제 쪽수가 달라진다. (PageList 와 같은 계산)
  const lastPage = Math.max(Math.ceil(total / size), 1);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <section className="min-w-0 flex-1">
      {/* 결과 헤더 — Figma 1:944 (🔍 45px + 검색어 x=65 + "전체 검색 결과" x=329) */}
      <header className="flex items-center gap-[20px]">
        <span className="text-[45px] leading-[45px]" aria-hidden>
          🔍
        </span>
        <h1 className="min-w-0 truncate text-[28px] font-bold leading-[34px] text-black">
          {/* 시안대로 따옴표로 감싼다. 검색어와 뒤따르는 문구의 경계를 그것만이
              보여준다 — 없으면 "열린교회 전체 검색 결과"가 한 문장으로 읽힌다. */}
          {`"${query}"`}
        </h1>
        <span className="whitespace-nowrap text-[20px] leading-[26px] text-gray4">
          전체 검색 결과
        </span>
        <span className="whitespace-nowrap text-[16px] leading-[22px] text-gray3">
          {total}개
        </span>
      </header>

      {pages.length === 0 ? (
        // 시안에 0건 화면이 없어 문구를 정했다. "없다"로 끝내지 않고 다음
        // 행동을 준다 — 트라이그램 검색은 오타를 어느 정도 흡수하므로, 결과가
        // 비었다면 대개 검색어가 너무 길거나 좁은 경우다.
        <div className="mt-[40px] w-[880px] max-w-full">
          <p className="text-[18px] leading-[26px] text-black">
            검색 결과가 없습니다.
          </p>
          <p className="mt-[10px] text-[16px] leading-[22px] text-gray3">
            단어의 철자가 정확한지 확인하거나, 더 짧은 검색어로 찾아보세요.
          </p>
        </div>
      ) : (
        // Figma: 항목 88px · 간격 35px
        <ul className="mt-[85px] flex w-[880px] max-w-full flex-col gap-[35px]">
          {pages.map((page) => (
            <SearchResultItem
              key={page.id}
              page={page}
              query={query}
              category={categoryById.get(page.categoryId)}
            />
          ))}
        </ul>
      )}

      <Pagination
        basePath={basePath}
        currentPage={currentPage}
        lastPage={lastPage}
      />
    </section>
  );
}
