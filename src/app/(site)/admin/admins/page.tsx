import AdminShell from "@/components/admin/AdminShell";
import AdminUserList from "@/components/admin/users/AdminUserList";
import { fetchApiAsUser } from "@/lib/api/serverFetch";
import type { AdminUserListBody } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/requireRole";
import type { Role } from "@/lib/types";

/**
 * 이 화면의 역할 탭. **전체(null)와 일반 회원이 없다.**
 *
 * 여기가 답하는 질문은 "권한을 가진 계정이 누구인가" 하나다. 전체를 열어 두면
 * /admin/users 와 같은 목록이 되어 화면이 둘로 갈린 이유가 사라진다.
 */
const ROLE_OPTIONS: readonly Role[] = ["ADMIN", "EDITOR"];

/** 탭에 없는 역할이 URL 로 들어왔을 때 접을 곳. 이 화면의 기본 필터이기도 하다. */
const DEFAULT_ROLE: Role = "ADMIN";

/** `?role=` 을 이 화면이 다루는 둘 중 하나로 접는다. 없거나 밖의 값이면 기본값. */
function scopeRole(value: string | undefined): Role {
  return ROLE_OPTIONS.find((role) => role === value) ?? DEFAULT_ROLE;
}

/**
 * 관리자 관리 — `/admin/admins`
 *
 * **`/admin/users` 와 같은 목록이다.** 라우트도 컴포넌트도 API 도 복제하지 않고,
 * userService.listUsersForAdmin 을 role 필터만 바꿔 부른다 (CLAUDE.md "화면 중복").
 * 다른 것은 제목과 역할 탭의 구성뿐이며, 그 둘만 prop 으로 갈린다.
 *
 * **승격 UI 를 따로 만들지 않는다.** 일반 회원을 편집자로 올리는 일은 이 화면이
 * 아니라 /admin/users 의 역할 셀렉트에서 일어난다 — 대상이 아직 여기 목록에
 * 없으니 여기서 올릴 방법도 없다. 이 화면은 이미 권한을 가진 계정을 점검하고
 * 거두는 자리다. 최초 ADMIN 계정은 여전히 DB 에서 손으로 만든다 (CLAUDE.md "인증").
 *
 * 가드가 ADMIN 인 근거는 /admin/users 와 같다.
 */
export default async function AdminAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string; page?: string }>;
}) {
  const session = await requireRole("ADMIN");

  const { role, status, page } = await searchParams;

  // **role 만 화면이 미리 접는다.** service 는 모르는 값을 "전체"로 접는데, 이
  // 화면에서 전체는 탭에 없는 상태다 — `?role=USER` 로 들어온 링크가 일반 회원
  // 목록을 그려 버리면 관리자 관리 화면이 조용히 사용자 관리 화면이 된다.
  // 어떤 역할을 보여줄 것인가는 화면의 규칙이라 service 로 내리지 않는다
  // (status·page 는 그대로 넘겨 service 가 접는다).
  const query = new URLSearchParams({ role: scopeRole(role) });
  if (status) query.set("status", status);
  if (page) query.set("page", page);

  const body = await fetchApiAsUser<AdminUserListBody>(
    `/api/admin/users?${query.toString()}`,
  );

  return (
    <AdminShell role={session.role}>
      <AdminUserList
        icon="🛡️"
        title="관리자 관리"
        basePath="/admin/admins"
        roleOptions={ROLE_OPTIONS}
        body={body}
        currentUserId={session.userId}
      />
    </AdminShell>
  );
}
