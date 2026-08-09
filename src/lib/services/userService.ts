// =============================================================
// 사용자 서비스 — 사용자 자체에 대한 규칙
//
// 라우트 경로가 아니라 도메인으로 나눈 경계다 (CLAUDE.md "레이어 규칙").
// "아이디를 쓸 수 있는가"는 가입 화면에서 부르든 회원정보 수정에서 부르든
// 같은 규칙이므로, 인증 플로우가 아니라 사용자 도메인에 속한다.
//
// authService.signup 도 이 규칙을 여기서 빌려 쓴다 — 같은 판정을 두 곳에
// 적으면 한쪽만 고쳐질 때 가입과 중복확인 버튼의 답이 갈린다.
// =============================================================

import { assertAuthenticated, assertRole } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { Role } from "@/lib/auth/roles";
import type { SessionPayload } from "@/lib/auth/session";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import * as userRepository from "@/lib/repositories/userRepository";
import type { UserWithHash } from "@/lib/repositories/userRepository";
import type { AdminUserSummary, User, UserStatus } from "@/lib/types";
import {
  ROLE_SELF_CHANGE,
  ROLE_WITHDRAWN_TARGET,
  USER_NOT_FOUND,
  parseRoleFilter,
  parseUserStatusFilter,
} from "@/lib/validation/userAdmin";
import {
  CURRENT_PASSWORD_INVALID,
  LOGIN_ID_TAKEN,
  PASSWORD_UNCHANGED,
  WITHDRAW_LOGIN_ID_MISMATCH,
  parseProfile,
  validateLoginId,
  validatePasswordChange,
  type PasswordChangeInput,
  type ProfileInput,
} from "@/lib/validation/user";

/**
 * 아이디를 쓸 수 있는가.
 *
 * 형식이 틀린 아이디는 "사용 불가"가 아니라 검증 실패다 — 그래야 중복확인
 * 버튼이 형식과 중복을 같은 규칙으로 판정한다.
 *
 * 탈퇴(WITHDRAWN) 계정도 login_id 를 그대로 들고 있으므로 repository 가
 * status 로 거르지 않는다. 거르면 "사용 가능"이라 답한 아이디가 insert 에서 터진다.
 */
export async function isLoginIdAvailable(loginId: string): Promise<boolean> {
  const result = validateLoginId(loginId);
  if (!result.valid) throw new ValidationError({ loginId: result.message });

  return !(await userRepository.existsByLoginId(loginId));
}

/**
 * 쓸 수 없는 아이디면 던진다. 조회가 아니라 "진행해도 되는가"를 묻는 쪽이 쓴다.
 *
 * 판정 자체는 위 함수 하나뿐이고 여기서는 실패를 도메인 에러로 옮기기만 한다.
 */
export async function assertLoginIdAvailable(loginId: string): Promise<void> {
  if (!(await isLoginIdAvailable(loginId))) {
    throw new ConflictError({ loginId: LOGIN_ID_TAKEN });
  }
}

// ── 내 정보 ───────────────────────────────────────────────────
// 이 아래 함수들은 전부 **세션 주인의 정보만** 다룬다. id 를 파라미터로 받는
// 함수가 하나도 없는 것이 그 장치다 — 받는 순간 남의 id 를 넣어보는 경로가 열리고,
// 그때부터는 "호출부가 세션 id 를 넣었는가"에 매번 의존하게 된다.
// 다른 사용자 조회가 필요해지면 그건 관리자 기능이며 별도 함수여야 한다.

/**
 * 세션의 사용자를 DB 에서 꺼낸다. ACTIVE 가 아니면 로그인하지 않은 것과 같다.
 *
 * 토큰이 7일 살아 있어서, 그 사이 차단·탈퇴된 계정이 발급 시점의 상태로
 * 계속 통과하면 안 된다 (authService.getCurrentUser 와 같은 이유).
 */
async function loadActiveUser(session: SessionPayload): Promise<User> {
  const user = await userRepository.findById(session.userId);
  if (!user || user.status !== "ACTIVE") throw new UnauthorizedError();

  return user;
}

