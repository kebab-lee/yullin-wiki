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

/**
 * 어드민 항목 관리 목록의 한 줄. Category + 문서 수.
 *
 * **공개 Category 에 pageCount 를 얹지 않고 타입을 나눈다.** 홈 버튼·푸터·
 * 에디터 셀렉트는 이 수를 그리지 않는데, 한 타입으로 합치면 공개 응답
 * (GET /api/categories)에도 이 칸이 생기고 그 값을 채우려고 매 요청마다
 * 카운트 질의가 따라붙는다 (AdminUserSummary 를 User 에서 나눈 것과 같은 결).
 *
 * **삭제 가능 여부를 미리 알려 주는 것이 이 필드의 존재 이유다.** 항목 삭제는
 * 문서가 한 건이라도 있으면 거부되는데(categoryService.deleteCategory), 그
 * 사실을 눌러 봐야 알 수 있으면 화면이 사용자에게 "해보고 실패하라"고 시키는
 * 셈이다.
 */
export interface AdminCategorySummary extends Category {
  /**
   * 이 항목을 참조하는 pages 행의 수.
   *
   * **삭제된 문서(deleted_at)도 센다.** 화면에 안 보이는 글까지 세는 것이
   * 어색해 보이지만, 이 수가 답해야 하는 질문은 "몇 건이 보이는가"가 아니라
   * **"이 항목을 지울 수 있는가"** 다. FK 가 `on delete restrict` 라 소프트
   * 삭제된 행도 그대로 삭제를 막으므로, 여기서 걸러 세면 "0건이라 지울 수
   * 있다"고 그려 놓고 실제 삭제는 FK 위반으로 터진다.
   */
  pageCount: number;
}
