// =============================================================
// users 테이블 접근
//
// DB row(snake_case)를 도메인 모델(User, camelCase)로 옮기는 것이 이 레이어의
// 책임이다. row 모양이 service 위로 새어나가면 Java 백엔드로 갈아끼울 때
// 프론트까지 흔들린다.
//
// Postgres 에러 코드 같은 드라이버 사정도 여기서 끝낸다 —
// 위 레이어에는 도메인 에러(ConflictError)로만 올린다.
// =============================================================

import { ConflictError } from "@/lib/errors";
import type {
  AdminUserSummary,
  Gender,
  Role,
  User,
  UserStatus,
} from "@/lib/types";
import { LOGIN_ID_TAKEN } from "@/lib/validation/user";

import { getSupabase } from "./supabaseClient";

const TABLE = "users";

/** 도메인 모델로 옮길 때 읽는 컬럼. password_hash 는 의도적으로 빠져 있다. */
const USER_COLUMNS =
  "id, login_id, name, gender, birth_date, phone, is_church_member, role, status, created_at, updated_at, deleted_at";

/**
 * 어드민 목록이 읽는 컬럼. USER_COLUMNS 의 부분집합이다.
 *
 * 전화번호·생년월일·성별이 빠져 있는 것이 요점이다 — 목록은 다섯 칸만 그리는데
 * 전 컬럼을 읽으면 화면에 안 쓰는 PII 가 응답까지 따라 나간다
 * (AdminUserSummary 주석). 어차피 select 로 안 읽으면 실을 방법도 없다.
 */
const ADMIN_SUMMARY_COLUMNS = "id, login_id, name, role, status, created_at";

/** Postgres unique_violation. login_id unique 제약과 부딪혔을 때 온다. */
const PG_UNIQUE_VIOLATION = "23505";

// ── row 타입 ──────────────────────────────────────────────────
type UserRow = {
  id: string;
  login_id: string;
  name: string | null;
  gender: string | null;
  birth_date: string | null;
  phone: string | null;
  is_church_member: boolean;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type UserRowWithHash = UserRow & { password_hash: string };

/** 어드민 목록 행. ADMIN_SUMMARY_COLUMNS 와 짝이다. */
type AdminUserSummaryRow = Pick<
  UserRow,
  "id" | "login_id" | "name" | "role" | "status" | "created_at"
>;

/**
 * 비밀번호 해시를 달고 있는 사용자.
 *
 * 해시가 필요한 곳은 로그인 시 비밀번호 대조 한 곳뿐이라 도메인 모델(User)에는
 * 싣지 않는다. 이 타입은 repository 와 service(인증) 사이에서만 살아 있어야 하며,
 * Route Handler 를 넘어 응답 JSON 으로 나가면 안 된다.
 */
export type UserWithHash = User & { passwordHash: string };

/** 신규 사용자 입력. role / status / 타임스탬프는 DB 기본값에 맡긴다. */
export type NewUser = {
  loginId: string;
  passwordHash: string;
  name: string;
  gender: Gender;
  /** "YYYY-MM-DD". date 컬럼에 그대로 들어간다. */
  birthDate: string;
  phone: string;
  isChurchMember: boolean;
};

/**
 * 사용자가 스스로 고칠 수 있는 값.
 *
 * **role / status / loginId 가 없는 것이 이 타입의 핵심이다.** 권한 상승 경로를
 * 타입 레벨에서 끊는다 — service 가 실수로 넘기려 해도 컴파일이 막고, 요청 바디에
 * role 이 섞여 들어와도 이 모양으로 옮기는 과정에서 그냥 사라진다.
 * (service 의 검증만으로 막으면 "거르는 코드를 빠뜨렸는가"에 매번 의존하게 된다)
 *
 * 관리자가 역할·상태를 바꾸는 경로가 나중에 생기면 그건 별도 함수여야 한다.
 * 이 타입에 필드를 더해서 겸용하지 마라 — 그 순간 두 경로의 권한 차이가 사라진다.
 *
 * 비밀번호도 여기 없다. 현재 비밀번호 확인이 붙는 별도 절차라 updatePassword 로 나뉜다.
 */
export type UpdateUserData = {
  name: string;
  gender: Gender;
  /** "YYYY-MM-DD". */
  birthDate: string;
  phone: string;
  isChurchMember: boolean;
};

// ── 변환 ──────────────────────────────────────────────────────
function toUser(row: UserRow): User {
  return {
    id: row.id,
    loginId: row.login_id,
    name: row.name,
    // varchar + CHECK 제약이 값을 보증한다. 도메인 유니온으로 좁혀서 올린다.
    gender: row.gender as Gender | null,
    birthDate: row.birth_date,
    phone: row.phone,
    isChurchMember: row.is_church_member,
    role: row.role as Role,
    status: row.status as UserStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toAdminSummary(row: AdminUserSummaryRow): AdminUserSummary {
  return {
    id: row.id,
    loginId: row.login_id,
    name: row.name,
    role: row.role as Role,
    status: row.status as UserStatus,
    createdAt: row.created_at,
  };
}

// ── 조회 ──────────────────────────────────────────────────────
/**
 * id 로 사용자를 찾는다. 세션의 userId 로 현재 사용자를 복원할 때 쓴다.
 * 해시가 필요 없는 경로이므로 User 만 돌려준다.
 */
export async function findById(id: string): Promise<User | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(USER_COLUMNS)
    .eq("id", id)
    .maybeSingle<UserRow>();

  if (error) throw new Error(`사용자 조회 실패: ${error.message}`);
  return data ? toUser(data) : null;
}

/**
 * id 로 찾되 해시까지 함께 준다. 비밀번호 변경에서 현재 비밀번호를 대조할 때 쓴다.
 *
 * findById 와 나눠 둔 것은 의도다 — 해시를 싣는 조회는 부르는 쪽이 그 사실을
 * 알고 불러야 한다. 기본 조회에 해시를 얹으면 화면용 조회까지 전부 해시를
 * 들고 다니게 되고, 응답으로 새어나갈 경로가 그만큼 늘어난다.
 */
export async function findByIdWithHash(
  id: string,
): Promise<UserWithHash | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(`${USER_COLUMNS}, password_hash`)
    .eq("id", id)
    .maybeSingle<UserRowWithHash>();

  if (error) throw new Error(`사용자 조회 실패: ${error.message}`);
  if (!data) return null;

  return { ...toUser(data), passwordHash: data.password_hash };
}

/**
 * 로그인 아이디로 사용자를 찾는다. 비밀번호 대조를 위해 해시까지 함께 준다.
 * 해시가 필요 없는 조회는 이 함수를 쓰지 않는다.
 */
export async function findByLoginId(
  loginId: string,
): Promise<UserWithHash | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(`${USER_COLUMNS}, password_hash`)
    .eq("login_id", loginId)
    .maybeSingle<UserRowWithHash>();

  if (error) throw new Error(`사용자 조회 실패: ${error.message}`);
  if (!data) return null;

  return { ...toUser(data), passwordHash: data.password_hash };
}

