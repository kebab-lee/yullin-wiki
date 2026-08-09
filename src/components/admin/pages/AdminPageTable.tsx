import Link from "next/link";

import { formatDate } from "@/lib/format/date";
import type { AdminPageSummary, Category } from "@/lib/types";

import AdminPageStatusActions from "./AdminPageStatusActions";
import { PAGE_STATUS_BADGE_CLASS, PAGE_STATUS_LABEL } from "./statusLabel";

type AdminPageTableProps = {
  pages: AdminPageSummary[];
  /** 카테고리 표시명 대응표. 배지에는 짧은 형(name)을 쓴다 (긴 형은 Footer 전용). */
  categories: Category[];
};

/**
 * lg 미만에서 숨기는 보조 컬럼(카테고리 · 작성자 · 작성일 · 수정일).
 * 헤더 셀과 데이터 셀이 같은 상수를 써야 둘이 어긋나 열이 밀리는 일이 없다.
 */
const SECONDARY_CELL = "hidden lg:table-cell";

/**
 * 위키 관리 목록 표 (Figma AdSaved 1:1490 — 본문 x=316, 880 폭)
 *
 * **모바일 전용 목록 컴포넌트를 따로 만들지 않는다** (CLAUDE.md "반응형").
 * 대신 두 겹으로 처리한다:
 *   ① 보조 컬럼(카테고리·작성자·작성일·수정일)은 lg 미만에서 숨긴다. 375px 에
 *      여섯 컬럼을 밀어 넣으면 제목이 한 글자씩 끊긴다. 어드민 모바일의 목표는
 *      "목록 열람과 상태 전환" 이므로 제목·상태·액션 셋이면 성립하고, **그 셋이
 *      가로 스크롤 없이 다 보여야** 상태 전환 버튼이 화면 밖으로 밀리지 않는다.
 *      그래서 표에 최소 폭을 걸지 않는다 — min-w 를 주면 숨긴 보람 없이 다시
 *      스크롤이 생기고 버튼이 오른쪽 바깥에 숨는다.
 *   ② 그럼에도 제목이 길거나 글자 크기가 커지면 넘칠 수 있으므로 표 전체를
 *      overflow-x 래퍼로 감싼다. 표가 자기 안에서 스크롤해야 페이지 body 가
 *      가로로 밀리지 않는다.
 *
 * **체크박스가 없는 것은 의도다.** 일괄 선택·일괄 삭제를 넣지 않기로 했다 —
 * 근거는 /admin/pages 페이지 주석에 적어 두었다.
 */
export default function AdminPageTable({
  pages,
  categories,
}: AdminPageTableProps) {
  if (pages.length === 0) {
    return (
      <p className="mt-[40px] text-[16px] text-gray3">
        해당하는 게시물이 없습니다.
      </p>
    );
  }

  // categoryId → Category. 줄마다 find 를 돌리면 목록 길이 × 항목 수가 된다.
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="mt-[24px] overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-gray2 text-[14px] font-medium text-gray3">
            <th scope="col" className="py-[12px] pr-[12px]">
              제목
            </th>
            <th scope="col" className={`${SECONDARY_CELL} py-[12px] pr-[12px]`}>
              카테고리
            </th>
            <th scope="col" className="py-[12px] pr-[12px]">
              상태
            </th>
            <th scope="col" className={`${SECONDARY_CELL} py-[12px] pr-[12px]`}>
              작성자
            </th>
            <th scope="col" className={`${SECONDARY_CELL} py-[12px] pr-[12px]`}>
              작성일
            </th>
            <th
              scope="col"
              className={`${SECONDARY_CELL} py-[12px] pr-[12px] whitespace-nowrap`}
            >
              수정일
            </th>
            {/* 액션 열은 머리글 문구가 없다. 표기할 이름이 없는 조작 칸이라
                빈 th 에 접근성 라벨만 붙인다. */}
            <th scope="col" className="py-[12px] text-right">
              <span className="sr-only">상태 변경</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {pages.map((page) => {
            const category = categoryById.get(page.categoryId);

            return (
              <tr
                key={page.id}
                className="border-b border-gray2 align-middle text-[15px]"
              >
                <td className="py-[14px] pr-[12px]">
                  {/* 관리 목록에서도 링크는 공개 상세다. 어드민용 상세를 따로
                      두지 않는다 (CLAUDE.md "화면 중복") — 초안·숨김 글은 공개
                      상세가 404 를 주지만, 그 판정은 pageService 가 할 일이고
                      목록이 미리 링크를 지워 버리면 글을 확인할 길이 없어진다. */}
                  <Link
                    href={`/pages/${page.id}`}
                    className="line-clamp-2 font-bold text-black transition-colors hover:text-brand-red"
                  >
                    {page.title}
                  </Link>
                </td>

                <td
                  className={`${SECONDARY_CELL} py-[14px] pr-[12px] whitespace-nowrap text-gray4`}
                >
                  {category?.name ?? "-"}
                </td>

                <td className="py-[14px] pr-[12px]">
                  <span
                    className={[
                      "inline-flex h-[26px] items-center rounded-pill px-[10px] text-[13px] font-bold whitespace-nowrap",
                      PAGE_STATUS_BADGE_CLASS[page.status],
                    ].join(" ")}
                  >
                    {PAGE_STATUS_LABEL[page.status]}
                  </span>
                </td>

                <td
                  className={`${SECONDARY_CELL} py-[14px] pr-[12px] whitespace-nowrap text-gray4`}
                >
                  {/* 탈퇴 회원은 users.name 이 NULL 이다. 대체 문구는 도메인이
                      아니라 화면의 몫이다 (PageDetail.authorName 주석). */}
                  {page.authorName ?? "탈퇴한 사용자"}
                </td>

                <td
                  className={`${SECONDARY_CELL} py-[14px] pr-[12px] whitespace-nowrap text-gray3`}
                >
                  {formatDate(page.createdAt)}
                </td>

                <td
                  className={`${SECONDARY_CELL} py-[14px] pr-[12px] whitespace-nowrap text-gray3`}
                >
                  {formatDate(page.updatedAt)}
                </td>

                <td className="py-[14px] text-right">
                  <AdminPageStatusActions
                    pageId={page.id}
                    status={page.status}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
