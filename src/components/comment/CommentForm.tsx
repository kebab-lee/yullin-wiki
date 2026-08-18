"use client";

import { useState } from "react";

import { useComments } from "@/components/comment/CommentsProvider";
import FieldMessage from "@/components/common/FieldMessage";
import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import {
  COMMENT_CONTENT_MAX,
  validateCommentForm,
} from "@/lib/validation/comment";

type CommentFormProps = {
  pageId: string;
  /** 답글이면 부모 댓글 id. 최상위 댓글이면 생략한다. */
  parentId?: string;
  /** 답글 폼처럼 사용자가 방금 연 폼은 바로 쓸 수 있어야 한다. */
  autoFocus?: boolean;
  /** 작성이 끝났을 때. 답글 폼은 이때 닫힌다. */
  onSubmitted?: () => void;
  /** 취소 버튼. 최상위 폼에는 없다(닫을 대상이 아니다). */
  onCancel?: () => void;
};

const PLACEHOLDER = "댓글을 입력해주세요.";
const REPLY_PLACEHOLDER = "답글을 입력해주세요.";

/**
 * 댓글 입력 (Figma 1:544, 800x54 / 익명 체크 1:908).
 *
 * ── 여기에 에디터를 붙이지 마라 ──
 * 게시물 본문은 Tiptap 으로 쓰지만 댓글은 **평문**이다. 리치 텍스트로 만들면
 * 저장되는 값이 사용자 입력 HTML/JSON 이 되고, 그 순간 렌더 쪽에서
 * dangerouslySetInnerHTML 을 쓰고 싶은 압력이 생긴다. 댓글은 회원가입만 하면
 * 누구나 쓰므로 신뢰 경계 밖이고, 그 압력 자체를 없애 두는 것이 이 결정의
 * 전부다 (commentService 파일 주석).
 *
 * 줄바꿈은 서식이 아니라 원문 그대로다 — 저장할 때 <br> 로 바꾸지 않고
 * 화면이 CSS(white-space: pre-wrap)로 처리한다.
 *
 * **검증은 서버와 같은 함수를 쓴다**(validateCommentForm). 여기서 규칙을 다시
 * 적으면 두 벌이 되고 한쪽만 고쳐진다 (CLAUDE.md "검증").
 */
export default function CommentForm({
  pageId,
  parentId,
  autoFocus,
  onSubmitted,
  onCancel,
}: CommentFormProps) {
  const { reload } = useComments();

  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isReply = parentId !== undefined;

  const handleSubmit = async () => {
    if (submitting) return;

    // 서버가 어차피 같은 규칙으로 다시 본다. 여기서 미리 보는 것은 빈 요청을
    // 왕복시키지 않기 위한 편의일 뿐이다.
    const errors = validateCommentForm({ content });
    if (errors.content) {
      setError(errors.content);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/pages/${pageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId: parentId ?? null, isAnonymous }),
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        // 본문 칸에 붙는 문구가 있으면 그쪽을 우선한다. 없으면 폼 단위 문구
        // (401 "로그인이 필요합니다" 등)를 그대로 보여준다.
        setError(body.fields?.content ?? body.message);
        return;
      }

      setContent("");
      setIsAnonymous(false);
      onSubmitted?.();

      // 응답(201)에 방금 만들어진 댓글이 실려 오지만 그 한 줄을 목록에
      // 끼워 넣지 않고 서버에 다시 묻는다 — 목록의 정본은 서버다.
      //
      // **router.refresh() 가 아니라 reload() 다.** 상세 페이지는 정적 생성이라
      // 라우트를 새로 그려도 댓글은 브라우저가 따로 읽어 온 값이고, refresh 는
      // 그 값을 건드리지 않는다 (CommentsProvider).
      reload();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={isReply ? "mt-[12px]" : undefined}>
      {/* Figma 1:544 는 한 줄(800x54)이다. lg 미만에서는 입력과 조작을 위아래로
          쌓는다 — 한 줄에 넣으면 입력 칸이 손가락 하나 폭으로 줄어든다. */}
      <div className="flex flex-col gap-[10px] rounded-card border border-gray2 p-[12px] lg:flex-row lg:items-center lg:gap-[12px] lg:py-[8px]">
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setError(null);
          }}
          /* maxLength 는 편의다(붙여넣기가 조용히 잘린다). 진짜 상한은 서버가
             같은 상수로 다시 본다. */
          maxLength={COMMENT_CONTENT_MAX}
          rows={isReply ? 2 : 1}
          autoFocus={autoFocus}
          placeholder={isReply ? REPLY_PLACEHOLDER : PLACEHOLDER}
          aria-label={isReply ? "답글 입력" : "댓글 입력"}
          className="min-h-11 w-full flex-1 resize-y bg-transparent text-[14px] font-light leading-[22px] text-black outline-none placeholder:text-gray3 lg:min-h-[38px]"
        />

        <div className="flex shrink-0 items-center justify-between gap-[10px] lg:justify-end">
          {/* Figma 1:908 "익명" — 표시만 익명이다. 작성자는 그대로 기록된다. */}
          <label className="flex h-11 items-center gap-[6px] text-[13px] font-normal leading-[16px] text-gray4 lg:h-[38px]">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
              className="size-[16px] shrink-0 accent-brand-red"
            />
            익명
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || content.trim().length === 0}
            className="h-11 shrink-0 rounded-badge bg-brand-red px-[18px] text-[14px] font-medium leading-[17px] text-white transition-opacity hover:opacity-90 disabled:opacity-40 lg:h-[38px]"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="h-11 shrink-0 rounded-badge border border-gray2 px-[14px] text-[14px] font-normal leading-[17px] text-gray3 transition-colors hover:border-brand-red hover:text-brand-red disabled:opacity-50 lg:h-[38px]"
            >
              취소
            </button>
          )}
        </div>
      </div>

      {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}
    </div>
  );
}
