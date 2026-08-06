// =============================================================
// 게시물 서비스 — 공개 조회
//
// "이 게시물을 공개 화면에 보여줘도 되는가"라는 규칙이 사는 곳이다.
// RLS 로 내리지 않는다 — RLS 는 Supabase 전용이라 Java 로 옮길 때 사라진다
// (CLAUDE.md "권한"). 이 파일의 판정은 Spring 서비스로 그대로 이식된다.
//
// HTTP 를 모른다. 실패는 상태 코드가 아니라 도메인 에러(NotFoundError)로 던지고
// Route Handler 가 404 로 옮긴다.
// =============================================================

import { assertRole } from "@/lib/auth/guards";
import type { SessionPayload } from "@/lib/auth/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import * as categoryRepository from "@/lib/repositories/categoryRepository";
import * as pageRepository from "@/lib/repositories/pageRepository";
import type { Page, PageContent, PageDetail, PageSummary } from "@/lib/types";
import { CATEGORY_NOT_FOUND, parseNewPage } from "@/lib/validation/page";

/** 홈 "최근 추가된 게시물" 카드 수. Figma 1:380 기준 3장. */
const DEFAULT_RECENT_LIMIT = 3;

/** 한 번에 실어 나를 수 있는 최대 건수. 임의로 큰 limit 을 막는다. */
const MAX_LIMIT = 50;

/** 카테고리 목록 한 페이지의 기본 건수. */
const DEFAULT_PAGE_SIZE = 10;

const NOT_FOUND_CATEGORY = "존재하지 않는 항목입니다.";
const NOT_FOUND_PAGE = "게시물을 찾을 수 없습니다.";

/**
 * 공개 화면에 노출해도 되는 게시물인가.
 *
 * 임시저장(DRAFT)과 삭제분(deleted_at)을 같은 규칙 하나로 가른다. 호출부마다
 * 조건을 적으면 한쪽만 고쳐질 때 목록에는 안 뜨는 글이 상세에서는 열린다.
 */
function isPublic(page: PageDetail): boolean {
  return page.status === "PUBLISHED" && page.deletedAt === null;
}

/**
 * 1 이상의 정수로 다듬는다.
 *
 * 범위를 벗어난 값을 ValidationError 로 던지지 않는 이유: 목록 개수·페이지 번호는
 * 사용자가 채운 입력 칸이 아니라 화면이 붙이는 파라미터라, 틀렸을 때 폼에 문구를
 * 띄울 대상이 없다. 조용히 안전한 값으로 접는 편이 화면을 깨뜨리지 않는다.
 */
function positiveInt(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(Math.trunc(value), 1);
}

/**
 * 한 번에 실어 나를 건수. 위로 MAX_LIMIT 에서 막는다.
 * 페이지 "번호"에는 쓰지 않는다 — 51페이지가 막히면 안 된다.
 */
function boundedSize(value: number | undefined, fallback: number): number {
  return Math.min(positiveInt(value, fallback), MAX_LIMIT);
}

/** 홈에 올릴 최근 공개 게시물. */
export async function listRecentPages(limit?: number): Promise<PageSummary[]> {
  return pageRepository.findRecent(boundedSize(limit, DEFAULT_RECENT_LIMIT));
}

/**
 * 카테고리 한 항목의 공개 게시물 목록.
 *
 * 없는 slug 는 빈 목록이 아니라 NotFoundError 다 — 오타 난 URL 이 "글이 아직
 * 없는 항목" 처럼 보이면 사용자가 계속 기다린다. 존재 확인을 목록 쿼리에
 * 맡길 수 없어서(빈 결과는 두 경우에 모두 나온다) 카테고리를 따로 짚는다.
 */
export async function listPagesByCategory(
  slug: string,
  pagination: { page?: number; size?: number } = {},
): Promise<{ items: PageSummary[]; total: number; page: number; size: number }> {
  const category = await categoryRepository.findBySlug(slug);
  if (!category) throw new NotFoundError(NOT_FOUND_CATEGORY);

  const page = positiveInt(pagination.page, 1);
  const size = boundedSize(pagination.size, DEFAULT_PAGE_SIZE);

  const { items, total } = await pageRepository.findByCategorySlug(slug, {
    page,
    size,
  });

  return { items, total, page, size };
}

