// =============================================================
// 역할 · 계정 상태의 표시명
//
// 값(DB)과 표시명을 잇는 자리를 한 곳으로 둔다. 필터 탭·표의 배지·역할 셀렉트가
// 각자 문자열을 적으면 "EDITOR" 가 어디서는 "편집자", 어디서는 "에디터"가 된다.
//
// **도메인이 아니라 화면의 것이다.** 그래서 types/user.ts 가 아니라 여기 산다 —
// 표시명이 바뀌어도 API 계약과 DB 값은 그대로여야 한다 (categories 의 name /
// full_name / slug 를 가른 것과 같은 규칙: 분기 조건에 표시명을 쓰지 않는다).
// pages/statusLabel.ts 와 짝이 되는 파일이다.
// =============================================================

import type { Role, UserStatus } from "@/lib/types";

export const ROLE_LABEL: Record<Role, string> = {
  USER: "일반 회원",
  EDITOR: "편집자",
  ADMIN: "관리자",
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "정상",
  BLOCKED: "차단",
  WITHDRAWN: "탈퇴",
};

/**
 * 상태 배지의 색. 게시물 상태 배지(PAGE_STATUS_BADGE_CLASS)와 같은 모양을 쓴다.
 *
 * 탈퇴만 회색인 것은 그것이 종점이기 때문이다 — 정상·차단은 오갈 수 있는 상태라
 * 색으로 구분하고, 되돌릴 수 없는 상태는 눈에 덜 띄게 둔다.
 */
export const USER_STATUS_BADGE_CLASS: Record<UserStatus, string> = {
  ACTIVE: "bg-category-green2 text-white",
  BLOCKED: "bg-brand-red text-white",
  WITHDRAWN: "bg-gray2 text-gray4",
};

/**
 * 탈퇴 회원의 이름 자리에 넣을 문구.
 *
 * 탈퇴 시 users.name 을 NULL 로 지우므로(soft delete + PII 삭제) 목록에 그릴
 * 이름이 없다. "알 수 없음"처럼 원인을 감추는 문구 대신 사실을 그대로 적는다 —
 * ArticleHeader 가 같은 자리에 쓰는 문구와 같아야 한다.
 */
export const WITHDRAWN_USER_NAME = "(탈퇴한 사용자)";