/** 위와 같되 해시까지 가져온다. 비밀번호 대조가 필요한 경로 전용. */
async function loadActiveUserWithHash(
  session: SessionPayload,
): Promise<UserWithHash> {
  const user = await userRepository.findByIdWithHash(session.userId);
  if (!user || user.status !== "ACTIVE") throw new UnauthorizedError();

  return user;
}

/** 마이페이지가 그릴 내 정보. */
export async function getMyProfile(
  session: SessionPayload | null,
): Promise<User> {
  assertAuthenticated(session);

  return loadActiveUser(session);
}

/**
 * 내 회원정보를 고친다.
 *
 * 검증은 회원가입과 **같은 규칙**(parseProfile)이다. 두 벌로 짜지 않는다.
 *
 * repository 로 넘기는 값이 parseProfile 이 돌려준 필드로만 조립된다는 점이
 * 중요하다. 요청 바디에 role / status / loginId 가 섞여 있어도 이 함수를 지나며
 * 사라지고, UpdateUserData 에 그 필드가 없으므로 실수로 실어 보낼 수도 없다.
 */
export async function updateMyProfile(
  session: SessionPayload | null,
  input: ProfileInput,
): Promise<User> {
  assertAuthenticated(session);

  // 대상이 아직 유효한 계정인지부터 확인한다. 차단된 계정이 자기 정보를
  // 고치고 있게 두지 않는다.
  await loadActiveUser(session);

  const parsed = parseProfile(input);
  if (!parsed.ok) throw new ValidationError(parsed.errors);

  return userRepository.update(session.userId, {
    name: parsed.value.name,
    gender: parsed.value.gender,
    birthDate: parsed.value.birthDate,
    phone: parsed.value.phone,
    // 폼의 선택지(MEMBER / NON_MEMBER)를 도메인 boolean 으로 옮긴다.
    // 회원가입(authService.signup)과 같은 변환이다.
    isChurchMember: parsed.value.churchMember === "MEMBER",
  });
}

/**
 * 비밀번호를 바꾼다.
 *
 * 순서에 규칙이 있다.
 *   ① 형식 검증 — 새 비밀번호가 규칙에 맞는가 (가입과 같은 규칙).
 *   ② 현재 비밀번호 대조 — 틀리면 UnauthorizedError(401).
 *   ③ 같은 값인가 — 바꾸는 의미가 없으므로 거절.
 *   ④ 해시 후 저장.
 *
 * **②를 ①보다 뒤에 둔다.** 현재 비밀번호가 맞아야만 새 비밀번호의 형식 문구를
 * 보여주는 편이 안전해 보이지만, 실제로는 반대다 — 형식 오류는 입력 칸에 붙는
 * 문구라 아무 비밀도 흘리지 않는 반면, 순서를 뒤집으면 맞는 현재 비밀번호를 쥔
 * 사용자가 형식 오류를 고칠 때마다 bcrypt 대조를 한 번씩 더 돌리게 된다.
 *
 * **세션을 무효화하지 않는다.** 근거는 아래 주석 참조.
 */
