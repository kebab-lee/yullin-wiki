import CategoryBadge from "@/components/common/CategoryBadge";
import CommentBubble from "@/components/common/CommentBubble";
import Tag from "@/components/common/Tag";
import type { Category, PageDetail } from "@/lib/types";

type ArticleHeaderProps = {
  page: PageDetail;
  /** 목록 응답과 함께 받은 카테고리. 못 찾으면 배지를 생략한다. */
  category?: Category;
};

/** 탈퇴 회원은 users.name 이 NULL 이다. 문구는 도메인이 아니라 화면이 정한다. */
const UNKNOWN_AUTHOR = "알 수 없음";

/**
 * `2026.08.06` 형태.
 *
 * timeZone 을 못박는다. 서버와 브라우저의 기본 시간대가 다르면 같은 값이
 * 서로 다른 날짜로 그려져 hydration 이 어긋난다.
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

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-[8px] whitespace-nowrap">
      <dt className="text-gray3">{label}</dt>
      <dd className="text-gray4">{value}</dd>
    </div>
  );
}

/**
 * 게시물 상세 헤더 (Figma 1:1399, 800x97)
 *
 * 배지 + 제목 / 태그 줄 / 우측 메타(게시일·수정일·작성자) + 댓글 수.
 * 데이터는 전부 props 다 — 컴포넌트 안에서 fetch 하지 않는다.
 */
export default function ArticleHeader({ page, category }: ArticleHeaderProps) {
  // 발행 전 게시물은 상세로 오지 않지만(service 가 404), 타입상 null 이 가능하다.
  // 그 경우 작성 시각을 대신 보여준다.
  const publishedAt = page.publishedAt ?? page.createdAt;

  return (
    <header className="flex items-start justify-between gap-[20px]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-[10px]">
          {category && <CategoryBadge category={category} />}
          <h1 className="min-w-0 text-[36px] font-extrabold leading-[45px] text-black">
            {page.title}
          </h1>
        </div>

        {page.tags.length > 0 && (
          <div className="mt-[15px] flex flex-wrap items-center gap-[10px]">
            {page.tags.map((tag) => (
              <Tag key={tag} name={tag} />
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-start gap-[10px]">
        <dl className="w-[110px] text-[13px] leading-[20px]">
          <MetaRow label="게시일" value={formatDate(publishedAt)} />
          <MetaRow label="수정일" value={formatDate(page.updatedAt)} />
          <MetaRow label="작성자" value={page.authorName ?? UNKNOWN_AUTHOR} />
        </dl>
        <CommentBubble count={page.commentCount} />
      </div>
    </header>
  );
}
