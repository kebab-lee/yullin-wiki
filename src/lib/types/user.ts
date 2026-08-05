// =============================================================
// 사용자 도메인 모델
//
// users 테이블은 gender / status / role 을 varchar + CHECK 로 저장한다.
// 그 값이 그대로 이 문자열 리터럴 유니온이며, Java 쪽에서는
// @Enumerated(EnumType.STRING) 로 같은 값을 쓴다.
//
// DB 컬럼(snake_case) → camelCase 변환은 repository 의 책임이다.
// =============================================================

export type Gender = "MALE" | "FEMALE";

export type UserStatus = "ACTIVE" | "BLOCKED" | "WITHDRAWN";

/**
 * users.role 에 실제로 저장되는 값.
 *
 * 화면에서 쓰는 "로그인 안 한 방문자(GUEST)"는 DB 값이 아니므로 여기 없다.
 * 그쪽은 `ViewerRole` (types/auth.ts) 이다.
 */
export type Role = "USER" | "ADMIN";

export const GENDERS: readonly Gender[] = ["FEMALE", "MALE"];

/** 성별 표시명. 값(DB)과 표시명을 한 곳에서만 잇는다. */
export const GENDER_LABEL: Record<Gender, string> = {
  FEMALE: "여성",
  MALE: "남성",
};

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
