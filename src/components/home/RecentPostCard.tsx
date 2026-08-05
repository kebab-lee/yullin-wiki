import Link from "next/link";
import type { PagePreview } from "@/lib/types";

type RecentPostCardProps = {
  page: PagePreview;
};

/** Figma 1:842에서 내보낸 "태그 더 있음" 점 3개 아이콘 (16x16) */
function TagOverflowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="text-category-green-dark"
      aria-hidden
    >
      <path
        d="M3 7C2.45 7 2 7.45 2 8C2 8.55 2.45 9 3 9C3.55 9 4 8.55 4 8C4 7.45 3.55 7 3 7ZM13 7C12.45 7 12 7.45 12 8C12 8.55 12.45 9 13 9C13.55 9 14 8.55 14 8C14 7.45 13.55 7 13 7ZM8 7C7.45 7 7 7.45 7 8C7 8.55 7.45 9 8 9C8.55 9 9 8.55 9 8C9 7.45 8.55 7 8 7Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * 댓글 수 말풍선 (Figma 1:892 card-small, 28x24)
 * Figma에서 말풍선 벡터는 좌우 반전되어 배치된다.
 */
function CommentBubble({ count }: { count: number }) {
  return (
    <div className="relative h-[24px] w-[28px] shrink-0">
      <svg
        width="28"
        height="24"
        viewBox="0 0 28 24"
        fill="none"
        className="absolute inset-0 -scale-x-100 text-redgray-light"
        aria-hidden
      >
        <path
          d="M4.45455 20.2817L0 24V6.76056C0 4.50704 1.52727 0 7.63636 0H21.3182C23.5455 0.112676 28 1.62254 28 6.76056V12.507C27.8939 14.7606 26.4091 19.2676 21.3182 19.2676H7.63636C7 19.2676 5.72727 19.2676 4.45455 20.2817Z"
          fill="currentColor"
        />
      </svg>
      <span className="absolute left-1/2 top-[calc(50%-3px)] -translate-x-1/2 -translate-y-1/2 text-[13px] font-medium leading-[16px] text-white">
        {count}
      </span>
    </div>
  );
}

/**
 * 홈 "최근 추가된 게시물" 카드 (Figma 1:830 card / categories3, 190x190)
 *
 * 제목 + 댓글 말풍선 / 태그 2개(+더보기) / 본문 미리보기 구성.
 * 데이터는 전부 props로 받는다. 컴포넌트 안에서 fetch하지 않는다.
 */
export default function RecentPostCard({ page }: RecentPostCardProps) {
  const visibleTags = page.tags.slice(0, 2);
  const hasMoreTags = page.tags.length > visibleTags.length;

  return (
    <Link
      href={`/pages/${page.id}`}
      className="flex size-[190px] flex-col items-end justify-between rounded-card bg-brand-red-white p-[20px] transition-shadow hover:shadow-md"
    >
      {/* 상단: 제목 + 댓글 수 + 태그 */}
      <div className="flex w-full flex-col items-start justify-center gap-[10px]">
        <div className="flex w-full items-start justify-end gap-[10px]">
          <p className="min-w-0 flex-1 overflow-hidden text-card-title text-black line-clamp-2">
            {page.title}
          </p>
          {page.commentCount > 0 && <CommentBubble count={page.commentCount} />}
        </div>

        <div className="flex items-center gap-[10px]">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="flex items-end justify-center whitespace-nowrap rounded-badge bg-category-green-light px-[4px] py-[2px] text-card-tag text-category-green-dark"
            >
              {tag}
            </span>
          ))}
          {hasMoreTags && (
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-pill bg-category-green-light pb-px">
              <TagOverflowIcon />
            </span>
          )}
        </div>
      </div>

      {/* Figma 1:844 — 상단 블록과 본문 사이 10px 스페이서 */}
      <div className="h-[10px] w-full shrink-0" />

      <p className="w-full overflow-hidden whitespace-pre-wrap text-card-content text-black line-clamp-3">
        {page.content}
      </p>
    </Link>
  );
}
