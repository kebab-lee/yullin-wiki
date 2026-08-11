"use client";

import { useState } from "react";

import type { AdminCategorySummary } from "@/lib/types";

import CategoryFormDialog from "./CategoryFormDialog";
import DeleteCategoryDialog from "./DeleteCategoryDialog";

type AdminCategoryListProps = {
  categories: AdminCategorySummary[];
};

/**
 * lg 미만에서 숨기는 보조 컬럼(긴 이름 · 주소 · 순서).
 * 헤더 셀과 데이터 셀이 같은 상수를 써야 둘이 어긋나 열이 밀리는 일이 없다
 * (AdminPageTable 과 같은 장치).
 */
const SECONDARY_CELL = "hidden lg:table-cell";

/**
 * 열려 있는 팝업. **문자열 하나로 상태를 든다.**
 *
 * `adding` / `editing` / `deleting` 세 개의 boolean 을 두면 둘이 동시에 참인
 * 상태가 표현 가능해지고, 그때 팝업이 겹쳐 뜬다 (CLAUDE.md "상태 플래그가
 * 필요하면 기존 플래그를 재사용한다" 와 같은 결).
 */
type DialogState =
  | { readonly kind: "none" }
  | { readonly kind: "create" }
  | { readonly kind: "edit"; readonly category: AdminCategorySummary }
  | { readonly kind: "delete"; readonly category: AdminCategorySummary };

/**
 * 카테고리 관리 목록 — `/admin/categories`
 *
 * **클라이언트 컴포넌트인 이유는 팝업 상태 하나다.** 조회는 서버 컴포넌트가
 * 끝내서 결과만 prop 으로 받고, 여기서는 어떤 팝업이 열려 있는지만 든다.
 * 페이지 자체를 클라이언트로 만들면 목록 조회가 브라우저로 내려가고 세션 쿠키를
 * 실어 나르는 fetch 를 손으로 짜야 한다.
 *
 * **정렬 순서를 드래그앤드롭으로 바꾸지 않는다.** 항목이 세 개 규모라 끌어
 * 옮기는 제스처가 얻는 것이 거의 없는 반면, 드롭 위치 계산·터치 대응·순서 일괄
 * 저장(여러 행을 한 번에 UPDATE — repository 에 다중 문장 트랜잭션 수단이 없다)
 * 이 통째로 따라온다. 숫자를 직접 입력받으면 한 행의 PATCH 한 번으로 끝난다.
 *
 * **페이지네이션이 없다.** 카테고리는 시드로 고정된 소수의 항목이고
 * (categoryRepository.findAll 도 같은 전제다), 목록이 한 화면에 다 들어온다.
 */
