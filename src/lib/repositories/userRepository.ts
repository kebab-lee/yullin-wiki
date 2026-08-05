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
import type { Gender, Role, User, UserStatus } from "@/lib/types";
import { LOGIN_ID_TAKEN } from "@/lib/validation/user";

import { getSupabase } from "./supabaseClient";

const TABLE = "users";

/** 도메인 모델로 옮길 때 읽는 컬럼. password_hash 는 의도적으로 빠져 있다. */
const USER_COLUMNS =
  "id, login_id, name, gender, birth_date, phone, is_church_member, role, status, created_at, updated_at, deleted_at";

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
