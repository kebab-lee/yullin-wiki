"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import type { AdminCategorySummary } from "@/lib/types";
import { categoryHasPages } from "@/lib/validation/category";

type DeleteCategoryDialogProps = {
  category: AdminCategorySummary;
  onClose: () => void;
};

/**
 * 항목 삭제 확인 팝업 (`/admin/categories`)
 *
 * ── 게시물 삭제처럼 이름을 옮겨 적게 하지 않는다 ────────────────
 * DeletePageDialog 는 제목을 그대로 입력해야 통과한다. 그 한 겹이 거기 필요한
 * 이유는 셋이다: **EDITOR 도** 지울 수 있고, 대상이 **남이 쓴 글**이며, 지우면
 * 되살리는 화면이 없다(soft delete + 복원 UI 없음). 항목 삭제는 셋 다 다르다.
 *
 *   · 권한 — ADMIN 만 지운다. 실수할 수 있는 사람의 범위부터 좁다.
 *   · 파괴력 — **문서가 한 건이라도 있으면 서버가 거부한다.** 지워지는 항목은
 *     정의상 아무것도 딸리지 않은 껍데기이고, 없어지는 것은 이름·아이콘·순서
 *     세 값뿐이다.
 *   · 되돌리기 — 같은 slug 로 다시 만들면 주소까지 그대로 복구된다. 문서 삭제와
 *     달리 잃을 내용이 없다.
 *
 * 즉 최악의 결과가 "몇 초짜리 재입력"이다. 확인 절차의 무게는 되돌리기 비용에
 * 맞춰야 하고, 그보다 무거우면 절차가 아니라 요식이 되어 사람은 읽지 않고
 * 통과하는 법부터 익힌다. 대신 **지울 대상을 크게 보여주고**(아이콘 + 두 이름 +
 * slug) 삭제 버튼을 기본 동작이 아닌 자리에 둔다.
 *
 * confirm() 을 쓰지 않는 이유는 그대로다 — 엔터 한 번에 지나가고, 무엇을
 * 지우는지 화면에 남길 수 없다.
 *
 * **문서가 남은 항목은 버튼부터 눌리지 않는다.** 목록이 이미 문서 수를 알고
 * 있으므로(AdminCategorySummary.pageCount) 시도해 보고 409 를 받는 대신 미리
 * 답한다. 그래도 요청 경로의 거절 처리를 남겨 두는 것은, 이 화면을 그린 뒤
 * 누군가 그 항목에 글을 쓸 수 있기 때문이다(TOCTOU) — 그 경우 서버 문구가
 * 아래에 그대로 뜬다.
 */
export default function DeleteCategoryDialog({
  category,
  onClose,
}: DeleteCategoryDialogProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = category.pageCount > 0;

  const handleDelete = async () => {
    if (blocked || deleting) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // 문서 수를 포함한 문구가 여기로 온다 (categoryHasPages).
        const body = await readErrorBody(response);
        setError(body.message);
        setDeleting(false);
        return;
      }

      // 목록에서 사라져야 한다. 공개 화면 캐시는 route handler 가 털었고,
      // 여기서는 라우터 캐시에 남은 이전 렌더를 버린다.
      router.refresh();
      onClose();
    } catch {
      setError(NETWORK_ERROR);
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-category-dialog-title"
    >
      <div className="max-h-[90dvh] w-full max-w-[420px] overflow-y-auto rounded-[16px] bg-white p-[28px]">
        <h2
          id="delete-category-dialog-title"
          className="text-[20px] font-bold text-black"
        >
          항목 삭제
        </h2>

        <p className="mt-[12px] text-[14px] leading-[22px] text-gray4">
          이 항목을 삭제하면 홈의 카테고리 버튼과 푸터 목록에서 사라지고,
          <br />
          {`/categories/${category.slug}`} 주소도 더 이상 열리지 않습니다.
        </p>

        {/* 무엇을 지우는지 화면에 남긴다. 확인 문구를 받지 않는 대신
            대상을 크게 보여주는 것이 이 팝업의 확인 절차다. */}
        <div className="mt-[16px] flex items-center gap-[12px] rounded-[8px] bg-gray-50 px-[14px] py-[12px]">
          <span className="text-[28px] leading-none" aria-hidden>
            {category.icon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-black">
              {category.name}
            </p>
            <p className="truncate text-[13px] text-gray3">
              {category.fullName} · {category.slug}
            </p>
          </div>
        </div>

        {blocked && (
          <p
            role="alert"
            className="mt-[14px] text-[13px] leading-[20px] text-brand-red"
          >
            {/* 서버가 거절할 때와 **같은 문구**다. 문구의 정본은 검증 모듈이
                소유한다 — 여기 손으로 적으면 한쪽만 고쳐져서 미리 막았을 때와
                실제로 거절당했을 때 다른 말을 하게 된다. */}
            {categoryHasPages(category.pageCount)}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-[14px] text-[13px] leading-[20px] text-brand-red">
            {error}
          </p>
        )}

        <div className="mt-[24px] flex justify-end gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="h-11 rounded-full border border-gray2 px-[20px] text-[14px] text-gray3 transition-colors hover:border-brand-red hover:text-brand-red disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={blocked || deleting}
            className="h-11 rounded-full bg-brand-red px-[24px] text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {deleting ? "삭제 중..." : "삭제하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
