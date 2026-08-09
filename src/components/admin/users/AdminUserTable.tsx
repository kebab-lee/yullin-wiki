import { formatDate } from "@/lib/format/date";
import type { AdminUserSummary } from "@/lib/types";

import AdminUserRoleSelect from "./AdminUserRoleSelect";
import {
  ROLE_LABEL,
  USER_STATUS_BADGE_CLASS,
  USER_STATUS_LABEL,
  WITHDRAWN_USER_NAME,
} from "./labels";

type AdminUserTableProps = {
  users: AdminUserSummary[];
  /**
   * 지금 이 화면을 보고 있는 사람의 id. 자기 행의 셀렉트를 잠그는 데만 쓴다.
   *
   * 컴포넌트가 세션을 직접 읽지 않는다 — 그러면 서버 컴포넌트로 남을 수 없고,
   * 가드는 페이지가 조회는 표가 하는 어긋난 상태가 생긴다 (AdminShell 과 같은 규칙).
   */
  currentUserId: string;
};

/** lg 미만에서 숨기는 보조 컬럼(역할 배지 · 가입일). 헤더 셀과 데이터 셀이 공유한다. */
const SECONDARY_CELL = "hidden lg:table-cell";

const SELF_LOCK_REASON = "본인 역할은 변경할 수 없습니다";
const WITHDRAWN_LOCK_REASON = "탈퇴한 계정입니다";

/**
 * 사용자 관리 목록 표 (Figma AdSaved 1:1490 의 표 규격을 따른다)
 *
 * **모바일 전용 목록 컴포넌트를 따로 만들지 않는다** (CLAUDE.md "반응형").
 * AdminPageTable 과 같은 두 겹이다:
 *   ① 보조 컬럼(역할 배지 · 가입일)은 lg 미만에서 숨긴다. 375px 에 여섯 칸을
 *      밀어 넣으면 아이디가 한 글자씩 끊긴다. 역할은 값이 사라지는 것이 아니라
 *      **셀렉트 쪽에 이미 그려져 있어서** 배지 칸만 접는 것이고, 아이디·이름·
 *      상태·역할 셀렉트 넷이 가로 스크롤 없이 다 보여야 조작이 가능하다.
 *   ② 그럼에도 넘칠 수 있으므로 표 전체를 overflow-x 래퍼로 감싼다. 표가 자기
 *      안에서 스크롤해야 페이지 body 가 가로로 밀리지 않는다.
 *
 * **차단/해제 버튼이 없는 것은 의도다.** 근거는 AdminUserList 주석에 있다.
 */
export default function AdminUserTable({
  users,
  currentUserId,
}: AdminUserTableProps) {
  if (users.length === 0) {
    return (
      <p className="mt-[40px] text-[16px] text-gray3">
        해당하는 사용자가 없습니다.
      </p>
    );
  }

  return (
    <div className="mt-[24px] overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-gray2 text-[14px] font-medium text-gray3">
            <th scope="col" className="py-[12px] pr-[12px]">
              아이디
            </th>
            <th scope="col" className="py-[12px] pr-[12px]">
              이름
            </th>
            <th scope="col" className={`${SECONDARY_CELL} py-[12px] pr-[12px]`}>
              역할
            </th>
            <th scope="col" className="py-[12px] pr-[12px]">
              상태
            </th>
            <th
              scope="col"
              className={`${SECONDARY_CELL} py-[12px] pr-[12px] whitespace-nowrap`}
            >
              가입일
            </th>
            {/* 조작 칸은 머리글 문구가 없다 (AdminPageTable 과 같은 규칙). */}
            <th scope="col" className="py-[12px] text-right">
              <span className="sr-only">역할 변경</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const isWithdrawn = user.status === "WITHDRAWN";

            // 두 이유가 겹칠 일은 없다(탈퇴한 계정으로는 로그인할 수 없어
            // 자기 자신이 탈퇴 상태로 목록에 보이지 않는다). 그래도 본인 규칙을
            // 앞에 둔다 — 겹친다면 그쪽이 더 설명이 필요한 상황이다.
            const lockedReason = isSelf
              ? SELF_LOCK_REASON
              : isWithdrawn
                ? WITHDRAWN_LOCK_REASON
                : undefined;

            return (
              <tr
                key={user.id}
                className="border-b border-gray2 align-middle text-[15px]"
              >
                <td className="py-[14px] pr-[12px]">
                  <span className="font-bold break-all text-black">
                    {user.loginId}
                  </span>
                  {isSelf && (
                    <span className="ml-[6px] whitespace-nowrap text-[13px] text-brand-red">
                      (나)
                    </span>
                  )}
                </td>

                <td className="py-[14px] pr-[12px] text-gray4">
                  {/* 탈퇴 회원은 name 이 NULL 이다 — PII 를 지우는 소프트 삭제의
                      결과이며, 대체 문구는 도메인이 아니라 화면의 몫이다. */}
                  {user.name ?? (
                    <span className="text-gray3">{WITHDRAWN_USER_NAME}</span>
                  )}
                </td>

                <td
                  className={`${SECONDARY_CELL} py-[14px] pr-[12px] whitespace-nowrap text-gray4`}
                >
                  {ROLE_LABEL[user.role]}
                </td>

                <td className="py-[14px] pr-[12px]">
                  <span
                    className={[
                      "inline-flex h-[26px] items-center rounded-pill px-[10px] text-[13px] font-bold whitespace-nowrap",
                      USER_STATUS_BADGE_CLASS[user.status],
                    ].join(" ")}
                  >
                    {USER_STATUS_LABEL[user.status]}
                  </span>
                </td>

                <td
                  className={`${SECONDARY_CELL} py-[14px] pr-[12px] whitespace-nowrap text-gray3`}
                >
                  {formatDate(user.createdAt)}
                </td>

                <td className="py-[14px] text-right">
                  <AdminUserRoleSelect
                    userId={user.id}
                    role={user.role}
                    lockedReason={lockedReason}
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
