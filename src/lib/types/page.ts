// =============================================================
// pages 도메인 모델
//
// DB 컬럼(snake_case) → camelCase 변환은 repository의 책임이다.
// 검색은 title / plain_text 각각의 트라이그램 인덱스를 쓴다. 둘을 합쳐 두었던
// generated column(search_text)은 제목 가중치를 줄 수 없어 제거했다
// (supabase/migrations/20260807000000_search_pages.sql).
// =============================================================

/**
 * pages.status — varchar + CHECK. Java에서는 @Enumerated(EnumType.STRING).
 *
 *   DRAFT      작성 중. 아직 발행 전. 공개 화면에 뜨지 않는다.
 *   PUBLISHED  발행됨. 공개 목록·검색·상세에 노출된다.
 *   HIDDEN     발행됐으나 운영상 감춤. 공개 노출에서만 빠지고 어드민에는 보인다.
 *
 * **삭제는 이 축에 없다.** 지워진 게시물은 deletedAt 이 답한다 — status 는 상태,
 * deletedAt 은 시각 기록이라 성격이 다르고, "언제 지웠나"를 status 로는 적을 수
 * 없다 (users 의 WITHDRAWN + deletedAt 과 같은 규칙).
 *
 * 값 사이의 이동 규칙은 여기가 아니라 validation/pageStatus.ts 의 전환표가 갖는다.
 */