export async function changePassword(
  session: SessionPayload | null,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  assertAuthenticated(session);

  // 확인 칸은 클라이언트 폼에만 있는 필드다. 서버에는 두 값만 오므로
  // 확인값 자리에 새 비밀번호를 그대로 넣어 "불일치" 규칙을 통과시킨다 —
  // 검증 함수를 변경용으로 하나 더 만들지 않기 위한 최소한의 맞춤이다.
  const input: PasswordChangeInput = {
    currentPassword,
    newPassword,
    newPasswordConfirm: newPassword,
  };

  const errors = validatePasswordChange(input);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  const user = await loadActiveUserWithHash(session);

  // 자격 증명이 틀린 것이므로 403(권한 없음)이 아니라 401 이다.
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new UnauthorizedError(CURRENT_PASSWORD_INVALID);
  }

  // 형식은 맞지만 지금 쓰는 것과 같은 값. 입력 칸에 붙는 문구이므로 400.
  if (await verifyPassword(newPassword, user.passwordHash)) {
    throw new ValidationError({ newPassword: PASSWORD_UNCHANGED });
  }

  await userRepository.updatePassword(session.userId, await hashPassword(newPassword));

  // ── 왜 여기서 세션을 끊지 않는가 ────────────────────────────
  // 통상 "비밀번호를 바꾸면 다른 기기의 세션을 끊는다"는 계정 탈취를 되돌리기
  // 위한 조치다. 그런데 우리 세션은 서명만 검증하는 무상태 JWT 이고 서버에
  // 발급 목록이 없다(리프레시 토큰도 없다). 이미 나간 토큰을 회수할 방법이
  // 구조적으로 없으므로, 여기서 할 수 있는 일은 **이 요청을 보낸 쿠키를 지우는
  // 것뿐**이다. 그러면 탈취자의 토큰은 그대로 살아 있는 채 정당한 사용자만
  // 로그아웃된다 — 보호 효과는 0 이고 불편만 남는다.
  //
  // 진짜로 끊으려면 users 에 password_changed_at 같은 컬럼을 두고 세션 검증에서
  // "토큰 발급 시각(iat)이 그보다 이른가"를 보는 수밖에 없다. 스키마와 세션
  // 검증 경로를 함께 바꾸는 일이라 이번 범위 밖이며, 별도 슬라이스로 다룬다.
}

/**
 * 탈퇴한다. 되돌릴 수 없다.
 *
 * 순서에 규칙이 있다.
 *   ① 로그인 여부 — 세션이 없으면 401.
 *   ② 계정 상태 — ACTIVE 가 아니면(이미 탈퇴했거나 차단됐다) 진행하지 않는다.
 *   ③ 아이디 대조 — **세션의 id 로 읽어온 login_id** 와 입력값을 맞춘다.
 *   ④ 소프트 삭제.
 *
 * **③에서 입력값을 신뢰하지 않는 것이 핵심이다.** 대상은 언제나 세션의 주인이고,
 * 입력된 아이디는 "정말 이 계정을 지울 생각인가"를 되묻는 확인 절차일 뿐이다.
 * 입력값으로 사용자를 찾아서 지우면 남의 아이디를 넣어보는 경로가 열린다.
 *
 * 비밀번호를 함께 묻지 않는 것은 시안(1:1163)의 결정이다. 확인 수단이 아이디
 * 하나뿐이지만, 이 요청은 이미 세션 쿠키를 쥔 쪽만 보낼 수 있다.
 *
 * **탈퇴 사유를 받지 않고, 문서·댓글도 지우지 않는다** (docs/policy-draft.md 2절).
 * 세션 쿠키를 만료시키는 것은 HTTP 의 일이라 route handler 가 한다.
 */
export async function withdrawMe(
  session: SessionPayload | null,
  confirmLoginId: string,
): Promise<void> {
  assertAuthenticated(session);

  // ACTIVE 가 아니면 UnauthorizedError 다 — 이미 탈퇴한 계정의 토큰이 남아 있는
  // 상황이므로 "로그인하지 않은 것과 같다"가 정확한 답이다.
  const user = await loadActiveUser(session);

  // ── 관리자는 스스로 탈퇴할 수 없다 ──────────────────────────
  // 관리자 계정은 공개 가입으로 만들어지지 않고 DB 에서 손으로 승격된다
  // (CLAUDE.md "인증"). 만드는 경로가 DB 인데 없애는 경로만 화면에 두면,
  // 마지막 ADMIN 이 탈퇴하는 순간 승격을 실행할 관리자가 사라진다 — 되돌리려면
  // 결국 DB 를 직접 만져야 하고, 그건 애초에 승격이 있던 자리다.
  //
  // "마지막 한 명인가"를 세지 않는 이유: 세는 순간 그 판정과 UPDATE 사이에
  // 다른 관리자가 같은 요청을 보내면 둘 다 통과한다(TOCTOU). 관리자 수를 세는
  // 쿼리와 잠금을 들이는 대신, 관리자 계정의 수명은 승격과 같은 자리(DB)에서
  // 다룬다는 규칙 하나로 끝낸다.
  if (user.role === "ADMIN") {
    throw new ForbiddenError(
      "관리자 계정은 탈퇴할 수 없습니다. 문화팀으로 문의해주세요.",
    );
  }

  // 확인 칸. 형식 규칙(validateLoginId)을 걸지 않는다 — 이 칸이 답해야 하는
  // 질문은 "형식이 맞는가"가 아니라 "본인 아이디와 같은가" 하나뿐이다.
  if (confirmLoginId.trim() !== user.loginId) {
    throw new ValidationError({ confirmLoginId: WITHDRAW_LOGIN_ID_MISMATCH });
  }

  await userRepository.withdraw(session.userId);
}

