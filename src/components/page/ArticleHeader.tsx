import CommentCountBubble from "@/components/comment/CommentCountBubble";
import CategoryBadge from "@/components/common/CategoryBadge";
import Tag from "@/components/common/Tag";
import { formatDate } from "@/lib/format/date";
import type { Category, PageDetail } from "@/lib/types";

type ArticleHeaderProps = {
  page: PageDetail;
  /** 목록 응답과 함께 받은 카테고리. 못 찾으면 배지를 생략한다. */
  category?: Category;
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
 * 서버 컴포넌트이고 데이터는 전부 props 다 — 여기서 fetch 하지 않는다.
 *
 * **댓글 수만 예외다.** 이 페이지는 정적 생성이라 `page.commentCount` 는 빌드
 * 시점 값으로 굳는데 댓글은 그 뒤에도 달린다. 그래서 말풍선 하나만 클라이언트
 * 조각으로 내려가 댓글 섹션과 같은 값을 읽는다 (CommentCountBubble) —
 * 세션 의존 조각만 브라우저로 내리는 헤더의 방식과 같은 결이다.
 */
export default function ArticleHeader({
  page,
  category,
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
        <CommentCountBubble />
      </div>
    </header>
  );
}
