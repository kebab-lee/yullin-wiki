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

import { ConflictError, ValidationError } from "@/lib/errors";
import * as userRepository from "@/lib/repositories/userRepository";
import { LOGIN_ID_TAKEN, validateLoginId } from "@/lib/validation/user";

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
