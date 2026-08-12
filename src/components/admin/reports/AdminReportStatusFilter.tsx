import Link from "next/link";

import type { CommentReportStatus } from "@/lib/types";
import {
  COMMENT_REPORT_STATUSES,
  REPORT_STATUS_LABEL,
} from "@/lib/validation/report";

type AdminReportStatusFilterProps = {
  /** 서버가 실제로 적용한 필터. null 이면 전체다. */
  current: CommentReportStatus | null;
};

/** 전체(null)가 맨 앞이고 세 상태가 뒤따른다. */
const OPTIONS: readonly (CommentReportStatus | null)[] = [
  null,
  ...COMMENT_REPORT_STATUSES,
];

/**
 * 신고 상태 필터 탭 (AdminPageStatusFilter 와 같은 관용구).
 *
 * **서버 컴포넌트다.** 필터의 정본은 URL(`?status=`)이고 상태를 들고 있지
 * 않는다 — 클라이언트 상태로 들면 새로고침·뒤로가기·링크 공유가 깨지고 목록
 * 페이지가 서버 컴포넌트로 남을 수 없다.
 *
 * **선택 여부를 `current` 로 판정하지 URL 을 다시 읽지 않는다.** 그 값은 서버가
 * 실제로 적용한 것이라, `?status=오타` 로 들어와도 탭이 서버와 같은 것(전체)을
 * 가리킨다.
 *
 * 페이지 번호를 링크에 싣지 않는다 — 필터를 바꾸면 1페이지부터다. 3페이지를
 * 보다 필터를 바꾸면 결과가 3페이지보다 적어 빈 화면이 나올 수 있다.
 */
export default function AdminReportStatusFilter({
  current,
}: AdminReportStatusFilterProps) {
  return (
    <nav
      aria-label="처리 상태 필터"
      // 모바일에서 넘칠 수 있어 가로 스크롤 스트립으로 둔다. `-mx-4 px-4` 로
      // 컨테이너 좌우 패딩을 상쇄한다 (AdminNav·대시보드 카드와 같은 패턴).
      className={[
        "-mx-4 flex gap-[8px] overflow-x-auto px-4",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "lg:mx-0 lg:px-0",
      ].join(" ")}
    >
      {OPTIONS.map((option) => {
        const active = current === option;

        return (
          <Link
            key={option ?? "ALL"}
            href={option ? `/admin/reports?status=${option}` : "/admin/reports"}
            aria-current={active ? "page" : undefined}
            className={[
              // h-11 = 44px 터치 타깃 (CLAUDE.md "반응형").
              "flex h-11 shrink-0 items-center whitespace-nowrap rounded-pill border px-[16px]",
              "text-[14px] leading-[18px] transition-colors lg:h-[34px]",
              active
                ? "border-brand-red bg-brand-red font-bold text-white"
                : "border-gray2 text-gray4 hover:border-brand-red hover:text-brand-red",
            ].join(" ")}
          >
            {option ? REPORT_STATUS_LABEL[option] : "전체"}
          </Link>
        );
      })}
    </nav>
  );
}
