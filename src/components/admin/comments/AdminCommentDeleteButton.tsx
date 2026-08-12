"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmDialog from "@/components/common/ConfirmDialog";
import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";

type AdminCommentDeleteButtonProps = {
  commentId: string;
};

/**
 * 댓글 관리 목록의 삭제 버튼.
 *
 * **기존 `DELETE /api/comments/[id]` 를 그대로 쓴다.** 관리 화면용 삭제 라우트를
 * 새로 만들지 않는다 — 그 순간 "누가 남의 발언을 내릴 수 있는가"의 규칙이 두
 * 곳에 생기고, 한쪽만 고쳐지면 상세 화면에서는 막히는 삭제가 관리 화면에서는
 * 통과한다. commentService.deleteComment 가 그 판정의 정본이다.
 *
 * 확인 팝업은 신고 관리와 같은 컴포넌트를 쓴다 — 같은 조작(댓글 삭제)이고 시안
 * 문구도 같은 1:2500 이다.
 *
 * **표시용 판정이다.** 이 버튼이 그려지는 조건(ADMIN 인가)은 실수를 줄일 뿐이고,
 * 진짜 차단은 service 가 한다 — EDITOR 가 주소를 직접 쳐서 API 를 불러도 403 이다.
 */
export default function AdminCommentDeleteButton({
  commentId,
}: AdminCommentDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        setError(body.message);
        setPending(false);
        return;
      }

      setOpen(false);
      setPending(false);
      // 목록의 정본은 서버다. 이 줄만 지우면 전체 건수·페이지 수가 어긋난다.
      router.refresh();
    } catch {
      setError(NETWORK_ERROR);
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "min-h-11 rounded-pill border border-gray2 px-[14px] text-[14px] leading-[18px] text-gray4",
          "transition-colors hover:border-brand-red hover:text-brand-red lg:min-h-[32px]",
        ].join(" ")}
      >
        삭제
      </button>

      {open && (
        <ConfirmDialog
          title="댓글을 삭제하시겠습니까?"
          confirmLabel="삭제"
          pendingLabel="삭제 중..."
          pending={pending}
          error={error}
          onClose={() => {
            if (pending) return;
            setOpen(false);
            setError(null);
          }}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