export default function AdminCategoryList({
  categories,
}: AdminCategoryListProps) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const close = () => setDialog({ kind: "none" });

  return (
    <>
      {/* 헤더 — /admin/pages 와 같은 구성(아이콘 + 제목 + 건수)에 우측 액션 하나 */}
      <header className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] lg:flex-nowrap lg:gap-[20px]">
        <span
          className="text-[32px] leading-[32px] lg:text-[45px] lg:leading-[45px]"
          aria-hidden
        >
          🗂️
        </span>
        <h1 className="min-w-0 text-[22px] font-bold leading-[34px] text-black lg:text-[28px]">
          카테고리 관리
        </h1>
        <span className="text-[16px] leading-[22px] text-gray3">
          {categories.length}개
        </span>

        <button
          type="button"
          onClick={() => setDialog({ kind: "create" })}
          className="ml-auto h-11 shrink-0 rounded-pill bg-brand-red px-[18px] text-[14px] font-bold text-white transition-opacity hover:opacity-90"
        >
          항목 추가
        </button>
      </header>

      {categories.length === 0 ? (
        <p className="mt-[40px] text-[16px] text-gray3">
          등록된 항목이 없습니다.
        </p>
      ) : (
        // 표가 자기 안에서 스크롤해야 페이지 body 가 가로로 밀리지 않는다.
        <div className="mt-[24px] overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray2 text-[14px] font-medium text-gray3">
                <th scope="col" className="py-[12px] pr-[12px]">
                  <span className="sr-only">아이콘</span>
                </th>
                <th scope="col" className="py-[12px] pr-[12px]">
                  짧은 이름
                </th>
                <th scope="col" className={`${SECONDARY_CELL} py-[12px] pr-[12px]`}>
                  긴 이름
                </th>
                <th scope="col" className={`${SECONDARY_CELL} py-[12px] pr-[12px]`}>
                  주소
                </th>
                <th scope="col" className={`${SECONDARY_CELL} py-[12px] pr-[12px]`}>
                  순서
                </th>
                <th scope="col" className="py-[12px] pr-[12px] whitespace-nowrap">
                  문서 수
                </th>
                <th scope="col" className="py-[12px] text-right">
                  <span className="sr-only">수정 · 삭제</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="border-b border-gray2 align-middle text-[15px]"
                >
                  <td className="py-[14px] pr-[12px] text-[22px] leading-none">
                    <span aria-hidden>{category.icon}</span>
                  </td>

                  <td className="py-[14px] pr-[12px] font-bold whitespace-nowrap text-black">
                    {category.name}
                  </td>

                  <td
                    className={`${SECONDARY_CELL} py-[14px] pr-[12px] text-gray4`}
                  >
                    {category.fullName}
                  </td>

                  <td
                    className={`${SECONDARY_CELL} py-[14px] pr-[12px] whitespace-nowrap font-mono text-[14px] text-gray3`}
                  >
                    {category.slug}
                  </td>

                  <td
                    className={`${SECONDARY_CELL} py-[14px] pr-[12px] tabular-nums text-gray4`}
                  >
                    {category.sortOrder}
                  </td>

                  {/* 삭제 가능 여부를 미리 알 수 있어야 시도 후 거부보다 낫다.
                      0건은 회색, 1건 이상은 "지울 수 없다"는 뜻이라 강조한다. */}
                  <td
                    className={[
                      "py-[14px] pr-[12px] tabular-nums whitespace-nowrap",
                      category.pageCount > 0 ? "text-black" : "text-gray3",
                    ].join(" ")}
                  >
                    {category.pageCount}건
                  </td>

                  <td className="py-[14px] text-right">
                    <div className="flex flex-wrap items-center justify-end gap-[6px]">
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: "edit", category })}
                        className={[
                          // 44px 터치 타깃. lg 에서는 표 행이 낮아 32px 로 줄인다
                          // (AdminPageStatusActions 와 같은 규칙).
                          "h-11 shrink-0 rounded-pill border border-gray2 px-[14px] lg:h-[32px]",
                          "text-[14px] font-bold leading-[18px] text-gray4 transition-colors",
                          "hover:border-brand-red hover:text-brand-red",
                        ].join(" ")}
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() => setDialog({ kind: "delete", category })}
                        className={[
                          "h-11 shrink-0 rounded-pill border border-brand-red px-[14px] lg:h-[32px]",
                          "text-[14px] font-bold leading-[18px] text-brand-red transition-colors",
                          "hover:bg-brand-red hover:text-white",
                        ].join(" ")}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-[16px] text-[13px] leading-[20px] text-gray3">
        문서가 한 건이라도 있는 항목은 삭제할 수 없습니다. 먼저 그 문서들을 다른
        항목으로 옮겨주세요. 문서 수에는 삭제된 문서와 임시저장 글도 포함됩니다.
      </p>

      {dialog.kind === "create" && <CategoryFormDialog onClose={close} />}

      {dialog.kind === "edit" && (
        <CategoryFormDialog
          // 다른 항목의 수정을 열면 폼 상태가 처음부터 다시 잡혀야 한다.
          // key 가 없으면 useState 초기값이 첫 항목의 값에 머문다.
          key={dialog.category.id}
          category={dialog.category}
          onClose={close}
        />
      )}

      {dialog.kind === "delete" && (
        <DeleteCategoryDialog category={dialog.category} onClose={close} />
      )}
    </>
  );
}
