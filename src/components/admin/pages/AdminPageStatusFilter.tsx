import Link from "next/link";

import type { PageStatus } from "@/lib/types";

import { PAGE_STATUS_LABEL } from "./statusLabel";

type AdminPageStatusFilterProps = {
  /** 서버가 실제로 적용한 필터. null 이면 전체다. */
  current: PageStatus | null;
};

/** 탭에 노출할 순서. 전체(null)가 맨 앞이다. */
const TABS: readonly (PageStatus | null)[] = [
  null,
  "DRAFT",
  "PUBLISHED",
  "HIDDEN",
];

/**
 * 상태 필터 탭 (Figma AdSaved 1:1490 우측 액션 영역 — 45px 높이)
 *
 * **버튼이 아니라 링크다.** 필터를 useState 로 들면 새로고침·뒤로가기·링크 공유가
 * 전부 깨지고, 서버 컴포넌트가 목록을 그릴 수 없어 화면 전체가 클라이언트로
 * 내려간다. `?status=` 하나로 표현되면 "숨긴 글 목록"을 그대로 북마크할 수 있다
 * (공개 목록의 `?page=` 를 offset 으로 유지하는 것과 같은 근거).
 *
 * 전체 탭은 `?status=` 를 아예 붙이지 않는다 — 같은 화면이 URL 두 개를 갖지
 * 않게 하기 위해서다 (Pagination 의 1페이지 규칙과 동일).
 *
 * **페이지 번호를 함께 넘기지 않는다.** 필터를 바꾸면 목록 자체가 달라져서 3페이지가
 * 남아 있으리라는 보장이 없고, 없는 페이지로 떨어지면 빈 화면이 뜬다. 필터 전환은
 * 언제나 1페이지에서 다시 시작한다.
 */
export default function AdminPageStatusFilter({
  current,
}: AdminPageStatusFilterProps) {
  return (
    <div
      role="group"
      aria-label="상태 필터"
      className={[
        "-mx-4 flex gap-[8px] overflow-x-auto px-4",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "lg:mx-0 lg:overflow-x-visible lg:px-0",
      ].join(" ")}
    >
      {TABS.map((status) => {
        const active = current === status;

        return (
          <Link
            key={status ?? "ALL"}
            href={status ? `/admin/pages?status=${status}` : "/admin/pages"}
            aria-current={active ? "true" : undefined}
            className={[
              // 44px(h-11) → lg 에서 Figma 액션 버튼 높이 45px.
              "flex h-11 shrink-0 items-center justify-center whitespace-nowrap px-[18px] lg:h-[45px]",
              "rounded-pill border text-[15px] leading-[18px] transition-colors",
              active
                ? "border-brand-red bg-brand-red font-bold text-white"
                : "border-gray2 bg-white text-gray4 hover:border-brand-red hover:text-brand-red",
            ].join(" ")}
          >
            {status ? PAGE_STATUS_LABEL[status] : "전체"}
          </Link>
        );
      })}
    </div>
  );
}
