// =============================================================
// API 응답 계약
//
// 서버(Route Handler)와 클라이언트 폼이 함께 보는 타입이라 여기 따로 둔다.
// handleError.ts 에 두면 클라이언트 컴포넌트가 next/server 를 끌어오게 된다.
//
// 이 모양은 백엔드가 Java 로 바뀌어도 유지된다 — 프론트가 안 바뀌는 지점.
// =============================================================

import type { Category, PageDetail, PageSummary, User } from "@/lib/types";

/** 실패 응답 바디. 4xx/5xx 는 전부 이 모양이다. */
export type ApiErrorBody = {
  /** 폼 단위로 보여줄 문구. 필드별 문구가 있으면 폼은 그쪽을 우선한다. */
  message: string;
  /** 필드명 → 문구. 검증/중복 실패에만 실린다. */
  fields?: Record<string, string>;
};

/**
 * 성공 응답은 배열이 아니라 이름 붙은 객체로 감싼다.
 * 나중에 메타(총건수 등)가 붙어도 클라이언트 파싱이 안 깨진다.
 */

/** GET /api/categories */
export type CategoryListBody = { categories: Category[] };

/** GET /api/pages?limit= — 최근 게시물. 페이지네이션이 없어 total 도 없다. */
export type RecentPageListBody = { pages: PageSummary[] };

/** GET /api/pages?category=&page=&size= */
export type CategoryPageListBody = {
  pages: PageSummary[];
  /** 조건에 맞는 전체 건수. 마지막 페이지 계산에 쓴다. */
  total: number;
  /** 서버가 실제로 적용한 값. 요청값이 접혔을 수 있어 그대로 되돌려준다. */
  page: number;
  size: number;
};

/** GET /api/pages/[id] — 상세. 여기서만 content(ProseMirror JSON)가 실린다. */
export type PageDetailBody = { page: PageDetail };

/** GET /api/auth/me — 현재 로그인한 사용자. */
export type CurrentUserBody = { user: User };

/**
 * POST /api/admin/pages — 발행 성공.
 *
 * 방금 만든 게시물을 통째로 돌려주지 않는다. 에디터가 성공 후에 하는 일은
 * `/pages/[id]` 로 이동하는 것뿐이라 필요한 값은 id 하나이고, 본문 JSON 을
 * 되돌려 보내는 것은 방금 올린 것을 그대로 다시 내려받는 낭비다.
 */
export type PageCreatedBody = { id: string };
