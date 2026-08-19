import AdminShell from "@/components/admin/AdminShell";
import AdminUserList from "@/components/admin/users/AdminUserList";
import { readNumberParam } from "@/lib/api/queryParams";
import type { AdminUserListBody } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/requireRole";
import type { SessionPayload } from "@/lib/auth/session";
import * as userService from "@/lib/services/userService";
import type { Role } from "@/lib/types";

/** 역할 탭. 전체(null)가 맨 앞이고 세 역할이 모두 있다. */
const ROLE_OPTIONS: readonly (Role | null)[] = [null, "USER", "EDITOR", "ADMIN"];

/**
 * 사용자 목록 한 페이지. **self-fetch 대신 직접 호출이 사는 자리는 여기 하나다.**
 *
 * 이 화면은 세션이 있어야 답이 나오는 화면이라 응답이 사용자마다 다르고, 그래서
 * 예전의 fetchApiAsUser 는 no-store 였다 — fetch 캐시가 아예 걸리지 않으니 자기
 * 라우트로 한 바퀴 도는 비용을 매 요청 그대로 냈다는 뜻이다. 정적화도 세션 때문에
 * 불가능하다 (CLAUDE.md "서버 컴포넌트의 self-fetch").
 *
 * **권한은 그대로 두 겹이다.** `requireRole("ADMIN")` 이 돌려준 세션을 그대로
 * 넘기므로, 라우트 핸들러가 `getSession()` 으로 읽어 넘기던 값과 같다 —
 * userService.listUsersForAdmin 의 `assertRole("ADMIN")` 은 이전과 똑같이
 * 호출된다. 화면 가드가 데이터 가드를 대체하지 않는다.
 *
 * role·status 를 여기서 판정하지 않는 것도 그대로다. 문자열을 그대로 넘기면
 * service 가 좁히고(parseRoleFilter · parseUserStatusFilter) 실제로 적용된 값을
 * 되돌려준다 — 화면이 미리 거르면 같은 규칙이 두 곳에 생긴다.
 *
 * 반환 타입을 `AdminUserListBody` 로 두는 것도 의도다. 라우트가 내려주던 것과
 * 같은 모양이라 화면 코드가 예외를 눈치채지 못하고, Java 이관 시 이 함수 본문만
 * `fetchApiAsUser` 로 되돌리면 끝난다.
 */
async function adminUserList(
  session: SessionPayload,
  params: { role?: string; status?: string; page?: string },
): Promise<AdminUserListBody> {
  const result = await userService.listUsersForAdmin(session, {
    role: params.role,
    status: params.status,
    page: readNumberParam(params.page),
  });

  return {
    users: result.items,
    total: result.total,
    page: result.page,
    size: result.size,
    role: result.role,
    status: result.status,
  };
}

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

  const body = await adminUserList(session, { role, status, page });

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
