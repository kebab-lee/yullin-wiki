import AdminShell from "@/components/admin/AdminShell";
import AdminUserList from "@/components/admin/users/AdminUserList";
import { fetchApiAsUser } from "@/lib/api/serverFetch";
import type { AdminUserListBody } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/requireRole";
import type { Role } from "@/lib/types";

/** 역할 탭. 전체(null)가 맨 앞이고 세 역할이 모두 있다. */
const ROLE_OPTIONS: readonly (Role | null)[] = [null, "USER", "EDITOR", "ADMIN"];

/**
 * 사용자 관리 — `/admin/users`
 *
 * **가드가 ADMIN 이다. EDITOR 가 아니다.** 위키 관리(/admin/pages)와 선이 다르다 —
 * EDITOR 는 글을 다루는 역할이고 계정은 다루지 않는다. 이 화면에는 역할 변경
 * 셀렉트가 붙어 있어서, EDITOR 가 들어오면 스스로를 ADMIN 으로 올릴 수 있다.
 * LNB 의 minRole(adminMenu.ts)도 같은 ADMIN 이지만 그건 표시 판정일 뿐이다 —
 * 메뉴에서 안 보여도 주소를 직접 치면 요청은 그대로 온다.
 *
 * **이 가드는 데이터 차단을 대체하지 않는다.** API 는 이 페이지를 거치지 않고
 * 직접 호출되므로 userService.listUsersForAdmin 의 assertRole 이 따로 필요하고,
 * 반대로 service 가드만으로는 화면이 그려지는 것을 막지 못한다 (CLAUDE.md "권한").
 *
 * 필터는 URL(`?role=` · `?status=`)이 정본이다. 클라이언트 상태로 들면
 * 새로고침·뒤로가기·링크 공유가 깨지고 이 페이지가 서버 컴포넌트로 남을 수 없다.
 * 페이지네이션도 기존 컴포넌트를 그대로 쓰는 offset(`?page=`) 방식이다.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string; page?: string }>;
}) {
  const session = await requireRole("ADMIN");

  const { role, status, page } = await searchParams;

  // 잘못된 값을 여기서 판정하지 않는다. 그대로 넘기면 service 가 안전한 값으로
  // 접고(모르는 role·status 는 "전체"), 실제로 적용된 값을 응답에 되돌려준다.
  const query = new URLSearchParams();
  if (role) query.set("role", role);
  if (status) query.set("status", status);
  if (page) query.set("page", page);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  // 세션 쿠키를 실어야 한다. 사용자 목록은 관리자만 받을 수 있는 응답이고
  // fetchApiAsUser 가 no-store 로 고정한다 — 캐시되면 회원 목록이 남에게 나간다.
  const body = await fetchApiAsUser<AdminUserListBody>(
    `/api/admin/users${suffix}`,
  );

  return (
    <AdminShell role={session.role}>
      <AdminUserList
        icon="👥"
        title="사용자 관리"
        basePath="/admin/users"
        roleOptions={ROLE_OPTIONS}
        body={body}
        currentUserId={session.userId}
      />
    </AdminShell>
  );
}