export type PageStatus = "DRAFT" | "PUBLISHED" | "HIDDEN";

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
 * 게시물 한 건을 새로 만들 때 repository 가 받는 값.
 *
 * Page 에서 DB 가 채우는 것(id · created_at · updated_at · deleted_at)을 뺀 모양이다.
 * Partial<Page> 로 두지 않는 이유는 "무엇을 반드시 줘야 하는가"가 타입으로
 * 드러나야 하기 때문이다 — 특히 authorId 는 service 가 세션에서 채우는 값이고,
 * 빠뜨리면 컴파일이 막혀야 한다.
 *
 * tags 는 pages 컬럼이 아니라 tags / page_tags 두 테이블이다. 그래도 도메인에서는
 * "게시물이 태그를 가진다"가 사실이므로 여기 함께 둔다 — 그 사실을 몇 개의
 * INSERT 로 옮기느냐는 repository 의 사정이다.
 *
 * content 의 타입은 도메인 정본인 PageContent 다. Tiptap 의 JSONContent 를 여기
 * 쓰면 에디터 의존이 도메인 모델 전체로 새어나간다(CLAUDE.md "도메인 타입에서는
 * PageContent 라는 불투명 타입으로 감싸 둔다"). JSONContent 는 밖에서 들어온
 * unknown 을 PageContent 로 좁히는 지점(validation/page.ts)에서만 쓴다.
 */
export interface CreatePageData {
  categoryId: string;
  authorId: string;

  title: string;
  content: PageContent;
  plainText: string;

  status: PageStatus;

  /**
   * status 가 PUBLISHED 면 반드시 값이 있어야 한다 (pages_published_at_chk).
   * 그 규칙을 repository 가 몰래 채우지 않고 service 가 명시적으로 넘긴다 —
   * "언제 공개되었는가"는 DB 사정이 아니라 업무 규칙이다.
   */
  publishedAt: string | null;

  /** 태그 이름. 중복 없이 정리된 상태로 온다고 가정한다 (validation 이 보장). */
  tags: readonly string[];
}

/**
 * 게시물 한 건을 고칠 때 repository 가 받는 값.
 *
 * CreatePageData 에서 **바뀔 수 없는 것**을 뺀 모양이다.
 *   authorId  — 최초 작성자는 수정으로 바뀌지 않는다. "누가 고쳤는가"는
 *               pages 가 아니라 page_revisions 가 답한다.
 *   status / publishedAt — 임시저장이 범위 밖이라 상태 전이가 없다. 여기에
 *               두면 "공개 여부를 수정 폼이 정한다"는 규칙이 생겨 버린다.
 *
 * Partial<Page> 로 두지 않는 이유는 create 와 같다 — 무엇을 반드시 줘야 하는지가
 * 타입으로 드러나야 하고, 부분 갱신은 "안 보낸 필드는 그대로"라는 규칙을 새로
 * 만들어 클라이언트가 저장 규칙을 알게 된다.
 */
export interface UpdatePageData {
  categoryId: string;

  title: string;
  content: PageContent;
  plainText: string;

  /** 태그 이름. 중복 없이 정리된 상태로 온다고 가정한다 (validation 이 보장). */
  tags: readonly string[];
}

/**
 * 상세 화면용 모델 — 게시물 본문 + 화면이 요구하는 주변 정보.
 *
 * Page 를 그대로 쓰지 않는 이유: 상세 헤더(Figma 1:1399)는 태그·작성자·댓글 수를
 * 함께 그리는데 이들은 pages 행에 없다(page_tags / users / comments). 화면이
 * 이것들을 각각 따로 요청하면 왕복이 네 번이 되고, 그때마다 클라이언트가
 * "게시물 하나를 그리려면 무엇을 조합해야 하는가"를 알아야 한다. 조합은
 * 서버가 끝내고 프론트는 완성된 한 덩어리만 받는다.
 *
 * Java 백엔드가 같은 JSON 을 내려주면 프론트는 무변경이다.
 */
export interface PageDetail extends Page {
  /** 태그 이름 목록 (tags.name) */
  tags: string[];

  /**
   * 작성자 표시명. 탈퇴 회원은 users.name 이 NULL 이 되므로 null 일 수 있다.
   * "탈퇴한 사용자" 같은 대체 문구는 화면의 몫이지 도메인의 몫이 아니다.
   */
  authorName: string | null;

  /** 보이는 댓글 수 (status = 'VISIBLE'). 댓글 목록은 다음 슬라이스다. */
  commentCount: number;
}

/**
 * 어드민 위키 관리 목록(`/admin/pages`)의 한 줄.
 *
 * **PageSummary 와 나눠 두는 것이 핵심이다.** 두 목록은 답하는 질문이 다르다:
 * 공개 목록은 "이 글이 무슨 내용인가"(excerpt · tags · commentCount)를 그리고,
 * 어드민 목록은 "이 글이 지금 어떤 상태이고 누가 언제 건드렸는가"(status ·
 * authorName · createdAt · updatedAt)를 그린다. 한 타입에 합치면 어느 화면도
 * 쓰지 않는 필드가 양쪽 응답에 실리고, 특히 **status 가 공개 응답에 새어나간다** —
 * 공개 목록은 정의상 PUBLISHED 뿐이라 그 필드가 항상 같은 값인 죽은 계약이 된다.
 *
 * excerpt 가 없다. 관리 목록은 본문을 읽는 화면이 아니라 고르는 화면이라
 * plain_text 를 실어 나를 이유가 없다.
 */
export interface AdminPageSummary {
  id: string;
  title: string;

  /** 표시명이 아니라 불변 식별자. 배지 문구는 categories 응답과 맞춰 화면이 만든다. */
  categoryId: string;

  status: PageStatus;

  /** 작성자 표시명. 탈퇴 회원은 users.name 이 NULL 이라 null 일 수 있다. */
  authorName: string | null;

  /** ISO 8601. 작성일은 publishedAt 이 아니라 createdAt 이다 — 초안은 발행된 적이 없다. */
  createdAt: string;
  updatedAt: string;
}

/**
 * 목록·홈 카드용 요약 모델.
 *
 * 카드는 본문 JSON 전체가 아니라 잘라낸 미리보기 텍스트와 태그 이름만 필요하다.
 * 카드 하나 그리자고 content(jsonb) 전체를 내려보내지 않기 위해 Page와 분리한다.
 * **content 필드가 없는 것이 이 타입의 존재 이유다** — 목록 응답에 ProseMirror
 * JSON 이 실리지 않는다는 계약을 타입으로 못박는다.
 */
export interface PageSummary {
  id: string;
  title: string;

  /** 카테고리 링크·배지용. 표시명이 아니라 불변 식별자를 싣는다. */
  categoryId: string;

  /** 태그 이름 목록 (tags.name) */
  tags: string[];

  /** plainText를 잘라낸 미리보기 문자열. Page.content(ProseMirror JSON)와 다르다. */
  excerpt: string;

  /** 보이는 댓글 수 (status = 'VISIBLE') */
  commentCount: number;

  /** ISO 8601. 공개 목록에 오르는 게시물은 항상 값이 있다. */
  publishedAt: string | null;
}
