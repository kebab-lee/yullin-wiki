"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import TextField from "@/components/common/TextField";
import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import type { AdminCategorySummary } from "@/lib/types";
import {
  validateCategoryEdit,
  validateCategoryForm,
  type CategoryFormErrors,
  type CategoryFormInput,
} from "@/lib/validation/category";

type CategoryFormDialogProps = {
  /**
   * 수정 대상. **없으면 추가 모드다.**
   *
   * 추가와 수정을 한 팝업으로 두는 이유: 채우는 칸이 slug 하나를 빼고 같고,
   * 컴포넌트를 둘로 나누면 라벨·검증 연결·요청 코드가 두 벌이 되어 한쪽만
   * 고쳐진다. 갈리는 것은 **slug 를 입력받는가**와 **어디로 쏘는가** 둘뿐이라
   * 이 prop 하나로 충분하다.
   */
  category?: AdminCategorySummary;
  onClose: () => void;
};

const SLUG_LOCKED_HINT =
  "주소는 만들 때 정해지며 변경할 수 없습니다. 이미 나간 링크와 즐겨찾기가 모두 이 주소를 가리킵니다.";

/** 라벨 + 인풋 한 칸. 다섯 번 반복되는 마크업이라 팝업 안에서 한 번만 적는다. */
function DialogField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  inputMode,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  inputMode?: "text" | "numeric";
}) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label
        htmlFor={name}
        className="text-[14px] font-medium leading-[17px] text-black"
      >
        {label}
      </label>

      <TextField
        label={label}
        name={name}
        labelPlacement="external"
        value={value}
        onChange={onChange}
        error={error}
        inputMode={inputMode}
      />

      {hint && (
        <p className="text-[13px] leading-[18px] text-gray3">{hint}</p>
      )}
    </div>
  );
}

/**
 * 항목 추가 · 수정 팝업 (`/admin/categories`)
 *
 * **검증은 클라이언트에서도 돌지만 방어선이 아니다.** 같은 함수
 * (validateCategoryForm / validateCategoryEdit)를 categoryService 가 다시 돌리며,
 * 그쪽이 진짜 판정이다 (CLAUDE.md "검증"). 여기서 먼저 도는 것은 왕복 한 번을
 * 아끼기 위한 편의이고, 그래서 **문구를 이 컴포넌트가 만들지 않는다** — 검증
 * 모듈이 소유한 문구를 받아서 그리기만 한다.
 *
 * 서버가 되돌려준 필드 에러(body.fields)도 같은 자리에 그린다. slug 중복처럼
 * DB 를 봐야 아는 실패는 클라이언트가 미리 알 수 없어서, 그 문구가 폼 아래
 * 뭉뚱그려진 한 줄이 아니라 **문제가 있는 칸 밑**에 붙어야 한다.
 */
