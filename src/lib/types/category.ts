// =============================================================
// categories 도메인 모델
//
// DB 컬럼(snake_case)은 repository에서 이 camelCase 모델로 변환해 반환한다.
// 프론트는 이 모양만 알고, Java 백엔드가 같은 JSON을 내려주면 무변경으로 붙는다.
// =============================================================

export interface Category {
  id: string;

  /**
   * URL(/categories/[slug])과 코드 분기용 불변 식별자.
   * 표시명이 바뀌어도 유지된다. 분기 조건에 표시명(name/fullName)을 쓰지 않는다.
   */
  slug: string;

  /** 짧은 형 (`공간` / `섬김` / `열청`) — 홈 카테고리 버튼, 태그 배지, 사이드 카테고리, 목록, 에디터 */
  name: string;

  /** 긴 형 (`열린교회 속 공간` …) — Footer 카테고리 목록 전용 */
  fullName: string;

  /** 이모지 문자 그대로 (`⛪️` / `🤲` / `🌱`) */
  icon: string;

  sortOrder: number;
}