// ── 관리자용 ──────────────────────────────────────────────────
// 여기부터는 위의 "내 정보" 구역과 반대로 **남의 id 를 다룬다.** 그래서 구역을
// 갈라 두고, 모든 함수가 assertRole(session, "ADMIN") 으로 시작한다. 두 구역이
// 한 파일에 있어도 섞이지 않는 이유는 위쪽 함수들이 id 파라미터를 아예 받지
// 않기 때문이다 — 관리자용 함수를 추가할 때 위 구역에 넣지 마라.

/** 사용자 목록 한 페이지의 기본 건수. 어드민 게시물 목록과 같은 20 이다. */
const DEFAULT_ADMIN_USER_PAGE_SIZE = 20;

/** 한 번에 실어 나를 수 있는 최대 건수. 임의로 큰 size 를 막는다. */
const MAX_USER_PAGE_SIZE = 50;

function positiveInt(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(Math.trunc(value), 1);
}

/**
 * 사용자 관리 목록 (`/admin/users` · `/admin/admins`).
 *
 * **assertRole 이 첫 줄이다.** 파라미터를 다듬는 것조차 그 뒤다 — 권한 없는
 * 요청에 응답 모양이 조금이라도 새어나가면 안 된다 (pageService 와 같은 규칙).
 *
 * **기준이 ADMIN 이다.** 위키 관리(EDITOR)와 선이 다르다. EDITOR 는 글을 다루는
 * 역할이고 계정은 다루지 않는다 — 여기가 뚫리면 EDITOR 가 전 회원의 아이디와
 * 가입일을 열람하고, 역할 변경까지 같은 화면에 붙어 있어 스스로를 ADMIN 으로
 * 올릴 수 있다. 화면 가드(requireRole("ADMIN"))와 같은 선이며, 그쪽이 이 가드를
 * 대체하지 않는다 (API 는 화면을 거치지 않는다).
 *
 * **두 화면이 같은 함수를 쓴다.** /admin/admins 는 role 필터를 ADMIN 으로 고정해
 * 부르는 같은 목록일 뿐이고, 그 기본값은 화면이 정한다 (CLAUDE.md "화면 중복" —
 * 라우트를 복제하지 않는다는 규칙과 같은 결).
 *
 * 필터 값을 여기서 던지지 않고 접는 이유와, 적용된 값을 되돌려주는 이유는
 * validation/userAdmin 주석에 있다.
 */
export async function listUsersForAdmin(
  session: SessionPayload | null,
  params: { role?: unknown; status?: unknown; page?: number; size?: number } = {},
): Promise<{
  items: AdminUserSummary[];
  total: number;
  page: number;
  size: number;
  role: Role | null;
  status: UserStatus | null;
}> {
  assertRole(session, "ADMIN");

  const role = parseRoleFilter(params.role);
  const status = parseUserStatusFilter(params.status);
  const window = {
    page: positiveInt(params.page, 1),
    size: Math.min(
      positiveInt(params.size, DEFAULT_ADMIN_USER_PAGE_SIZE),
      MAX_USER_PAGE_SIZE,
    ),
  };

  const { items, total } = await userRepository.findUsersForAdmin({
    ...window,
    role,
    status,
  });

  // "필터 없음"은 undefined 가 아니라 null 로 답한다. JSON 은 undefined 를
  // 직렬화하면서 키를 통째로 지워버려, 클라이언트가 "전체"와 "이 서버는 role 을
  // 모른다"를 구분할 수 없게 된다 (listPagesForAdmin 과 같은 규칙).
  return { items, total, ...window, role: role ?? null, status: status ?? null };
}

