"use client";

import { useState } from "react";

import CommentForm from "@/components/comment/CommentForm";
import { useComments } from "@/components/comment/CommentsProvider";
import ReportCommentDialog from "@/components/comment/ReportCommentDialog";
import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import { formatDate } from "@/lib/format/date";
import type { CommentView } from "@/lib/types";

/**
 * 익명 댓글의 표시명. 실제 작성자는 DB 에 그대로 남아 있고 화면만 가린다.
 * authorName 이 null 인 경우가 익명과 탈퇴 둘이라, 어느 쪽인지는
 * isAnonymous 가 가른다 (types/comment.ts CommentView 주석).
 */
const ANONYMOUS_LABEL = "익명";

/** 탈퇴 회원. ArticleHeader 와 같은 문구를 쓴다 — 같은 사실을 가리킨다. */
const UNKNOWN_AUTHOR = "(탈퇴한 사용자)";

/** 신고 접수 완료 (Figma 1:1255). 팝업을 닫은 자리에 잠깐 남는다. */
const REPORTED_MESSAGE = "신고가 접수되었습니다 ✅";

type CommentItemProps = {
  pageId: string;
  comment: CommentView;
  /** 이 댓글에 달린 답글. 답글 자신에게는 오지 않는다(1단계 제한). */
  replies?: CommentView[];
  /** ADMIN 인가. 남의 댓글에도 삭제 버튼이 붙는다. */
  canModerate: boolean;
  /** 로그인했는가. 답글 폼을 열 수 있는지 판단한다. */
  isLoggedIn: boolean;
  /** 이 항목 자체가 답글인가. 들여쓰기와 "답글" 버튼 유무가 갈린다. */
  isReply?: boolean;
};

function AuthorLabel({ comment }: { comment: CommentView }) {
  const name = comment.isAnonymous
    ? ANONYMOUS_LABEL
    : (comment.authorName ?? UNKNOWN_AUTHOR);

  return (
    // Figma 1:929: 좌측 아이콘 + 라벨 컬럼 54폭.
    <div className="flex w-[54px] shrink-0 flex-col items-center gap-[4px]">
      <span
        aria-hidden
        className="flex size-[32px] items-center justify-center rounded-full bg-brand-red-pink text-brand-red"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="5" r="3" />
          <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5v1H2v-1Z" />
        </svg>
      </span>
      <span className="w-full truncate text-center text-[12px] font-normal leading-[15px] text-gray4">
        {name}
      </span>
    </div>
  );
}

/**
 * 댓글 한 건 (Figma 1:546 / 대댓글 1:547, 본문 배치 1:929).
 *
 * ── 본문을 JSX 텍스트로 그리는 것이 이 컴포넌트의 핵심이다 ──
 * `dangerouslySetInnerHTML` 을 쓰지 않는다. 댓글은 회원가입만 하면 누구나 쓰는
 * 값이라 신뢰 경계 밖이고, React 가 이스케이프해 주는 덕분에
 * `<script>alert(1)</script>` 은 실행되지 않고 그 글자 그대로 보인다.
 * 게시물 본문(ArticleBody)이 innerHTML 을 쓸 수 있는 근거는 작성자가 EDITOR
 * 이상이라는 전제이며, 댓글에는 그 전제가 없다 (editor/renderContent.ts 주석).
 *
 * 줄바꿈은 `whitespace-pre-wrap` 이 처리한다. 저장할 때도 그릴 때도 <br> 로
 * 바꾸지 않는다. URL 을 <a> 로 만드는 자동 링크도 만들지 않는다 —
 * javascript: 같은 스킴을 걸러야 하는 부담을 애초에 지지 않기 위해서다.
 *
 * 클라이언트 컴포넌트인 이유는 본문이 아니라 **조작** 때문이다: 답글 폼을
 * 여닫고 삭제를 두 번 물어야 한다. 목록 자체(CommentSection)는 서버에 남는다.
 */
