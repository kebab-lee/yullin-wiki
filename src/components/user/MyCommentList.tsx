import Link from "next/link";

import { formatDate } from "@/lib/format/date";
import type { MyCommentSummary } from "@/lib/types";

/** 게시물이 지워졌을 때. 댓글은 남지만 갈 곳이 없다. */
const DELETED_PAGE = "(삭제된 게시물)";

const EMPTY_MESSAGE = "아직 작성한 댓글이 없습니다.";

/**
 * 마이페이지 "내 댓글 모아보기" (Figma 1:1047, 880x353 · 항목 595x62).
 *
 * 서버 컴포넌트다. 상태도 이벤트도 없다 — 각 줄은 그 댓글이 달린 게시물로
 * 가는 링크이고, **여기서 댓글을 지우지 않는다.** 지우는 자리는 댓글이 실제로
 * 놓인 맥락(게시물 상세)이어야 한다. 앞뒤 대화가 안 보이는 목록에서 지우면
 * 무엇을 지우는지 모르고 지우게 된다.
 *
 * 본문은 상세 화면과 같은 규칙으로 그린다 — 평문을 JSX 텍스트로. 목록이라
 * 줄바꿈까지 살리지 않고 한 줄로 잘라 두지만(line-clamp), 그건 서식이 아니라
 * 자르기라서 HTML 변환이 끼어들 자리가 없다.
 *
 * 페이지네이션이 없다. 시안의 상자가 다섯 줄짜리 고정 높이이고, 넘겨 볼
 * "내 댓글 전체" 화면이 아직 없다 — 건수 상한은 commentService 가 정한다.
 */
export default function MyCommentList({
  comments,
}: {
  comments: MyCommentSummary[];
}) {
  return (
    <section className="w-full min-w-0">
      <h2 className="text-[15px] font-medium leading-[18px] text-black">
        내 댓글 모아보기
      </h2>
      <hr className="mt-[18px] border-t border-gray2" />

      {comments.length === 0 ? (
        <p className="mt-[15px] text-[14px] font-light leading-[22px] text-gray3">
          {EMPTY_MESSAGE}
        </p>
      ) : (
        <ul className="mt-[15px] flex flex-col">
          {comments.map((comment) => (
            <li key={comment.id} className="border-b border-gray2 last:border-0">
              {/* Figma 항목 62px. 터치 대상 44px 을 넘으므로 모바일에서도
                  그대로 쓴다. */}
              <Link
                href={`/pages/${comment.pageId}`}
                className="flex min-h-[62px] flex-col justify-center gap-[4px] py-[10px] transition-colors hover:text-brand-red"
              >
                <span className="truncate text-[14px] font-light leading-[22px] text-black">
                  {comment.content}
                </span>
                <span className="flex items-center gap-[8px] text-[13px] leading-[16px] text-gray3">
                  <span className="truncate">
                    {comment.pageTitle ?? DELETED_PAGE}
                  </span>
                  <time dateTime={comment.createdAt} className="shrink-0">
                    {formatDate(comment.createdAt)}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