/**
 * 게시물 한 건. 공개 대상이 아니면 없는 것과 똑같이 404 다.
 *
 * "임시저장이라 못 본다"고 알려주면 비공개 게시물의 존재가 새어나간다.
 */
export async function getPage(id: string): Promise<PageDetail> {
  const page = await pageRepository.findById(id);
  if (!page || !isPublic(page)) throw new NotFoundError(NOT_FOUND_PAGE);
  return page;
}

// ── 작성 ──────────────────────────────────────────────────────
/**
 * ProseMirror 노드의 최소 형태. 필요한 필드만 좁게 선언하고 밖으로 내보내지
 * 않는다 — PageContent 의 불투명함을 깨지 않으면서 `any` 도 쓰지 않기 위한 장치다.
 * (toc.ts 가 같은 이유로 같은 모양을 갖고 있다)
 */
type JsonNode = {
  type?: string;
  content?: JsonNode[];
  text?: string;
};

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null;
}

/**
 * 본문에서 텍스트만 뽑아 검색용 사본(pages.plain_text)을 만든다.
 *
 * **Tiptap 의존 없이 구현한다.** ProseMirror JSON 트리를 훑어 text 노드의 text 만
 * 모으는 순수 함수이며, DB 함수로 만들지 않는다 — 이 규칙은 Java 이관 시 그대로
 * 옮겨져야 한다 (CLAUDE.md "에디터 / 본문 포맷").
 *
 * 블록 사이는 공백으로 잇는다. 그냥 이어붙이면 문단 끝 단어와 다음 문단 첫
 * 단어가 한 낱말로 붙어 trigram 검색에 없는 토큰이 생긴다.
 */
function extractPlainText(content: PageContent): string {
  const collect = (nodes: readonly unknown[]): string[] =>
    nodes.filter(isJsonNode).flatMap((node) => {
      if (typeof node.text === "string") return [node.text];
      return node.content ? collect(node.content) : [];
    });

  return collect(content.content ?? [])
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 새 게시물을 발행한다.
 *
 * **권한 검증이 첫 줄이다.** 검증 전에는 아무것도 하지 않는다 — 파싱조차 하지
 * 않는다. 권한 없는 요청에 대해 "제목이 비었습니다" 같은 응답이 나가면 그것만으로
 * 어드민 API 의 계약이 새어나간다. 판정은 여기 있고 middleware 나 route handler 에
 * 두지 않는다 (CLAUDE.md "권한") — 이 줄이 Spring 의 @PreAuthorize 로 그대로 간다.
 *
 * 작성 권한은 EDITOR 다. ADMIN 은 hasRole 의 계층 비교로 자연히 통과한다.
 *
 * 임시저장은 이번 범위가 아니므로 PUBLISHED 로 고정한다. status 를 입력에서
 * 받지 않는 것은 의도다 — 클라이언트가 상태를 정하게 두면 "무엇이 공개인가"라는
 * 규칙이 폼으로 내려간다.
 */
export async function createPage(
  session: SessionPayload | null,
  input: unknown,
): Promise<Page> {
  assertRole(session, "EDITOR");

  const parsed = parseNewPage(input);
  if (!parsed.ok) throw new ValidationError(parsed.errors);

  // FK 위반으로 터뜨리지 않고 미리 짚는다. 23503 은 폼에 띄울 문구가 없는 실패다.
  const category = await categoryRepository.findById(parsed.value.categoryId);
  if (!category) throw new ValidationError({ categoryId: CATEGORY_NOT_FOUND });

  return pageRepository.create({
    categoryId: parsed.value.categoryId,
    // **작성자는 입력이 아니라 세션에서 온다.** 클라이언트가 보낸 작성자 값은
    // 신뢰하지 않는다 — 받으면 남의 이름으로 글을 쓸 수 있다.
    authorId: session.userId,
    title: parsed.value.title,
    content: parsed.value.content,
    plainText: extractPlainText(parsed.value.content),
    status: "PUBLISHED",
    publishedAt: new Date().toISOString(),
    tags: parsed.value.tags,
  });
}
