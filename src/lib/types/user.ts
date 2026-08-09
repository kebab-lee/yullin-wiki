// =============================================================
// 사용자 도메인 모델
//
// users 테이블은 gender / status / role 을 varchar + CHECK 로 저장한다.
// 그 값이 그대로 이 문자열 리터럴 유니온이며, Java 쪽에서는
// @Enumerated(EnumType.STRING) 로 같은 값을 쓴다.
//
// DB 컬럼(snake_case) → camelCase 변환은 repository 의 책임이다.
//
// role 만 여기에 정의가 없다. 값에 더해 "서열"이라는 규칙이 붙는 순간
// 권한 레이어의 것이 되므로 auth/roles.ts 가 소유하고, 여기서는 다시
// 내보내기만 한다. 두 곳에 적으면 역할이 늘 때 한쪽만 고쳐진다.
// =============================================================

import type { Role } from "@/lib/auth/roles";

export type { Role } from "@/lib/auth/roles";
export { ROLES, isRole } from "@/lib/auth/roles";

export type Gender = "MALE" | "FEMALE";

export type UserStatus = "ACTIVE" | "BLOCKED" | "WITHDRAWN";

/**
 * 상태 값의 목록. users_status_chk 와 같은 순서·같은 값이다.
 *
 * 목록이 필요한 이유는 어드민 사용자 관리의 상태 필터다 — 화면이 `["ACTIVE", …]`
 * 를 손으로 적으면 값이 하나 늘 때 탭에서 조용히 빠진다 (ROLES 와 같은 규칙).
 */
export const USER_STATUSES: readonly UserStatus[] = [
  "ACTIVE",
  "BLOCKED",
  "WITHDRAWN",
];

/** 밖에서 들어온 문자열이 UserStatus 인가. isGender 와 같은 용도다. */
export function isUserStatus(value: unknown): value is UserStatus {
  return (
    typeof value === "string" &&
    (USER_STATUSES as readonly string[]).includes(value)
  );
}

export const GENDERS: readonly Gender[] = ["FEMALE", "MALE"];

/** 성별 표시명. 값(DB)과 표시명을 한 곳에서만 잇는다. */
export const GENDER_LABEL: Record<Gender, string> = {
  FEMALE: "여성",
  MALE: "남성",
};

/**
 * 폼에서 올라온 문자열이 Gender 인가.
 *
 * 검증(validation/user.ts)이 이미 걸러낸 값이라도 타입에는 그 사실이 남지 않는다.
 * service 가 `as Gender` 캐스팅 대신 이 가드로 좁힌다.
 */
export function isGender(value: string): value is Gender {
  return (GENDERS as readonly string[]).includes(value);
}

/**
 * 사용자 도메인 모델.
 *
 * password_hash 는 의도적으로 없다. 비밀번호 해시는 인증 레이어 안에서만
 * 다루며, 도메인 모델에 실으면 API 응답으로 새어나갈 경로가 생긴다.
 * repository 는 이 타입으로 변환할 때 해시 컬럼을 버린다.
 *
 * name / gender / birthDate / phone 이 null 인 것은 탈퇴(WITHDRAWN) 계정뿐이다.
 * 회원가입 시에는 전부 필수이며, 그 검증은 validation + service 가 담당한다.
 */
export interface User {
  id: string;
  loginId: string;

  name: string | null;
  gender: Gender | null;

  /** date 컬럼. "YYYY-MM-DD" 형식 문자열. */
  birthDate: string | null;
  phone: string | null;

  /** 열린교회 소속 여부. 폼의 MEMBER / NON_MEMBER 선택을 service 가 boolean 으로 옮긴다. */
  isChurchMember: boolean;

  role: Role;
  status: UserStatus;

  /** ISO 8601 문자열. */
  createdAt: string;
  updatedAt: string;

  /**
   * 탈퇴 시각. 계정 상태의 정본은 status 이며 이 값으로 판정하지 않는다.
   * "언제 탈퇴했는가"만 답한다.
   */
  deletedAt: string | null;
}

/**
 * 어드민 사용자 목록 한 줄 (`/admin/users` · `/admin/admins`).
 *
 * **User 를 그대로 싣지 않는 것이 이 타입의 핵심이다.** 목록이 그리는 것은
 * 아이디·이름·역할·상태·가입일 다섯 칸뿐인데 User 를 내보내면 전화번호·생년월일·
 * 성별까지 전 사용자분이 한 응답에 실려 나간다. 화면에 안 그린다고 안 나가는 것이
 * 아니다 — 계약에 실리면 브라우저까지 간다.
 *
 * PageSummary / AdminPageSummary 를 나눈 것과 같은 결이며, 나중에 Java 백엔드가
 * 같은 JSON 을 돌려주려면 그쪽에도 이 좁은 DTO 가 있어야 한다.
 *
 * name 이 null 인 것은 탈퇴(WITHDRAWN) 계정뿐이다. 대체 문구는 도메인이 아니라
 * 화면이 정한다 (ArticleHeader.UNKNOWN_AUTHOR 와 같은 규칙).
 */
export interface AdminUserSummary {
  id: string;
  loginId: string;
  name: string | null;
  role: Role;
  status: UserStatus;
  /** 가입일. ISO 8601 문자열. */
  createdAt: string;
}
