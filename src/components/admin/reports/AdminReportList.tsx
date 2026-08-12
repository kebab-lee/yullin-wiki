import Link from "next/link";

import { formatDate } from "@/lib/format/date";
import type { AdminReportSummary } from "@/lib/types";
import { REASON_LABEL, REPORT_STATUS_LABEL } from "@/lib/validation/report";

import AdminReportActions from "./AdminReportActions";
import {
  ANONYMOUS_BADGE,
  DELETED_COMMENT_BADGE,
  DELETED_PAGE_TITLE,
  REPORT_STATUS_BADGE_CLASS,
  WITHDRAWN_USER_NAME,
} from "./labels";

type AdminReportListProps = {
  reports: AdminReportSummary[];
};

/**
 * 신고 관리 목록 (Figma Frame 1545, 1:2213 — AdReport 800x217, 사이 구분선 30)
 *
 * ── 표가 아니라 카드 목록이다 ───────────────────────────────
 * 위키·사용자 관리는 `<table>` 인데 여기는 아니다. 그 둘은 칸마다 짧은 값이
 * 들어가는 진짜 표지만, 신고 한 건이 담는 것은 **여러 줄짜리 댓글 본문**이다.
 * 표 셀에 넣으면 한 줄이 세로로 부풀어 다른 칸이 전부 위쪽에 붙고, 좁은 화면
 * 에서는 본문 칸이 한 글자씩 끊긴다. 시안(AdReport)도 높이가 217/192 두 판인
 * 카드다.
 *
 * **모바일 전용 컴포넌트를 만들지 않는다** (CLAUDE.md "반응형"). 같은 마크업이
 * flex-wrap 으로 접힌다 — 메타 줄(작성자·신고자·사유·날짜)이 좁은 화면에서
 * 여러 줄이 되고, 조작 버튼은 lg 에서 오른쪽으로 붙는다.
 *
 * 서버 컴포넌트로 남는다. 조작이 필요한 조각(AdminReportActions)만 클라이언트다.
 */
export default function AdminReportList({ reports }: AdminReportListProps) {
  if (reports.length === 0) {
    return (
      <p className="mt-[40px] text-[16px] text-gray3">
        해당하는 신고가 없습니다.
      </p>
    );
  }

  return (
    <ul className="mt-[24px] flex flex-col">
      {reports.map((report) => (
        <li
          key={report.id}
          // 시안: 항목 사이 구분선(Line 24~27) + 간격 30.
          className="border-b border-gray2 py-[20px] first:pt-0 lg:py-[30px]"
        >
          <div className="flex flex-col gap-[12px] lg:flex-row lg:items-start lg:justify-between lg:gap-[24px]">
            <div className="min-w-0 flex-1">
              {/* 상태 · 사유 */}
              <div className="flex flex-wrap items-center gap-[8px]">
                <span
                  className={[
                    "inline-flex h-[26px] items-center rounded-pill px-[10px] text-[13px] font-bold whitespace-nowrap",
                    REPORT_STATUS_BADGE_CLASS[report.status],
                  ].join(" ")}
                >
                  {REPORT_STATUS_LABEL[report.status]}
                </span>
                <span className="text-[14px] font-medium text-brand-red">
                  {REASON_LABEL[report.reason]}
                </span>
                {report.commentStatus === "DELETED" && (
                  <span className="inline-flex h-[26px] items-center rounded-pill bg-gray2 px-[10px] text-[13px] text-gray4">
                    {DELETED_COMMENT_BADGE}
                  </span>
                )}
              </div>

              {/* 신고당한 댓글 본문.
                  React 가 이스케이프하므로 dangerouslySetInnerHTML 을 쓰지
                  않는다 — 댓글은 신뢰 경계 밖의 값이다 (CommentItem 과 같은
                  근거). 줄바꿈은 CSS 가 처리한다.
                  긴 댓글이 목록을 밀어내지 않게 최대 높이를 두고 그 안에서
                  스크롤한다 (본문은 1000자까지 허용된다). */}
              <p className="mt-[10px] max-h-[132px] overflow-y-auto whitespace-pre-wrap break-words rounded-[8px] bg-brand-red-white px-[14px] py-[12px] text-[14px] font-light leading-[22px] text-black">
                {report.commentContent}
              </p>

              {/* 메타 — 작성자 / 신고자 / 게시물 / 신고일 */}
              <div className="mt-[10px] flex flex-wrap items-center gap-x-[16px] gap-y-[6px] text-[13px] leading-[18px] text-gray3">
                <span>
                  작성자{" "}
                  <span className="font-medium text-gray4">
                    {/* **익명 댓글도 실명이 보인다.** 차단 버튼이 이 사람을
                        대상으로 하므로 누구인지 알아야 한다 (types/comment.ts
                        AdminReportSummary 주석). 익명이었다는 사실은 꼬리표로
                        함께 남긴다 — 그것도 처리 판단의 재료다. */}
                    {report.authorName ?? WITHDRAWN_USER_NAME}
                  </span>
                  {report.isAnonymous && (
                    <span className="ml-[4px] rounded-pill bg-gray2 px-[6px] py-[1px] text-[12px] text-gray4">
                      {ANONYMOUS_BADGE}
                    </span>
                  )}
                </span>

                <span>
                  신고자{" "}
                  <span className="font-medium text-gray4">
                    {report.reporterName ?? WITHDRAWN_USER_NAME}
                  </span>
                </span>

                {/* 지워진 게시물은 링크가 되지 않는다 — 상세가 404 다. */}
                {report.pageTitle === null ? (
                  <span className="text-gray3">{DELETED_PAGE_TITLE}</span>
                ) : (
                  <Link
                    href={`/pages/${report.pageId}`}
                    className="max-w-full truncate underline underline-offset-2 transition-colors hover:text-brand-red"
                  >
                    {report.pageTitle}
                  </Link>
                )}

                <time dateTime={report.createdAt}>
                  {formatDate(report.createdAt)}
                </time>
              </div>
            </div>

            <div className="lg:shrink-0">
              <AdminReportActions report={report} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