/**
 * 아이디 점유 여부만 본다.
 *
 * 탈퇴(WITHDRAWN) 계정도 login_id 를 그대로 들고 있고 unique 제약이 살아 있으므로
 * status 로 거르지 않는다. 거르면 "사용 가능"이라고 답한 아이디가 insert 에서
 * 터진다.
 */
export async function existsByLoginId(loginId: string): Promise<boolean> {
  const { count, error } = await getSupabase()
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("login_id", loginId);

  if (error) throw new Error(`아이디 중복 확인 실패: ${error.message}`);
  return (count ?? 0) > 0;
}

/**
 * 어드민 사용자 목록 한 페이지 + 전체 건수 (`/admin/users` · `/admin/admins`).
 *
 * **탈퇴 계정을 기본으로 거르지 않는다.** 게시물의 `deleted_at` 과 달리 탈퇴는
 * 상태 축(status)에 있고, "탈퇴한 사람이 있었다"는 사실 자체가 이 화면이 답해야
 * 할 질문 중 하나다. 보고 싶지 않으면 status 필터로 좁히면 된다 — 거꾸로 여기서
 * 걸러 버리면 탈퇴 회원을 볼 방법이 화면에 남지 않는다.
 *
 * role / status 를 optional 로 받는 것도 findForAdmin(pages)과 같은 구분이다:
 *   undefined → 전체
 *   값이 있으면 → 그 값만
 * 기본값을 여기서 정하지 않는다. "이 화면의 기본 필터가 무엇이냐"는 화면의
 * 규칙이고, 그래서 /admin/users 와 /admin/admins 가 같은 함수로 갈린다.
 *
 * 정렬은 가입일 내림차순이다. 관리 화면에서 먼저 봐야 할 것은 새로 들어온
 * 계정이고, 목록에 그려지는 유일한 시각 컬럼이라 정렬 기준이 화면에 드러난다.
 */
export async function findUsersForAdmin({
  role,
  status,
  page,
  size,
}: {
  role?: Role;
  status?: UserStatus;
  page: number;
  size: number;
}): Promise<{ items: AdminUserSummary[]; total: number }> {
  const from = (page - 1) * size;

  const query = getSupabase()
    .from(TABLE)
    .select(ADMIN_SUMMARY_COLUMNS, { count: "exact" });

  if (role) query.eq("role", role);
  if (status) query.eq("status", status);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + size - 1)
    .returns<AdminUserSummaryRow[]>();

  if (error) throw new Error(`사용자 목록 조회 실패: ${error.message}`);

  return { items: (data ?? []).map(toAdminSummary), total: count ?? 0 };
}

