// =============================================================
// pages 도메인 모델
//
// DB 컬럼(snake_case) → camelCase 변환은 repository의 책임이다.
// pages.search_text는 generated column이라 DB 내부 검색용이며 도메인에 노출하지 않는다.
// =============================================================

/** pages.status — varchar + CHECK. Java에서는 @Enumerated(EnumType.STRING). */
export type PageStatus = "DRAFT" | "PUBLISHED";

/**
 * Tiptap이 내보내는 ProseMirror 문서 JSON.
 *
 * 의도적으로 불투명하게 둔다. UI 렌더러와 plain_text 추출기 외에는
 * 내부 구조를 들여다보지 않는다. (에디터 종속을 여기서 끊는다)
 */
export interface PageContent {
  readonly type: "doc";
  readonly content?: readonly unknown[];
}

export interface Page {
  id: string;
  categoryId: string;
  authorId: string;

  title: string;
  content: PageContent;

  /** content에서 텍스트만 추출한 검색용 사본. service 레이어의 순수 함수가 채운다. */
  plainText: string;

  status: PageStatus;

  /** ISO 8601 문자열. status가 PUBLISHED면 항상 값이 있다. */
  publishedAt: string | null;

  createdAt: string;
  updatedAt: string;

  /** soft delete 시각. null이면 살아 있는 게시물. */
  deletedAt: string | null;
}

/**
 * 목록·홈 카드용 요약 모델.
 *
 * 카드는 본문 JSON 전체가 아니라 잘라낸 미리보기 텍스트와 태그 이름만 필요하다.
 * 카드 하나 그리자고 content(jsonb) 전체를 내려보내지 않기 위해 Page와 분리한다.
 */
export interface PagePreview {
  id: string;
  title: string;

  /** 태그 이름 목록 (tags.name) */
  tags: string[];

  /** plainText를 잘라낸 미리보기 문자열. Page.content(ProseMirror JSON)와 다르다. */
  content: string;

  commentCount: number;
}
