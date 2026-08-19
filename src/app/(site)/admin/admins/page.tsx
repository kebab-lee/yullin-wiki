import AdminShell from "@/components/admin/AdminShell";
import AdminUserList from "@/components/admin/users/AdminUserList";
import { readNumberParam } from "@/lib/api/queryParams";
import type { AdminUserListBody } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/requireRole";
import type { SessionPayload } from "@/lib/auth/session";
import * as userService from "@/lib/services/userService";
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
 * 사용자 목록 한 페이지. **self-fetch 대신 직접 호출이 사는 자리는 여기 하나다.**
 *
 * `/admin/users` 의 같은 이름 함수와 **본문이 같다.** 두 화면이 같은 목록을
 * 필터만 달리해 보는 것이라 그렇고(아래 화면 주석), 공용 모듈로 빼지 않는 것은
 * 의도다 — 이 함수는 Java 이관 시 `fetchApiAsUser` 로 되돌릴 자리이므로 화면마다
 * 제 파일에 있어야 되돌릴 곳이 화면과 1:1 로 보인다.
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
 * 반환 타입을 `AdminUserListBody` 로 두는 것도 의도다. 라우트가 내려주던 것과
 * 같은 모양이라 화면 코드가 예외를 눈치채지 못하고, Java 이관 시 이 함수 본문만
 * `fetchApiAsUser` 로 되돌리면 끝난다.
 */
async function adminUserList(
  session: SessionPayload,
  params: { role: Role; status?: string; page?: string },
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
  const body = await adminUserList(session, {
    role: scopeRole(role),
    status,
    page,
  });

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