// ── 생성 ──────────────────────────────────────────────────────
export async function create(input: NewUser): Promise<User> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert({
      login_id: input.loginId,
      password_hash: input.passwordHash,
      name: input.name,
      gender: input.gender,
      birth_date: input.birthDate,
      phone: input.phone,
      is_church_member: input.isChurchMember,
    })
    .select(USER_COLUMNS)
    .single<UserRow>();

  if (error) {
    // service 의 중복 확인과 insert 사이에 다른 요청이 같은 아이디를 채간 경우.
    // 드라이버 에러 코드를 도메인 에러로 옮겨서 올린다. 문구는 service 가 미리
    // 걸러냈을 때와 같아야 하므로 정본(validation 모듈)을 그대로 쓴다.
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new ConflictError({ loginId: LOGIN_ID_TAKEN });
    }
    throw new Error(`사용자 생성 실패: ${error.message}`);
  }

  return toUser(data);
}

// ── 수정 ──────────────────────────────────────────────────────
/**
 * 회원정보를 고친다.
 *
 * 받는 값이 UpdateUserData 로 고정돼 있어 role / status / login_id 는 이 경로로
 * 바뀔 수 없다. 아래 update 문에 그 컬럼들이 아예 등장하지 않는 것이 그 결과다 —
 * **여기에 컬럼을 추가하지 마라.**
 *
 * updated_at 은 users_set_updated_at 트리거가 갱신한다.
 */
export async function update(
  id: string,
  data: UpdateUserData,
): Promise<User> {
  const { data: row, error } = await getSupabase()
    .from(TABLE)
    .update({
      name: data.name,
      gender: data.gender,
      birth_date: data.birthDate,
      phone: data.phone,
      is_church_member: data.isChurchMember,
    })
    .eq("id", id)
    .select(USER_COLUMNS)
    .single<UserRow>();

  if (error) throw new Error(`회원정보 수정 실패: ${error.message}`);
  return toUser(row);
}

/**
 * 역할만 바꾼다 (관리자의 승격·강등).
 *
 * **update() 에 role 을 얹지 않고 별도 함수로 둔 것이 핵심이다.** UpdateUserData
 * 주석이 미리 못박아 둔 그 자리다 — 저쪽은 사용자가 자기 정보를 고치는 경로이고
 * 이쪽은 관리자가 남의 권한을 바꾸는 경로다. 한 함수로 겸용하면 두 경로의 권한
 * 차이가 타입에서 사라지고, 회원정보 수정 요청에 role 을 끼워 넣는 길이 열린다.
 *
 * "바꿔도 되는가"는 여기서 판단하지 않는다 (자기 자신인가 · 탈퇴 계정인가).
 * 그건 규칙이라 service 의 몫이고, 여기는 UPDATE 한 문장만 책임진다.
 */
export async function updateRole(id: string, role: Role): Promise<User> {
  const { data: row, error } = await getSupabase()
    .from(TABLE)
    .update({ role })
    .eq("id", id)
    .select(USER_COLUMNS)
    .single<UserRow>();

  if (error) throw new Error(`역할 변경 실패: ${error.message}`);
  return toUser(row);
}

/**
 * 탈퇴 처리 — 소프트 삭제.
 *
 * **UPDATE 한 번이다.** status / deleted_at / PII 를 나눠 쏘면 중간에 실패했을 때
 * "상태는 WITHDRAWN 인데 전화번호는 남은" 반쪽 계정이 생긴다. 단일 문이면
 * Postgres 가 문 단위로 원자성을 보장하므로 트랜잭션을 따로 열 필요도 없다.
 *
 * **login_id 를 비우지 않는다.** unique 제약이 살아 있는 채로 남아야 같은
 * 아이디로 다시 가입할 수 없고, 과거에 남긴 기록이 나중에 같은 아이디를 쓰는
 * 다른 사람의 것으로 오인되지 않는다 (docs/policy-draft.md 3절).
 *
 * password_hash 도 비우지 않는다 — not null 컬럼이고, 어차피 로그인은
 * status 로 막힌다. 지운다고 얻는 것이 없다.
 *
 * 갱신된 사용자를 돌려주지 않는다. 호출부가 필요로 하는 것은 "탈퇴했다"는
 * 사실뿐이고, PII 가 전부 비워진 행을 굳이 위로 올릴 이유가 없다.
 */
export async function withdraw(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .update({
      status: "WITHDRAWN" satisfies UserStatus,
      deleted_at: new Date().toISOString(),
      name: null,
      gender: null,
      birth_date: null,
      phone: null,
    })
    .eq("id", id);

  if (error) throw new Error(`탈퇴 처리 실패: ${error.message}`);
}

/**
 * 비밀번호 해시만 바꾼다.
 *
 * 갱신된 사용자를 돌려주지 않는다. 도메인 모델(User)에는 해시가 없어서 이 변경이
 * 반영된 값이 애초에 없고, 호출부가 필요로 하는 것도 "바뀌었다"는 사실뿐이다.
 */
export async function updatePassword(
  id: string,
  passwordHash: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .update({ password_hash: passwordHash })
    .eq("id", id);

  if (error) throw new Error(`비밀번호 변경 실패: ${error.message}`);
}
