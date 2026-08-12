import Link from "next/link";

import {
  ANONYMOUS_BADGE,
  DELETED_COMMENT_BADGE,
  DELETED_PAGE_TITLE,
  WITHDRAWN_USER_NAME,
} from "@/components/admin/reports/labels";
import { formatDate } from "@/lib/format/date";
import type { AdminCommentSummary } from "@/lib/types";

import AdminCommentDeleteButton from "./AdminCommentDeleteButton";

type AdminCommentListProps = {
  comments: AdminCommentSummary[];
  /**
   * 삭제 버튼을 그릴 것인가 — ADMIN 인가.
   *
   * **이 화면은 EDITOR 부터 들어오지만 삭제는 ADMIN 만 된다**
   * (commentService.deleteComment 의 기준: EDITOR 는 글을 다루는 권한이지 남의
   * 발언을 내리는 권한이 아니다). 두 기준이 다른 것이 의도라, 눌러도 403 인
   * 버튼을 그리는 대신 미리 감춘다.
   *
   * 컴포넌트가 세션을 직접 읽지 않는다 — 그러면 서버 컴포넌트로 남을 수 없고,
   * 가드는 페이지가 조회는 목록이 하는 어긋난 상태가 생긴다 (AdminUserTable 과
   * 같은 규칙).
   */
  canDelete: boolean;
};

/**
 * 최근 달린 댓글 목록 (Figma Frame 1545, 1:2189 — AdRecentComment 880x184, 간격 40)
 *
 * **표가 아니라 카드 목록인 이유는 신고 관리와 같다** — 한 줄이 담는 것이 여러
 * 줄짜리 댓글 본문이라 표 셀에 넣으면 다른 칸이 전부 위에 붙는다
 * (AdminReportList 주석 참조).
 *
 * ── 지워진 댓글도 보인다 ────────────────────────────────────
 * 공개 목록(VISIBLE 만)과 반대다. 관리 화면에서 삭제분이 통째로 사라지면 "이
 * 댓글이 지워졌는가, 애초에 없었는가"를 구분할 방법이 없고, 신고 관리에서
 * 넘어와 대조할 수도 없다 (commentRepository.findForAdmin 주석).
 *
 * 서버 컴포넌트로 남는다. 조작이 필요한 조각(삭제 버튼)만 클라이언트다.
 */
export default function AdminCommentList({
  comments,
  canDelete,
}: AdminCommentListProps) {
  if (comments.length === 0) {
    return (
      <p className="mt-[40px] text-[16px] text-gray3">아직 댓글이 없습니다.</p>
    );
  }

  return (
    <ul className="mt-[24px] flex flex-col">
      {comments.map((comment) => {
        const isDeleted = comment.status === "DELETED";

        return (
          <li
            key={comment.id}
            className="border-b border-gray2 py-[20px] first:pt-0 lg:py-[26px]"
          >
            <div className="flex flex-col gap-[12px] lg:flex-row lg:items-start lg:justify-between lg:gap-[24px]">
              <div className="min-w-0 flex-1">
                {/* 게시물 제목 — 시안에서 이 줄이 "어느 글에 달렸는가"를 답한다.
                    각 항목에서 해당 문서로 이동하는 링크이기도 하다.
                    지워진 게시물은 링크가 되지 않는다 — 상세가 404 다. */}
                {comment.pageTitle === null ? (
                  <p className="text-[16px] font-bold leading-[22px] text-gray3">
                    {DELETED_PAGE_TITLE}
                  </p>
                ) : (
                  <Link
                    href={`/pages/${comment.pageId}`}
                    className="block truncate text-[16px] font-bold leading-[22px] text-black transition-colors hover:text-brand-red"
                  >
                    {comment.pageTitle}
                  </Link>
                )}

                {/* 본문. React 가 이스케이프하므로 innerHTML 을 쓰지 않는다
                    (CommentItem 과 같은 근거 — 댓글은 신뢰 경계 밖이다).
                    지워진 댓글은 흐리게 그려서 살아 있는 것과 구분한다. */}
                <p
                  className={[
                    "mt-[8px] whitespace-pre-wrap break-words text-[14px] font-light leading-[22px]",
                    isDeleted ? "text-gray3 line-through" : "text-black",
                  ].join(" ")}
                >
                  {comment.content}
                </p>

                <div className="mt-[8px] flex flex-wrap items-center gap-x-[16px] gap-y-[6px] text-[13px] leading-[18px] text-gray3">
                  <span>
                    {/* **익명 댓글도 실명이 보인다.** 관리 화면은 신고 처리와
                        대조가 가능해야 한다 (types/comment.ts 주석). 익명이었다는
                        사실은 꼬리표로 함께 남긴다. */}
                    <span className="font-medium text-gray4">
                      {comment.authorName ?? WITHDRAWN_USER_NAME}
                    </span>
                    {comment.isAnonymous && (
                      <span className="ml-[4px] rounded-pill bg-gray2 px-[6px] py-[1px] text-[12px] text-gray4">
                        {ANONYMOUS_BADGE}
                      </span>
                    )}
                  </span>

                  <time dateTime={comment.createdAt}>
                    {formatDate(comment.createdAt)}
                  </time>

                  {isDeleted && (
                    <span className="inline-flex h-[22px] items-center rounded-pill bg-gray2 px-[8px] text-[12px] text-gray4">
                      {DELETED_COMMENT_BADGE}
                    </span>
                  )}
                </div>
              </div>

              {/* 이미 지워진 댓글에는 삭제 버튼을 그리지 않는다 — service 도
                  404 로 답한다(없는 댓글과 지워진 댓글은 둘 다 404). */}
              {canDelete && !isDeleted && (
                <div className="lg:shrink-0">
                  <AdminCommentDeleteButton commentId={comment.id} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