export default function CommentItem({
  pageId,
  comment,
  replies = [],
  canModerate,
  isLoggedIn,
  isReply = false,
}: CommentItemProps) {
  const { reload } = useComments();

  const [replying, setReplying] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // **표시용 판정이다.** 실제 차단은 commentService.deleteComment 가 한다 —
  // API 는 이 화면을 거치지 않고 직접 호출된다 (CLAUDE.md "권한").
  const canDelete = comment.isMine || canModerate;

  // ── 신고 버튼을 그리는 조건 ─────────────────────────────────
  // **비로그인에게는 아예 노출하지 않는다.** 댓글 폼과 다른 판단이다 — 저쪽은
  // 폼을 보여주고 로그인을 안내하는데(다 쓴 글이 사라지지 않게), 신고는 눌러야
  // 무엇을 하는 버튼인지 알 수 있는 조작이라 로그인 유도로 이어지면 아무 맥락
  // 없이 로그인 화면을 만나게 된다.
  //
  // 자기 댓글에도 그리지 않는다. 자기 발언에 대한 조치는 신고가 아니라 삭제이고
  // 그 버튼이 바로 옆에 있다 — 실제 차단은 reportService 가 한다(403).
  //
  // 이미 지워진 댓글에는 애초에 이 컴포넌트가 그려지지 않는다(목록이 VISIBLE 만
  // 내려온다).
  const canReport = isLoggedIn && !comment.isMine;

  // ── 신고 사실은 신고자만 안다 ───────────────────────────────
  // 접수 후에도 목록을 다시 그리지 않고(router.refresh 없음) 이 컴포넌트의
  // 상태 하나만 바뀐다. 서버 응답에도 신고 여부가 실리지 않으므로(204),
  // **새로고침하면 이 표시는 사라지고 버튼이 돌아온다.** 그건 버그가 아니라
  // 의도다 — "이미 신고함"을 화면에 남기려면 신고 여부를 댓글 목록 응답에
  // 실어야 하는데, 그 계약이 생기는 순간 남의 신고 여부를 묻는 경로도 함께
  // 열린다. 중복 신고는 DB 의 unique 제약이 막고 409 로 답한다.

  const handleDelete = async () => {
    if (deleting) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        setError(body.message);
        setConfirmingDelete(false);
        return;
      }

      // 지워진 줄만 빼는 대신 목록을 다시 읽는다 — 부모를 지우면 답글이
      // 최상위로 올라오는 등 다른 줄의 모양까지 바뀐다 (toThreads).
      // router.refresh() 를 쓰지 않는 이유는 CommentForm 쪽과 같다.
      reload();
    } catch {
      setError(NETWORK_ERROR);
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li
      className={
        // Figma 대댓글(1:547)은 x=67.29 — 800 폭에서 67px 들여쓰기다. 375px
        // 화면에서 그대로 쓰면 본문 폭이 절반 가까이 날아가므로 단계적으로 준다.
        isReply ? "ml-[20px] sm:ml-[40px] lg:ml-[67px]" : undefined
      }
    >
      <article className="flex gap-[16px] lg:gap-[30px]">
        <AuthorLabel comment={comment} />

        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap break-words text-[14px] font-light leading-[22px] text-black">
            {comment.content}
          </p>

          <div className="mt-[6px] flex flex-wrap items-center gap-x-[12px] gap-y-[4px] text-[13px] leading-[16px] text-gray3">
            <time dateTime={comment.createdAt}>
              {formatDate(comment.createdAt)}
            </time>

            {/* 답글의 답글은 만들지 않는다. 버튼이 없는 것이 그 제한의 첫
                방어선이고, 두 번째는 commentService 의 assertRepliable 이다. */}
            {!isReply && isLoggedIn && (
              <button
                type="button"
                onClick={() => setReplying((open) => !open)}
                className="min-h-11 transition-colors hover:text-brand-red lg:min-h-0"
              >
                {replying ? "답글 취소" : "답글"}
              </button>
            )}

            {canDelete &&
              (confirmingDelete ? (
                <span className="flex items-center gap-[8px]">
                  <span className="text-gray4">삭제할까요?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="min-h-11 font-medium text-brand-red disabled:opacity-50 lg:min-h-0"
                  >
                    {deleting ? "삭제 중..." : "삭제"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="min-h-11 disabled:opacity-50 lg:min-h-0"
                  >
                    취소
                  </button>
                </span>
              ) : (
                /* 되돌릴 수 없는 동작이라 한 번 더 묻는다. 팝업 대신 제자리
                   확인인 것은 댓글이 목록 안의 작은 단위라서다 — 화면 전체를
                   덮는 모달은 무엇을 지우는지 오히려 가린다. */
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="min-h-11 transition-colors hover:text-brand-red lg:min-h-0"
                >
                  삭제
                </button>
              ))}

            {canReport &&
              (reported ? (
                <span className="text-gray4">{REPORTED_MESSAGE}</span>
              ) : (
                /* 삭제와 달리 제자리 확인이 아니라 팝업이다. 고를 사유가 6개라
                   한 줄에 들어가지 않고, 무엇을 신고하는지 본문과 함께 다시
                   보여줘야 한다 (Figma 1:1236). */
                <button
                  type="button"
                  onClick={() => setReporting(true)}
                  className="min-h-11 transition-colors hover:text-brand-red lg:min-h-0"
                >
                  신고
                </button>
              ))}
          </div>

          {reporting && (
            <ReportCommentDialog
              commentId={comment.id}
              content={comment.content}
              onClose={() => setReporting(false)}
              onReported={() => {
                setReporting(false);
                setReported(true);
              }}
            />
          )}

          {error ? (
            <p role="alert" className="mt-[4px] text-[13px] text-brand-red">
              {error}
            </p>
          ) : null}

          {replying && (
            <CommentForm
              pageId={pageId}
              parentId={comment.id}
              autoFocus
              onSubmitted={() => setReplying(false)}
              onCancel={() => setReplying(false)}
            />
          )}
        </div>
      </article>

      {replies.length > 0 && (
        <ul className="mt-[20px] flex flex-col gap-[20px]">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              pageId={pageId}
              comment={reply}
              canModerate={canModerate}
              isLoggedIn={isLoggedIn}
              isReply
            />
          ))}
        </ul>
      )}
    </li>
  );
}
