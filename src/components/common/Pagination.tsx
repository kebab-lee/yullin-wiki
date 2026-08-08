import Link from "next/link";

type PaginationProps = {
  /** 페이지 번호만 갈아끼울 기준 경로 (`/categories/space`). */
  basePath: string;
  /** 서버가 실제로 적용한 페이지 번호. 요청값이 접혔을 수 있다. */
  currentPage: number;
  lastPage: number;
};

/**
 * 현재 페이지 양옆으로 노출할 번호 개수.
 *
 * 2 인 이유는 이 값이 노출 개수의 상한을 정하기 때문이다: 창(최대 5) + 양 끝
 * 2 + 생략 표시 2 = 9칸이 최대이고, Figma 기준 폭(259px)에 들어가는 한계다.
 * 늘리면 페이지가 많아질 때 목록 하단이 가로로 넘친다.
 */
const WINDOW = 2;

/** 번호 사이 생략 구간. 실제 페이지가 아니라 자리 표시다. */
const GAP = "gap" as const;

type Slot = number | typeof GAP;

/**
 * 노출할 칸을 순서대로 만든다.
 *
 * **양 끝(1 · 마지막)은 창 밖이어도 항상 넣는다.** 창만 그리면 20페이지 중
 * 10페이지를 보고 있을 때 1페이지로 돌아갈 링크가 사라져서, 목록의 처음으로
 * 가려면 뒤로가기를 반복하거나 URL 을 손으로 고쳐야 한다.
 *
 * 끝과 창이 딱 한 칸 떨어졌을 때는 생략 표시 대신 그 번호를 그대로 넣는다 —
 * `1 … 3 4 5` 의 `…` 가 가리키는 것이 2 하나뿐이라, 생략 기호가 링크 하나보다
 * 넓은 자리를 차지하면서 이동은 못 하게 만든다.
 */
function buildSlots(currentPage: number, lastPage: number): Slot[] {
  const first = Math.max(currentPage - WINDOW, 1);
  const last = Math.min(currentPage + WINDOW, lastPage);

  const slots: Slot[] = Array.from(
    { length: last - first + 1 },
    (_, i) => first + i,
  );

  if (first > 1) slots.unshift(...(first > 2 ? [1, GAP] : [1]));
  if (last < lastPage) slots.push(...(last < lastPage - 1 ? [GAP, lastPage] : [lastPage]));

  return slots;
}

/** Figma 페이지네이션 화살표. MoreButton 과 같은 셰브론을 작게 쓴다. */
function Chevron({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 11 18"
      fill="none"
      className={direction === "prev" ? "-scale-x-100" : undefined}
      aria-hidden
    >
      <path
        d="M7.00007 9.00006L0 2L2.00002 0L11 9.00006L2.00002 18L0 16L7.00007 9.00006Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * 목록 페이지네이션 (Figma 1:1550 — 259x24, 중앙 정렬)
 *
 * 상태를 들고 있지 않아 서버 컴포넌트로 둔다 — 페이지 이동은 `?page=` 쿼리
 * 스트링이고, 그래야 링크를 그대로 공유·북마크할 수 있고 뒤로가기가 동작한다.
 *
 * 전체/항목별 목록과 (나중에) 검색 결과가 같은 컴포넌트를 쓴다. 그래서 경로를
 * 스스로 알지 않고 basePath 로 받는다.
 */
export default function Pagination({
  basePath,
  currentPage,
  lastPage,
}: PaginationProps) {
  // 한 페이지뿐이면 그릴 것이 없다. 화살표만 남은 줄을 보여주지 않는다.
  if (lastPage <= 1) return null;

  // 1페이지는 page 파라미터 없이 — 같은 화면이 URL 두 개를 갖지 않게 한다.
  //
  // basePath 에 이미 쿼리가 붙어 있을 수 있다(검색 결과의 `/search?q=…`). 그때는
  // `&` 로 잇는다 — `?` 를 두 번 쓰면 두 번째부터가 앞 파라미터의 값에 섞여
  // 페이지를 넘기는 순간 검색어가 깨진다.
  const hrefFor = (page: number) =>
    page === 1
      ? basePath
      : `${basePath}${basePath.includes("?") ? "&" : "?"}page=${page}`;

  const arrowClass =
    "flex size-11 items-center justify-center text-gray3 transition-colors hover:text-brand-red lg:size-[24px]";

  return (
    <nav
      aria-label="페이지 목록"
      className="mt-[40px] flex items-center justify-center gap-[4px] lg:mt-[50px] lg:h-[24px] lg:gap-[10px]"
    >
      {currentPage > 1 ? (
        <Link
          href={hrefFor(currentPage - 1)}
          rel="prev"
          aria-label="이전 페이지"
          className={arrowClass}
        >
          <Chevron direction="prev" />
        </Link>
      ) : (
        // 첫 페이지에서도 자리를 비워 둔다. 화살표가 사라지면 번호 줄 전체가
        // 옆으로 밀려서 페이지를 옮길 때마다 숫자 위치가 흔들린다.
        <span className={arrowClass} aria-hidden />
      )}

      {buildSlots(currentPage, lastPage).map((slot, index) =>
        slot === GAP ? (
          <span
            // 생략 구간은 앞뒤로 하나씩만 생기고 번호가 없어서 위치로 키를 준다.
            key={`gap-${index}`}
            className="text-[15px] leading-[24px] text-gray3"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Link
            key={slot}
            href={hrefFor(slot)}
            aria-current={slot === currentPage ? "page" : undefined}
            aria-label={`${slot}페이지`}
            className={[
              "flex size-11 min-w-11 items-center justify-center rounded-pill px-[6px] lg:size-auto lg:h-[24px] lg:min-w-[24px]",
              "text-[15px] leading-[24px] transition-colors",
              slot === currentPage
                ? "bg-category-green2 font-bold text-white"
                : "text-gray3 hover:text-brand-red",
            ].join(" ")}
          >
            {slot}
          </Link>
        ),
      )}

      {currentPage < lastPage ? (
        <Link
          href={hrefFor(currentPage + 1)}
          rel="next"
          aria-label="다음 페이지"
          className={arrowClass}
        >
          <Chevron direction="next" />
        </Link>
      ) : (
        <span className={arrowClass} aria-hidden />
      )}
    </nav>
  );
}
