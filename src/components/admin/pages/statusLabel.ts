import type { PageStatus } from "@/lib/types";

/**
 * 상태의 표시명.
 *
 * **문구가 화면 쪽에 있는 것이 맞다.** validation/pageStatus 가 소유하는 문구는
 * 규칙을 어겼을 때의 **에러 메시지**이고(CLAUDE.md "에러 문구도 검증 모듈이
 * 소유한다"), 이건 정상 상태의 라벨이라 성격이 다르다. 검증 모듈에 넣으면
 * 순수 규칙 모듈이 UI 표기법을 알게 된다.
 *
 * Record<PageStatus, …> 로 못박아 둔 것이 요점이다. 상태가 하나 늘면 배지도
 * 필터 탭도 컴파일이 막혀서, 라벨 없는 상태가 화면에 원문(`DRAFT`)으로
 * 새어나가는 일이 구조적으로 불가능해진다.
 */
export const PAGE_STATUS_LABEL: Record<PageStatus, string> = {
  DRAFT: "임시저장",
  PUBLISHED: "공개",
  HIDDEN: "숨김",
};

/**
 * 상태 배지의 색.
 *
 * 공개(초록)와 비공개(회색·빨강)가 한눈에 갈리는 것이 이 화면의 목적이다 —
 * 운영자가 목록에서 가장 먼저 찾는 것은 "지금 안 보이는 글이 무엇인가"다.
 */
export const PAGE_STATUS_BADGE_CLASS: Record<PageStatus, string> = {
  DRAFT: "bg-gray2 text-gray4",
  PUBLISHED: "bg-category-green-light text-category-green-dark",
  HIDDEN: "bg-brand-red-pink text-brand-red",
};

/**
 * 상태 전환 버튼의 문구 — **목표 상태**로 키를 잡는다.
 *
 * `DRAFT → 게시하기` / `HIDDEN → 공개하기` 처럼 출발 상태별로 적지 않는 이유:
 * 그렇게 하면 (from, to) 쌍마다 문구가 생겨서 전환표(validation/pageStatus)의
 * 사본이 화면에 한 벌 더 만들어진다. 버튼이 약속하는 것은 "누르면 이 상태가
 * 된다"이므로 목표 하나로 충분하고, 발행이든 숨김 해제든 결과가 같으면 문구도
 * 같은 것이 정직하다.
 *
 * DRAFT 는 어느 전환의 목표도 아니지만(전환표에 들어가는 화살표가 없다) 라벨을
 * 비워 두지 않는다 — Record 를 빠짐없이 채워야 위 두 상수와 같은 보호가 걸린다.
 */
export const PAGE_STATUS_ACTION_LABEL: Record<PageStatus, string> = {
  DRAFT: "임시저장으로",
  PUBLISHED: "공개하기",
  HIDDEN: "숨기기",
};
