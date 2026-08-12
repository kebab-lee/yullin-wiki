import Pagination from "@/components/common/Pagination";
import type { AdminUserListBody } from "@/lib/api/types";
import type { Role } from "@/lib/types";

import AdminUserFilters from "./AdminUserFilters";
import AdminUserTable from "./AdminUserTable";
import { userListHref } from "./userListHref";

type AdminUserListProps = {
  /** 헤더 이모지. 두 화면을 눈으로 가르는 유일한 표식이라 밖에서 받는다. */
  icon: string;
  title: string;
  /** `/admin/users` 또는 `/admin/admins`. 필터·페이지네이션 링크의 뿌리다. */
  basePath: string;
  roleOptions: readonly (Role | null)[];
  /** 서버가 실제로 적용한 필터가 함께 들어 있다. 화면은 이 값을 정본으로 그린다. */
  body: AdminUserListBody;
  currentUserId: string;
};

/**
 * 사용자 목록 화면 (`/admin/users` · `/admin/admins` 공용)
 *
 * ── 두 화면을 한 컴포넌트로 두는 이유 ────────────────────────
 * 둘은 **같은 목록에 기본 필터만 다르게 건 화면**이다. 표·필터·페이지네이션이
 * 전부 같고 다른 것은 제목과 역할 탭의 구성뿐이라, 라우트를 복제하면 컬럼을
 * 하나 고칠 때마다 두 파일을 맞춰야 하고 결국 어긋난다 (CLAUDE.md "화면 중복" —
 * 어드민용으로 화면을 따로 그리지 않는다는 규칙과 같은 근거).
 *
 * 페이지가 데이터를 가져와 이 컴포넌트에 넘긴다. 여기서 fetch 하면 두 페이지의
 * requireRole 과 조회가 갈려서, 가드를 통과하지 못한 화면이 데이터를 부르는
 * 상태를 만들 수 있다 (AdminShell 이 세션을 직접 읽지 않는 것과 같은 규칙).
 *
 * ── 차단(BLOCKED) 조작이 이제 여기 있다 ─────────────────────
 * **지난 슬라이스의 결정을 뒤집었다.** 그때는 차단 버튼을 일부러 만들지
 * 않았는데, 이유는 Figma 차단 확인 팝업(1:2516)이 약속하는 "댓글 기능이
 * 제한됩니다" 와 실제 효과가 어긋났기 때문이다 — 당시 users.status 를 BLOCKED
 * 로 바꾸면 실제로 일어나는 일은 **로그인 자체가 막히는 것**이었다(세션 복원
 * 경로가 전부 ACTIVE 만 통과시켰다). 관리자가 무슨 일이 일어나는지 모르는 채
 * 누르는 버튼은 만들지 않는다는 판단이었고, "댓글 슬라이스에서 차단 = 댓글
 * 제한이 실제 규칙이 될 때 붙인다"고 미뤄 두었다.
 *
 * 그 조건이 충족됐다. 로그인 판정은 탈퇴만 막고(auth/accountStatus 의
 * canSignIn), BLOCKED 는 댓글 작성 한 곳에서만 걸린다(commentService의
 * assertCanWriteComment). 이제 팝업 문구가 실제로 일어나는 일과 같다.
 *
 * 신고 관리 화면(/admin/reports)의 차단 버튼과 **같은 라우트·같은 규칙**을
 * 쓴다 — 두 화면이 각자 요청을 만들면 규칙이 두 벌이 된다.
 * ────────────────────────────────────────────────────────────
 */
export default function AdminUserList({
  icon,
  title,
  basePath,
  roleOptions,
  body,
  currentUserId,
}: AdminUserListProps) {
  // 마지막 페이지는 서버가 되돌려준 size 로 계산한다. 요청한 size 가 상한(50)에서
  // 접혔으면 실제 쪽수가 달라진다.
  const lastPage = Math.max(Math.ceil(body.total / body.size), 1);

  // 페이지를 넘겨도 필터가 유지되어야 한다. Pagination 은 basePath 에 이미 쿼리가
  // 있으면 `&` 로 잇는다.
  const paginationBase = userListHref(basePath, {
    role: body.role,
    status: body.status,
  });

  return (
    <>
      {/* 헤더 — Figma Frame 1455 (아이콘 45px + 제목) */}
      <header className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] lg:flex-nowrap lg:gap-[20px]">
        <span
          className="text-[32px] leading-[32px] lg:text-[45px] lg:leading-[45px]"
          aria-hidden
        >
          {icon}
        </span>
        <h1 className="min-w-0 text-[22px] font-bold leading-[34px] text-black lg:text-[28px]">
          {title}
        </h1>
        <span className="text-[16px] leading-[22px] text-gray3">
          {body.total}명
        </span>
      </header>

      <div className="mt-[24px]">
        <AdminUserFilters
          basePath={basePath}
          current={{ role: body.role, status: body.status }}
          roleOptions={roleOptions}
        />
      </div>

      <AdminUserTable users={body.users} currentUserId={currentUserId} />

      <Pagination
        basePath={paginationBase}
        currentPage={body.page}
        lastPage={lastPage}
      />
    </>
  );
}
