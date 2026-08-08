import Link from "next/link";

import CategoryBadge from "@/components/common/CategoryBadge";
import { splitByQuery } from "@/lib/search/excerpt";
import type { Category, PageSummary } from "@/lib/types";

type SearchResultItemProps = {
  page: PageSummary;
  /** 강조할 검색어. 서버가 실제로 검색에 쓴 문자열이다. */
  query: string;
  /**
   * 이 게시물의 항목. **검색 결과에서는 항상 넘어온다.**
   *
   * PageListItem 은 못 찾으면 배지를 생략하는데(항목별 목록에서는 모든 줄이 같은
   * 배지라 반복이 의미 없다), 검색은 항목을 가로지르므로 배지가 결과를 읽는 데
   * 필요한 정보다. 그래도 타입을 optional 로 두는 것은 목록 응답이 categoryId 만
   * 싣고 표시명은 따로 캐시된 카테고리 목록에서 찾기 때문이다 — 아직 캐시에 없는
   * 새 항목이면 배지 자리만 빈다.
   */
  category?: Category;
};

/**
 * 검색 결과 한 줄 (Figma Frame 1431 / 1:996 — 880x88, 간격 35px)
 *
 * **PageListItem 을 재사용하지 않는다.** 모양이 아니라 담는 것이 다르다:
 *   · 목록 줄은 태그·날짜·댓글 수까지 세로로 쌓여 높이가 내용에 따라 늘어나지만,
 *     검색 결과는 88px 고정이라 그것들이 들어갈 자리가 없다.
 *   · 검색 결과의 본문 발췌는 **검색어가 보이는 구간**이 잘려 오고 그 안에서
 *     일치 부분이 강조된다. 목록 줄의 발췌는 본문 앞부분이며 강조가 없다.
 * 한 컴포넌트에 `highlight` · `compact` 같은 플래그로 합치면 두 시안이 서로를
 * 제약하고, 목록을 고칠 때마다 검색 결과가 흔들린다.
 *
 * 행 전체를 Link 로 감싸지 않는 이유는 PageListItem 과 같다 — 항목 배지가 그
 * 자체로 링크이고 a 안의 a 는 HTML 이 허용하지 않는다.
 */
export default function SearchResultItem({
  page,
  query,
  category,
}: SearchResultItemProps) {
  return (
    <li className="flex min-h-[88px] w-full flex-col justify-center gap-[8px] border-b border-gray2 py-[12px] lg:h-[88px] lg:py-0">
      <div className="flex items-center gap-[10px]">
        {category && <CategoryBadge category={category} />}
        <Link
          href={`/pages/${page.id}`}
          className="min-w-0 truncate text-[20px] font-bold leading-[26px] text-black transition-colors hover:text-brand-red"
        >
          {page.title}
        </Link>
      </div>

      {/* 강조는 조각 배열을 엘리먼트로 옮겨 그린다. dangerouslySetInnerHTML 을
          쓰지 않는다 — 검색어는 사용자 입력이라 그 자리가 곧 XSS 가 된다. */}
      <p className="line-clamp-1 text-card-content text-gray4">
        {splitByQuery(page.excerpt, query).map((segment, index) =>
          segment.matched ? (
            // 조각은 위치로만 구분된다(같은 글자가 여러 번 나온다). 순서가
            // 바뀌지 않는 배열이라 index 키가 안전하다.
            <mark
              key={index}
              className="bg-transparent font-bold text-brand-red"
            >
              {segment.text}
            </mark>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </p>
    </li>
  );
}
