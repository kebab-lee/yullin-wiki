"use client";

import { useState } from "react";

import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import type { CommentReportReason } from "@/lib/types";
import {
  COMMENT_REPORT_REASONS,
  REASON_LABEL,
} from "@/lib/validation/report";

type ReportCommentDialogProps = {
  commentId: string;
  /** 신고 대상 댓글 본문. 무엇을 신고하는지 팝업 안에서 다시 보여준다. */
  content: string;
  onClose: () => void;
  /** 접수 성공. 부모가 완료 알림으로 바꾼다 (Figma 1:1255). */
  onReported: () => void;
};

/**
 * 댓글 신고 팝업 (Figma 1:1236 — 670x696)
 *
 * ── 사유를 라디오로만 받는다 ────────────────────────────────
 * 자유 입력 칸이 없다. 받는 순간 신뢰 경계 밖의 문자열이 어드민 화면에 그려지는
 * 경로가 하나 더 생기고(댓글 본문과 같은 부담), 그 값을 검증·저장·렌더할 규칙을
 * 통째로 더 만들어야 한다. 선택지만으로 판단이 안 되는 신고는 관리자가 원문을
 * 읽으면 된다 — 신고 관리 목록이 이미 댓글 본문을 싣는다.
 *
 * **기본 선택이 없다.** 시안의 제목이 "신고 사유를 선택해주세요" 이고, 하나를
 * 미리 켜 두면 아무 생각 없이 누른 신고가 그 사유로 접수된다. 고를 때까지
 * 제출 버튼이 잠긴다.
 *
 * ── 대상 댓글은 스크롤 상자에 넣는다 ────────────────────────
 * 시안 Frame 1523(1:1244)이 561x112 에 "최대 4줄, 더 길면 스크롤" 이다. 댓글은
 * 1000자까지 허용되므로(COMMENT_CONTENT_MAX) 상자를 유동으로 두면 긴 댓글
 * 하나가 팝업을 화면 밖까지 밀어낸다.
 *
 * 여기서 막는 것은 실수이지 권한이 아니다. 로그인·자기 댓글·중복 신고는 전부
 * reportService 가 판정하고, 이 팝업을 건너뛰고 API 를 직접 불러도 막힌다.
 */
export default function ReportCommentDialog({
  commentId,
  content,
  onClose,
  onReported,
}: ReportCommentDialogProps) {
  const [reason, setReason] = useState<CommentReportReason | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (reason === null || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/comments/${commentId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        // 중복 신고(409)는 필드 문구로 온다. 폼 단위 문구보다 그쪽이 구체적이라
        // 있으면 우선한다 (다른 폼들과 같은 규칙).
        setError(body.fields?.reason ?? body.message);
        setSubmitting(false);
        return;
      }

      // 목록을 다시 그리지 않는다. 신고는 화면에 아무 흔적도 남기지 않는
      // 조작이다 — 신고당한 댓글은 그대로 보이고, 신고했다는 사실이 다른
      // 사용자에게 보이면 안 된다.
      onReported();
    } catch {
      setError(NETWORK_ERROR);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-comment-dialog-title"
    >
      {/* 시안은 670x696 고정이지만 375px 에서 그대로 쓸 수 없다. 최대 폭으로
          두고 세로는 화면의 85%(dvh — vh 금지)를 넘지 않게 잘라 스크롤한다. */}
      <div className="flex max-h-[85dvh] w-full max-w-[670px] flex-col rounded-[16px] bg-white p-[24px] lg:p-[40px]">
        <h2
          id="report-comment-dialog-title"
          className="text-[20px] font-bold text-black lg:text-[24px]"
        >
          댓글 신고하기
        </h2>
        <p className="mt-[8px] text-[14px] leading-[22px] text-gray4">
          신고 사유를 선택해주세요
        </p>

        {/* 대상 댓글 — Figma Frame 1523. 4줄 넘으면 상자 안에서 스크롤한다. */}
        <p className="mt-[16px] max-h-[112px] shrink-0 overflow-y-auto whitespace-pre-wrap break-words rounded-[8px] bg-brand-red-white px-[14px] py-[12px] text-[14px] font-light leading-[22px] text-black">
          {content}
        </p>

        {/* 사유 6개 — Figma Frame 1525. 목록의 정본은 validation 모듈이고
            화면은 순서 그대로 그린다. 여기에 문자열을 손으로 적으면 사유가
            하나 늘 때 조용히 빠진다. */}
        <fieldset className="mt-[20px] min-h-0 flex-1 overflow-y-auto">
          <legend className="sr-only">신고 사유</legend>

          <div className="flex flex-col gap-[4px]">
            {COMMENT_REPORT_REASONS.map((value) => (
              <label
                key={value}
                // h-11 = 44px 터치 타깃 (CLAUDE.md "반응형").
                className="flex min-h-11 cursor-pointer items-center gap-[10px] rounded-[8px] px-[8px] text-[15px] leading-[22px] text-black transition-colors hover:bg-brand-red-white"
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  disabled={submitting}
                  className="size-[18px] shrink-0 accent-brand-red"
                />
                <span>{REASON_LABEL[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="mt-[12px] text-[13px] text-brand-red">
            {error}
          </p>
        )}

        <div className="mt-[20px] flex shrink-0 justify-end gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-11 rounded-full border border-gray2 px-[20px] text-[14px] text-gray3 transition-colors hover:border-brand-red hover:text-brand-red disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            // 사유를 고르기 전에는 누를 수 없다. 시안 버튼은 103x48 이다.
            disabled={reason === null || submitting}
            className="min-h-11 min-w-[103px] rounded-full bg-brand-red px-[24px] text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? "접수 중..." : "신고하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
