import Link from "next/link";

import Pagination from "@/components/common/Pagination";
import SearchResultItem from "@/components/search/SearchResultItem";
import { categoryHref, searchHref } from "@/lib/search/searchUrl";
import type { Category, PageSummary } from "@/lib/types";

type SearchResultListProps = {
  /** 서버가 실제로 검색에 쓴 문자열. 제목과 강조가 같은 값을 본다. */
  query: string;

  /**
   * 함께 걸린 항목. 없으면 전체 검색이다.
   *
   * **`categories` 에서 찾아 쓰지 않고 따로 받는다.** 저쪽은 결과 줄의 배지를
   * 그리려고 통째로 받은 목록이고, 이 값은 "지금 무엇으로 좁혀져 있는가" 라는
   * 다른 사실이다. 하나로 합치면 결과가 0건이라 배지를 그릴 줄이 하나도 없을 때
   * 필터 표시도 함께 사라진다 — 정작 그때가 필터가 보여야 하는 순간이다.
   */
  category?: Category;

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
 * 조건 하나를 떼는 칩 (`검색어 "기도실" ✕`).
 *
 * **버튼이 아니라 Link 다.** 조건의 정본이 URL 이므로 해제도 "조건이 하나 빠진
 * URL 로 이동" 이고, 그래야 뒤로가기로 되돌릴 수 있고 클릭 결과를 미리 볼 수도
 * 있다(상태바에 목적지가 뜬다). onClick 으로 router.push 를 부르면 그 둘이 다
 * 사라진다.
 *
 * ✕ 는 44px 터치 타깃 안에 들어 있다. 칩 전체가 링크라 실제 타깃은 그보다 넓다.
 */
function FilterChip({
  label,
  value,
  href,
  removeLabel,
}: {
  label: string;
  value: string;
  href: string;
  removeLabel: string;
}) {
  return (
    <Link
      href={href}
      aria-label={removeLabel}
      className="flex h-11 min-w-0 items-center gap-[8px] rounded-pill border-2 border-category-green bg-white px-[14px] text-[14px] leading-[17px] text-black transition-colors hover:border-brand-red hover:text-brand-red lg:h-[32px]"
    >
      <span className="shrink-0 text-gray3">{label}</span>
      <span className="min-w-0 truncate font-bold">{value}</span>
      <span className="shrink-0 text-[16px] leading-none" aria-hidden>
        ✕
      </span>
    </Link>
  );
}

/**
 * 검색 결과 본문 (Figma 검색 결과 Frame 1487 / 1:943 — 1006폭, 결과 목록 880폭)
 *
 * PageList 와 나란한 자리에 있지만 합치지 않는다. 헤더가 검색어를 따옴표로
 * 감싸 그리고, 줄이 88px 고정이며, 빈 상태 문구가 다르다 — 목록과 공유하는 것은
 * Pagination 과 (페이지 쪽에서) CategorySideNav 다.
 *
 * **두 조건이 함께 걸릴 수 있다**(검색어 + 항목). 그때는 제목이 둘을 함께
 * 읽어 주고("기도실" 공간 항목 검색 결과), 그 아래 칩으로 각 조건을 따로 뗄 수
 * 있다. 조건이 검색어 하나뿐이면 칩 줄을 그리지 않는다 — 뗄 것이 하나뿐인데
 * 그것을 떼면 결과 화면 자체가 사라지므로 제목만으로 충분하다.
 */
export default function SearchResultList({
  query,
  category,
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
      <header className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] lg:flex-nowrap lg:gap-[20px]">
        <span className="text-[32px] leading-[32px] lg:text-[45px] lg:leading-[45px]" aria-hidden>
          🔍
        </span>
        <h1 className="min-w-0 truncate text-[22px] font-bold leading-[34px] text-black lg:text-[28px]">
          {/* 시안대로 따옴표로 감싼다. 검색어와 뒤따르는 문구의 경계를 그것만이
              보여준다 — 없으면 "열린교회 전체 검색 결과"가 한 문장으로 읽힌다. */}
          {`"${query}"`}
        </h1>
        {/* 항목이 걸려 있으면 제목이 두 조건을 함께 읽는다. 문구를 갈아끼우는
            것이지 덧붙이는 것이 아니다 — "전체 검색 결과 · 공간" 은 전체를
            뒤졌다는 말과 한 항목만 봤다는 말이 한 줄에 같이 있게 된다. */}
        {category ? (
          <span className="flex min-w-0 items-center gap-[6px] whitespace-nowrap text-[20px] leading-[26px] text-gray4">
            <span aria-hidden>{category.icon}</span>
            <span className="font-bold text-black">{category.name}</span>
            항목 검색 결과
          </span>
        ) : (
          <span className="whitespace-nowrap text-[20px] leading-[26px] text-gray4">
            전체 검색 결과
          </span>
        )}
        <span className="whitespace-nowrap text-[16px] leading-[22px] text-gray3">
          {total}개
        </span>
      </header>

      {/* 조건 해제 — 두 조건이 함께 걸렸을 때만 나온다.
          · 검색어를 떼면 그 항목의 목록(`/categories/[slug]`)으로 간다.
          · 항목을 떼면 같은 검색어의 전체 검색으로 간다.
          경로 조립은 사이드 네비·검색 입력과 같은 규칙을 쓴다(searchUrl). */}
      {category && (
        <div className="mt-[16px] flex flex-wrap items-center gap-[8px]">
          <FilterChip
            label="검색어"
            value={query}
            href={categoryHref(category.slug)}
            removeLabel={`검색어 "${query}" 조건 해제`}
          />
          <FilterChip
            label="항목"
            value={category.name}
            href={searchHref({ query })}
            removeLabel={`${category.name} 항목 조건 해제`}
          />
        </div>
      )}

      {pages.length === 0 ? (
        // 시안에 0건 화면이 없어 문구를 정했다. "없다"로 끝내지 않고 다음
        // 행동을 준다 — 트라이그램 검색은 오타를 어느 정도 흡수하므로, 결과가
        // 비었다면 대개 검색어가 너무 길거나 좁은 경우다.
        <div className="mt-[40px] w-full max-w-[880px]">
          <p className="text-[18px] leading-[26px] text-black">
            검색 결과가 없습니다.
          </p>
          <p className="mt-[10px] text-[16px] leading-[22px] text-gray3">
            단어의 철자가 정확한지 확인하거나, 더 짧은 검색어로 찾아보세요.
          </p>

          {/* **항목이 걸려 있을 때만 안내를 하나 더 준다.** 조건이 둘이면 0건의
              뜻이 갈린다 — 그런 글이 없는 것인지, 항목을 잘못 고른 것인지.
              사용자는 그 둘을 구분할 수 없고, 구분하는 유일한 방법이 항목을 떼고
              같은 검색어를 다시 던지는 것이다.

              **다른 항목들을 나열하지는 않는다.** 어느 항목에 몇 건이 있는지는
              항목 수만큼 검색을 더 돌려야 알 수 있는데, 그걸 모른 채 이름만
              늘어놓으면 눌러도 또 0건인 링크가 대부분이다. 항목 사이 이동은
              이미 좌측 네비가 검색어를 유지한 채 맡고 있다. */}
          {category && (
            <Link
              href={searchHref({ query })}
              className="mt-[20px] inline-flex h-11 items-center rounded-pill border-2 border-category-green bg-white px-[18px] text-[15px] font-bold leading-[18px] text-black transition-colors hover:border-category-green2 hover:bg-category-green2 hover:text-white"
            >
              전체 항목에서 다시 찾아보기
            </Link>
          )}
        </div>
      ) : (
        // Figma: 항목 88px · 간격 35px
        <ul className="mt-[40px] flex w-full max-w-[880px] flex-col gap-[24px] lg:mt-[85px] lg:gap-[35px]">
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
