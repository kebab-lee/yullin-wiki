import Pagination from "@/components/common/Pagination";
import PageListItem from "@/components/page/PageListItem";
import type { Category, PageSummary } from "@/lib/types";

type PageListProps = {
  /** 목록 헤더 이모지 (Figma 1:579 — 45px). 전체는 ⏰, 항목별은 📂 다. */
  emoji: string;
  title: string;

  pages: PageSummary[];
  /** 조건에 맞는 전체 건수. 제목 옆 개수와 마지막 페이지 계산에 쓴다. */
  total: number;

  /**
   * 항목 배지에 쓸 표시명. **넘기지 않으면 배지를 그리지 않는다.**
   *
   * 별도의 `showBadge` 같은 플래그를 두지 않는 이유: 플래그와 데이터가 서로
   * 어긋날 수 있다(켰는데 이름이 없거나, 이름은 줬는데 꺼져 있다). 이미 한
   * 항목으로 좁혀진 목록(`/categories/[slug]`)은 모든 줄에 같은 배지가 반복되므로
   * 넘기지 않고, 전체 목록(`/pages`)만 넘긴다.
   */
  categories?: Category[];

  /** 페이지 번호만 갈아끼울 기준 경로. Pagination 에 그대로 넘긴다. */
  basePath: string;
  /** 서버가 실제로 적용한 페이지 번호·크기. 요청값이 접혔을 수 있다. */
  currentPage: number;
  size: number;
};

/**
 * 게시물 목록 본문 (Figma lists 1:602 — 1006x1274)
 *
 * 전체 목록(`/pages`)과 항목별 목록(`/categories/[slug]`)이 **같은 컴포넌트를
 * 쓴다.** 두 화면은 목록을 좁히는 조건과 헤더 문구만 다르고 항목 배치·빈 상태·
 * 페이지네이션이 전부 같다. 라우트마다 목록을 다시 그리면 한쪽만 고쳐진다
 * (CLAUDE.md "화면 중복").
 *
 * **데이터를 스스로 가져오지 않는다.** 어떤 조건의 목록인가는 라우트가 아는
 * 사실이고, 여기서 fetch 하면 두 페이지가 서로 다른 쿼리를 이 컴포넌트 안에서
 * 조립해야 한다.
 */
export default function PageList({
  emoji,
  title,
  pages,
  total,
  categories,
  basePath,
  currentPage,
  size,
}: PageListProps) {
  // 마지막 페이지는 total 로 계산한다. 서버가 되돌려준 size 를 쓰는 것이
  // 핵심이다 — 요청한 size 가 상한(50)에서 접혔으면 실제 쪽수가 달라진다.
  const lastPage = Math.max(Math.ceil(total / size), 1);

  // categoryId → Category. 항목마다 find 를 돌리면 목록 길이 × 항목 수가 된다.
  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));

  return (
    <section className="min-w-0 flex-1">
      {/* 목록 헤더 — Figma 1:579 (이모지 45px + 제목 x=65) */}
      <header className="flex items-center gap-[20px]">
        <span className="text-[45px] leading-[45px]" aria-hidden>
          {emoji}
        </span>
        <h1 className="text-[28px] font-bold leading-[34px] text-black">
          {title}
        </h1>
        <span className="text-[16px] leading-[22px] text-gray3">{total}개</span>
      </header>

      {pages.length === 0 ? (
        <p className="mt-[40px] text-[16px] text-gray3">
          아직 등록된 게시물이 없습니다.
        </p>
      ) : (
        <ul className="mt-[30px]">
          {pages.map((page) => (
            <PageListItem
              key={page.id}
              page={page}
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