/**
 * 다른 사용자의 역할을 바꾼다 (승격 · 강등).
 *
 * 순서에 규칙이 있다.
 *   ① 권한 — ADMIN 만.
 *   ② 자기 자신인가 — **대상을 조회하기도 전에** 막는다. 판정에 DB 값이 필요
 *      없으므로 질의를 낭비할 이유가 없고, 세션 id 와 경로의 id 를 맞대 보는
 *      것이 이 규칙의 전부다.
 *   ③ 대상이 있는가 — 없으면 404.
 *   ④ 탈퇴 계정인가 — 거절.
 *   ⑤ UPDATE.
 *
 * ── ② 자기 자신 금지가 이 함수의 안전장치다 ──────────────────
 * 마지막 ADMIN 이 스스로를 강등하면 승격을 실행할 사람이 사라져서, 되돌리는
 * 경로가 DB 직접 수정밖에 남지 않는다. 관리자 계정은 애초에 DB 에서 손으로
 * 만들어지므로(CLAUDE.md "인증") 그 상태는 "복구 불가"는 아니지만 화면 밖의
 * 일이 된다.
 *
 * **"마지막 ADMIN 인가"를 세지 않는다.** 세는 순간 그 SELECT 와 UPDATE 사이에
 * 다른 관리자가 같은 요청을 보내면 둘 다 통과한다(TOCTOU) — 카운트가 1보다
 * 크다고 답한 두 요청이 나란히 강등을 실행하면 관리자가 0명이 된다. 잠금이나
 * 조건부 UPDATE 를 들이는 대신, 자기 자신 금지 규칙 하나로 끝낸다: 아무도
 * 자기를 강등할 수 없으면 마지막 한 명은 구조적으로 남는다. 탈퇴 슬라이스
 * (withdrawMe)에서 이미 같은 판단을 했다.
 *
 * ── ④ 탈퇴 계정 ────────────────────────────────────────────
 * 탈퇴는 되돌릴 수 없는 종점이다(soft delete, PII 는 이미 NULL). 그 계정의
 * 역할을 올리면 로그인도 못 하는 유령 관리자가 목록에 남고, 나중에 상태만
 * 되살리는 경로가 생기면 아무도 의도하지 않은 권한이 함께 깨어난다.
 * BLOCKED 는 막지 않는다 — 차단은 되돌릴 수 있는 상태이고, 차단된 편집자의
 * 권한을 거두는 것이 오히려 자연스러운 조작이다.
 *
 * 실패를 ValidationError 가 아니라 ForbiddenError 로 던지는 것은 둘 다 입력 칸의
 * 문제가 아니라 **대상의 상태·정체 때문에 허용되지 않는 조작**이기 때문이다
 * (withdrawMe 의 ADMIN 탈퇴 금지와 같은 종류).
 */
export async function changeUserRole(
  session: SessionPayload | null,
  targetUserId: string,
  newRole: Role,
): Promise<User> {
  assertRole(session, "ADMIN");

  if (session.userId === targetUserId) {
    throw new ForbiddenError(ROLE_SELF_CHANGE);
  }

  const target = await userRepository.findById(targetUserId);
  if (!target) throw new NotFoundError(USER_NOT_FOUND);

  if (target.status === "WITHDRAWN") {
    throw new ForbiddenError(ROLE_WITHDRAWN_TARGET);
  }

  // 같은 역할로의 변경을 따로 막지 않는다. 게시물 상태 전환과 달리(전환표가
  // 자기 자신을 거절한다) 여기에는 "아무 일도 안 일어났다"를 화면이 알아야 할
  // 이유가 없다 — 셀렉트는 값이 바뀔 때만 요청을 보내고, 결과 화면은 어느
  // 쪽이든 같다.
  return userRepository.updateRole(targetUserId, newRole);
}
