import Link from "next/link";

type PaginationProps = {
  /** 페이지 번호만 갈아끼울 기준 경로 (`/categories/space`). */
  basePath: string;
  /** 서버가 실제로 적용한 페이지 번호. 요청값이 접혔을 수 있다. */
  currentPage: number;
  lastPage: number;
};

/** 한 번에 노출할 번호 개수. 양옆으로 이만큼씩 보여준다. */
const WINDOW = 2;

/**
 * 목록 페이지네이션.
 *
 * 상태를 들고 있지 않아 서버 컴포넌트로 둔다 — 페이지 이동은 `?page=` 쿼리
 * 스트링이고, 그래야 링크를 그대로 공유·북마크할 수 있다.
 */
export default function Pagination({
  basePath,
  currentPage,
  lastPage,
}: PaginationProps) {
  if (lastPage <= 1) return null;

  const first = Math.max(currentPage - WINDOW, 1);
  const last = Math.min(currentPage + WINDOW, lastPage);
  const numbers = Array.from({ length: last - first + 1 }, (_, i) => first + i);

  // 1페이지는 쿼리스트링 없이 — 같은 화면이 URL 두 개를 갖지 않게 한다.
  const hrefFor = (page: number) =>
    page === 1 ? basePath : `${basePath}?page=${page}`;

  return (
    <nav
      aria-label="페이지 목록"
      className="mt-[50px] flex items-center justify-center gap-[10px]"
    >
      {currentPage > 1 && (
        <Link
          href={hrefFor(currentPage - 1)}
          rel="prev"
          className="px-[10px] py-[4px] text-[15px] text-gray3 hover:text-brand-red"
        >
          이전
        </Link>
      )}

      {numbers.map((page) => (
        <Link
          key={page}
          href={hrefFor(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={[
            "min-w-[32px] rounded-pill px-[10px] py-[4px] text-center text-[15px] transition-colors",
            page === currentPage
              ? "bg-category-green2 text-white"
              : "text-gray3 hover:text-brand-red",
          ].join(" ")}
        >
          {page}
        </Link>
      ))}

      {currentPage < lastPage && (
        <Link
          href={hrefFor(currentPage + 1)}
          rel="next"
          className="px-[10px] py-[4px] text-[15px] text-gray3 hover:text-brand-red"
        >
          다음
        </Link>
      )}
    </nav>
  );
}