export default function CategoryFormDialog({
  category,
  onClose,
}: CategoryFormDialogProps) {
  const router = useRouter();
  const editing = category !== undefined;

  const [form, setForm] = useState<CategoryFormInput>({
    slug: category?.slug ?? "",
    name: category?.name ?? "",
    fullName: category?.fullName ?? "",
    icon: category?.icon ?? "",
    // 숫자를 문자열로 들고 있는 이유는 CategoryFormInput 주석에 있다.
    sortOrder: category ? String(category.sortOrder) : "0",
  });
  const [errors, setErrors] = useState<CategoryFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (key: keyof CategoryFormInput) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    // 수정 모드는 slug 를 검증하지 않는다. 고칠 수 없는 칸이라 규칙을 걸면
    // 예전에 만들어진 값 때문에 저장이 막히는 일이 생긴다.
    const found = editing ? validateCategoryEdit(form) : validateCategoryForm(form);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);

    try {
      const response = await fetch(
        editing ? `/api/admin/categories/${category.id}` : "/api/admin/categories",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          // 수정 모드에서도 slug 를 보내지만 서버가 읽지 않는다
          // (parseCategoryEdit). 폼 상태를 그대로 싣는 편이 단순하고, 무시되는
          // 것이 계약이라 클라이언트가 지우는 데 의존하지 않는다.
          body: JSON.stringify(form),
        },
      );

      if (!response.ok) {
        const body = await readErrorBody(response);

        // 필드별 문구가 있으면 칸 밑에, 없으면 폼 단위로 그린다.
        // **fields 의 유무가 아니라 내용이 있는지를 본다** — 빈 객체가 오면
        // (권한·대상 부재처럼 어느 칸의 문제도 아닌 실패) 칸 밑에도 폼 아래에도
        // 아무것도 안 뜨고 실패가 조용히 삼켜진다.
        const fields = body.fields ?? {};
        const hasFieldErrors = Object.keys(fields).length > 0;

        setErrors(fields);
        setFormError(hasFieldErrors ? null : body.message);
        setSubmitting(false);
        return;
      }

      // 목록의 정본은 서버다. 응답의 id 로 이 줄만 끼워 넣으면 순서를 바꾼
      // 경우 방금 고친 항목이 제자리에 남는다 (AdminCategoryListBody 주석).
      router.refresh();
      onClose();
    } catch {
      setFormError(NETWORK_ERROR);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-form-dialog-title"
    >
      {/* 칸이 다섯이라 좁은 화면에서는 팝업이 화면보다 길어진다. 팝업 안에서
          세로로 스크롤시켜야 배경(body)이 밀리지 않는다. vh 가 아니라 dvh 다
          (CLAUDE.md "반응형"). */}
      <form
        onSubmit={handleSubmit}
        className="max-h-[90dvh] w-full max-w-[420px] overflow-y-auto rounded-[16px] bg-white p-[28px]"
      >
        <h2
          id="category-form-dialog-title"
          className="text-[20px] font-bold text-black"
        >
          {editing ? "항목 수정" : "항목 추가"}
        </h2>

        <div className="mt-[20px] flex flex-col gap-[16px]">
          {editing ? (
            // 읽기 전용 표시. input 에 readOnly 를 거는 대신 아예 인풋이 아닌
            // 것으로 그린다 — 회색 인풋은 "지금은 못 고친다"로 읽히지만 이 값은
            // 앞으로도 못 고친다.
            <div className="flex flex-col gap-[6px]">
              <span className="text-[14px] font-medium leading-[17px] text-black">
                주소 (slug)
              </span>
              <p className="break-all rounded-badge bg-gray-50 px-[12px] py-[11px] font-mono text-[14px] text-gray4">
                /categories/{form.slug}
              </p>
              <p className="text-[13px] leading-[18px] text-gray3">
                {SLUG_LOCKED_HINT}
              </p>
            </div>
          ) : (
            <DialogField
              label="주소 (slug)"
              name="slug"
              value={form.slug}
              onChange={setField("slug")}
              error={errors.slug}
              hint="영문 소문자와 하이픈(-)만. 만든 뒤에는 변경할 수 없습니다."
            />
          )}

          <DialogField
            label="아이콘"
            name="icon"
            value={form.icon}
            onChange={setField("icon")}
            error={errors.icon}
            hint="이모지 한 글자."
          />

          <DialogField
            label="짧은 이름"
            name="name"
            value={form.name}
            onChange={setField("name")}
            error={errors.name}
            hint="홈의 원형 버튼과 게시물 배지에 쓰입니다. (예: 공간)"
          />

          <DialogField
            label="긴 이름"
            name="fullName"
            value={form.fullName}
            onChange={setField("fullName")}
            error={errors.fullName}
            hint="푸터 목록에만 쓰입니다. (예: 열린교회 속 공간)"
          />

          <DialogField
            label="순서"
            name="sortOrder"
            value={form.sortOrder}
            onChange={setField("sortOrder")}
            error={errors.sortOrder}
            inputMode="numeric"
            hint="작은 수가 앞에 옵니다."
          />
        </div>

        {formError && (
          <p role="alert" className="mt-[14px] text-[13px] text-brand-red">
            {formError}
          </p>
        )}

        <div className="mt-[24px] flex justify-end gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-11 rounded-full border border-gray2 px-[20px] text-[14px] text-gray3 transition-colors hover:border-brand-red hover:text-brand-red disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-full bg-brand-red px-[24px] text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
