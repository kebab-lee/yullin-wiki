import CategoryBadge from "@/components/common/CategoryBadge";
import CommentBubble from "@/components/common/CommentBubble";
import Tag from "@/components/common/Tag";
import { formatDate } from "@/lib/format/date";
import type { Category, PageDetail } from "@/lib/types";

type ArticleHeaderProps = {
  page: PageDetail;
  /** 목록 응답과 함께 받은 카테고리. 못 찾으면 배지를 생략한다. */
  category?: Category;
  /**
   * 말풍선에 그릴 댓글 수.
   *
   * page.commentCount 가 이미 같은 수를 들고 있는데 굳이 받는 이유는 **신선도**
   * 다. 게시물 상세 응답은 60초 캐시(REVALIDATE.pages)를 타는 반면 댓글 목록은
   * 매번 새로 읽으므로, 방금 단 댓글이 목록에는 보이는데 배지는 그대로인 상태가
   * 생긴다. 값을 받은 쪽이 있으면 그 수를 쓴다 — 같은 화면의 두 곳이 다른 수를
   * 말하지 않게.
   */
  commentCount?: number;
};

/**
 * 탈퇴 회원은 users.name 이 NULL 이다. 문구는 도메인이 아니라 화면이 정한다.
 *
 * name 이 비는 경로는 탈퇴 하나뿐이므로(가입 시 필수, 수정에서도 필수)
 * "알 수 없음"처럼 원인을 감추는 문구 대신 사실을 그대로 적는다 — 게시물은
 * 남고 작성자 정보만 사라진다는 것이 이용 안내(/policy 2절)의 약속이다.
 */
const UNKNOWN_AUTHOR = "(탈퇴한 사용자)";

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
export default function ArticleHeader({
  page,
  category,
  commentCount,
}: ArticleHeaderProps) {
  // 발행 전 게시물은 상세로 오지 않지만(service 가 404), 타입상 null 이 가능하다.
  // 그 경우 작성 시각을 대신 보여준다.
  const publishedAt = page.publishedAt ?? page.createdAt;

  return (
    <header className="flex flex-col gap-[16px] lg:flex-row lg:items-start lg:justify-between lg:gap-[20px]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-[10px]">
          {category && <CategoryBadge category={category} />}
          <h1 className="min-w-0 text-[26px] font-extrabold leading-[34px] text-black lg:text-[36px] lg:leading-[45px]">
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

      <div className="flex shrink-0 items-start gap-[10px] lg:justify-end">
        <dl className="w-[110px] shrink-0 text-[13px] leading-[20px]">
          <MetaRow label="게시일" value={formatDate(publishedAt)} />
          <MetaRow label="수정일" value={formatDate(page.updatedAt)} />
          <MetaRow label="작성자" value={page.authorName ?? UNKNOWN_AUTHOR} />
        </dl>
        <CommentBubble count={commentCount ?? page.commentCount} />
      </div>
    </header>
  );
}
