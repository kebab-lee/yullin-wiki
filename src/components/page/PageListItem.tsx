import Link from "next/link";

import CategoryBadge from "@/components/common/CategoryBadge";
import CommentBubble from "@/components/common/CommentBubble";
import Tag from "@/components/common/Tag";
import type { Category, PageSummary } from "@/lib/types";

type PageListItemProps = {
  page: PageSummary;
  /**
   * 이 게시물의 항목. 못 찾으면 배지를 생략한다 — ArticleHeader 와 같은 규칙이다.
   * 목록 응답은 categoryId 만 싣고 표시명은 캐시된 카테고리 목록에서 찾는다.
   */
  category?: Category;
};

/**
 * `2026.08.06` 형태.
 *
 * timeZone 을 못박는 이유는 ArticleHeader.formatDate 와 같다 — 서버와 브라우저의
 * 기본 시간대가 다르면 같은 값이 서로 다른 날짜로 그려져 hydration 이 어긋난다.
 */
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(iso))
    .replace(/\.$/, "")
    .replace(/\s/g, "");
}

/**
 * 목록의 게시물 한 줄.
 *
 * **행 전체를 Link 로 감싸지 않는다.** 항목 배지와 태그가 그 자체로 링크가
 * 되어야 하는(또는 될) 요소인데, a 안의 a 는 HTML 이 허용하지 않아서 브라우저가
 * 마크업을 쪼개 버린다. 그래서 제목만 링크다.
 *
 * 카드(RecentPostCard)와 다른 컴포넌트인 이유: 카드는 190x190 정사각형에 3줄
 * 미리보기를 넣는 홈 전용 모양이고, 목록은 1006px 폭에 한 줄씩 쌓이는 모양이라
 * 배치가 공유되지 않는다. 한 컴포넌트에 variant 를 두면 두 시안이 서로를
 * 제약한다.
 */
export default function PageListItem({ page, category }: PageListItemProps) {
  return (
    <li className="border-b border-gray2 py-[20px] first:pt-0">
      <div className="flex items-start justify-between gap-[20px]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[10px]">
            {category && <CategoryBadge category={category} />}
            <Link
              href={`/pages/${page.id}`}
              className="min-w-0 truncate text-[20px] font-bold leading-[26px] text-black transition-colors hover:text-brand-red"
            >
              {page.title}
            </Link>
          </div>

          <p className="mt-[10px] text-card-content text-gray4 line-clamp-2">
            {page.excerpt}
          </p>

          {page.tags.length > 0 && (
            <div className="mt-[10px] flex flex-wrap items-center gap-[10px]">
              {page.tags.map((tag) => (
                <Tag key={tag} name={tag} />
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-[10px]">
          {/* 공개 목록에 오른 게시물은 publishedAt 이 있다. 타입상 null 이
              가능하므로 그 경우 날짜 줄만 비운다 — 대체 문구를 만들지 않는다. */}
          {page.publishedAt && (
            <span className="whitespace-nowrap text-[13px] leading-[20px] text-gray3">
              {formatDate(page.publishedAt)}
            </span>
          )}
          {page.commentCount > 0 && <CommentBubble count={page.commentCount} />}
        </div>
      </div>
    </li>
  );
}
