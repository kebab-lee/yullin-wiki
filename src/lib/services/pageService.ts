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
import * as pageRevisionRepository from "@/lib/repositories/pageRevisionRepository";
import type {
  Page,
  PageContent,
  PageDetail,
  PageStatus,
  PageSummary,
} from "@/lib/types";
import {
  CATEGORY_NOT_FOUND,
  parsePageForm,
  type ParsedPageForm,
} from "@/lib/validation/page";
import {
  canTransition,
  parseCreateStatus,
  parseStatusChange,
} from "@/lib/validation/pageStatus";
import { validateSearchQuery } from "@/lib/validation/search";

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
 * 임시저장(DRAFT)·숨김(HIDDEN)·삭제분(deleted_at)을 규칙 하나로 가른다. 공개가
 * 아닌 상태를 열거하지 않고 **공개인 상태만 통과시키는** 모양이라 상태가 늘어도
 * 이 함수는 안 바뀐다. 목록 쪽의 같은 조건은 publicPages(pageFilters)가 갖는다 —
 * 조건을 호출부마다 적으면 한쪽만 고쳐질 때 목록에는 안 뜨는 글이 상세에서는
 * 열린다.
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
 * 한 페이지의 크기·번호를 안전한 값으로 접는다.
 *
 * 전체 목록과 항목별 목록이 **같은 규칙을 쓴다.** 두 곳에 따로 적으면
 * 한쪽만 상한이 고쳐져서 같은 화면의 두 목록이 다르게 잘린다.
 */
function toPageWindow(pagination: { page?: number; size?: number }): {
  page: number;
  size: number;
} {
  return {
    page: positiveInt(pagination.page, 1),
    size: boundedSize(pagination.size, DEFAULT_PAGE_SIZE),
  };
}

/**
 * 공개 게시물 전체 목록 (`/pages`).
 *
 * 홈의 "최근 추가된 게시물 → 더보기"가 오는 곳이라 정렬은 listRecentPages 와
 * 같은 최신순이다. 다른 것은 페이지네이션이 붙는다는 점뿐이다 — 그래서 별도
 * 정렬 규칙을 두지 않는다.
 */
export async function listPages(
  pagination: { page?: number; size?: number } = {},
): Promise<{ items: PageSummary[]; total: number; page: number; size: number }> {
  const window = toPageWindow(pagination);
  const { items, total } = await pageRepository.findAllPaged(window);

  return { items, total, ...window };
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

  const window = toPageWindow(pagination);

  const { items, total } = await pageRepository.findByCategorySlug(slug, window);

  return { items, total, ...window };
}

/**
 * 게시물 검색 (`/search`).
 *
 * **권한 검증이 없다. assertRole 을 넣지 마라** — 검색은 비로그인 사용자도 쓰는
 * 공개 기능이고, 대상은 이미 공개 게시물뿐이다(DRAFT·삭제분은 질의에서 빠진다).
 * 여기에 역할 검사를 붙이면 홈 히어로의 검색창이 로그인 벽을 만나게 된다.
 *
 * **검색어가 규칙에 어긋나면 빈 결과가 아니라 ValidationError 다.** 빈 목록으로
 * 답하면 "그런 글이 없다"와 "그렇게는 검색할 수 없다"가 화면에서 같은 모양이 되고,
 * 사용자는 한 글자 더 쓰면 결과가 나온다는 사실을 알 수 없다. 필드명을 `q` 로
 * 두는 것은 쿼리스트링 이름과 같게 하기 위함이다 — 화면이 어느 입력 칸에 문구를
 * 붙일지 그대로 안다.
 *
 * 검색어를 여기서 trim 해서 repository 로 넘긴다. 앞뒤 공백은 트라이그램 집합을
 * 바꿔 유사도를 떨어뜨리는데, 그건 사용자가 의도한 검색어가 아니다.
 */
export async function searchPages(
  query: string,
  pagination: { page?: number; size?: number } = {},
): Promise<{
  items: PageSummary[];
  total: number;
  page: number;
  size: number;
  query: string;
}> {
  const keyword = query.trim();

  const result = validateSearchQuery(keyword);
  if (!result.valid) throw new ValidationError({ q: result.message });

  const window = toPageWindow(pagination);
  const { items, total } = await pageRepository.search(keyword, window);

  // 실제로 검색한 문자열을 되돌려준다. 화면 제목("검색어" 전체 검색 결과)이
  // 요청한 원문 대신 서버가 쓴 값을 그리도록 — 둘이 어긋나면 결과와 제목이
  // 다른 것을 가리킨다.
  return { items, total, ...window, query: keyword };
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
 * 존재하는 항목인가. 아니면 항목 칸에 문구가 붙는 400 이다.
 *
 * FK 위반(23503)으로 터뜨리지 않고 미리 짚는다 — 폼에 띄울 문구가 없는 실패이기
 * 때문이다. 작성·수정이 같은 규칙을 쓴다.
 */
async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await categoryRepository.findById(categoryId);
  if (!category) throw new ValidationError({ categoryId: CATEGORY_NOT_FOUND });
}

/**
 * 고치거나 지울 수 있는 게시물인가. 아니면 NotFoundError.
 *
 * 판정 기준이 isPublic 이 아니라 deletedAt 뿐인 것은 의도다 — 임시저장(DRAFT)은
 * "공개 화면에 안 보이는 글"이지 "고칠 수 없는 글"이 아니다. 지워진 글만
 * 대상에서 빠진다.
 *
 * 없는 글과 지워진 글을 404 하나로 답하는 것은 getPage 와 같은 이유다
 * (errors.ts: 삭제 여부가 상태 코드로 새어나가지 않게 한다).
 */
async function getEditablePage(id: string): Promise<PageDetail> {
  const page = await pageRepository.findById(id);
  if (!page || page.deletedAt !== null) throw new NotFoundError(NOT_FOUND_PAGE);
  return page;
}

/**
 * 수정 직전 상태를 page_revisions 에 남긴다.
 *
 * **실패하면 그대로 던진다 — 수정·삭제도 함께 실패한다.** 이 기록은 부가 로그가
 * 아니라 권한 모델의 한 축이다: 위키는 공동 편집이라 소유권으로 막지 않고
 * (EDITOR 이상은 남의 글도 고친다) 대신 "누가 언제 무엇을 덮어썼는가"로 추적성을
 * 확보하기로 했다. 기록이 조용히 빠지면 그 대가 없이 권한만 넓은 상태가 되고,
 * 더 나쁜 것은 **빠졌다는 사실조차 남지 않는다**는 점이다.
 *
 * 실패를 감수하는 비용도 작다. 이 호출은 pages 를 건드리기 **전**이라, 여기서
 * 던지면 아무것도 바뀌지 않은 상태로 끝난다(부분 성공이 없다). 사용자에게는
 * 500 과 함께 "다시 시도해주세요"가 가고, 다시 누르면 그만이다.
 */
async function snapshot(page: PageDetail, editedBy: string): Promise<void> {
  await pageRevisionRepository.create({
    pageId: page.id,
    title: page.title,
    content: page.content,
    editedBy,
  });
}

/** 검증을 통과한 폼 입력을 repository 가 받는 모양으로 옮긴다. */
function toPageData(parsed: ParsedPageForm) {
  return {
    categoryId: parsed.categoryId,
    title: parsed.title,
    content: parsed.content,
    plainText: extractPlainText(parsed.content),
    tags: parsed.tags,
  };
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
 * **"게시하기"와 "임시저장"이 같은 함수로 온다.** 클라이언트가 보내는 것은
 * 상태값이 아니라 어느 버튼을 눌렀는가(DRAFT / PUBLISHED)이고, 그것이 무엇을
 * 뜻하는지는 여기서 정한다 — 발행 시각을 찍을지 말지, 무엇이 공개인지는 계속
 * 서버의 규칙이다. HIDDEN 은 애초에 파싱에서 걸러진다(발행된 적 없는 글은
 * 감출 수 없다 — validation/pageStatus 의 전환표와 같은 근거).
 */
export async function createPage(
  session: SessionPayload | null,
  input: unknown,
): Promise<Page> {
  assertRole(session, "EDITOR");

  const parsed = parsePageForm(input);
  if (!parsed.ok) throw new ValidationError(parsed.errors);

  await assertCategoryExists(parsed.value.categoryId);

  const status = parseCreateStatus(input);

  return pageRepository.create({
    ...toPageData(parsed.value),
    // **작성자는 입력이 아니라 세션에서 온다.** 클라이언트가 보낸 작성자 값은
    // 신뢰하지 않는다 — 받으면 남의 이름으로 글을 쓸 수 있다.
    authorId: session.userId,
    status,
    // 초안은 아직 발행되지 않았으므로 발행 시각이 없다. 나중에 publishPage 가
    // 그때의 시각을 찍는다 (pages_published_at_chk 가 이 짝을 보증한다).
    publishedAt: status === "PUBLISHED" ? new Date().toISOString() : null,
  });
}

// ── 수정 · 삭제 ───────────────────────────────────────────────
// **소유권을 보지 않는다.** authorId 를 세션과 대조하는 코드는 이 아래 어디에도
// 없어야 한다. 위키는 공동 편집이 전제라 "내 글"이라는 개념을 두지 않고,
// EDITOR 이상이면 누가 쓴 글이든 고치고 지운다.
//
// 그 대신 값을 치른다: 모든 수정·삭제는 직전 상태를 page_revisions 에 남긴다.
// 막지 않는 대신 남긴다 — 이게 이 두 함수의 설계 전체다.

/**
 * 게시물을 고친다.
 *
 * 순서에 규칙이 있다.
 *   ① assertRole   — 첫 줄. 권한 없는 요청에 "제목이 비었습니다"가 나가면
 *                    그것만으로 어드민 API 의 계약이 새어나간다 (createPage 와 동일).
 *   ② 대상 확인     — 없거나 지워진 글이면 404.
 *   ③ 검증          — 작성과 **같은 규칙**(parsePageForm)이다. 두 벌로 짜지 않는다.
 *   ④ 스냅샷        — 수정 "전" 상태를 기록. 실패하면 여기서 끝난다(아래 설명).
 *   ⑤ repository    — 실제 수정.
 *
 * **④를 ③ 뒤에 둔 것은 의도적인 순서다.** "조회 → 기록 → 검증"으로 두면 형식이
 * 틀려 400 으로 되돌아갈 요청까지 리비전을 한 줄씩 남긴다. 바뀐 것이 없는데
 * 스냅샷만 쌓이면 이력이 "무엇이 실제로 바뀌었는가"를 더 이상 답하지 못한다.
 * 기록의 정본은 여전히 **수정 전 상태**이며(②에서 뜬 값), 실제 수정보다 앞선다.
 */
export async function updatePage(
  session: SessionPayload | null,
  id: string,
  input: unknown,
): Promise<Page> {
  assertRole(session, "EDITOR");

  const existing = await getEditablePage(id);

  const parsed = parsePageForm(input);
  if (!parsed.ok) throw new ValidationError(parsed.errors);

  await assertCategoryExists(parsed.value.categoryId);

  // 고친 사람은 원래 작성자가 아니라 지금 요청한 사람이다.
  await snapshot(existing, session.userId);

  return pageRepository.update(id, toPageData(parsed.value));
}

/**
 * 게시물을 지운다 — soft delete 다 (CLAUDE.md: hard delete 금지).
 *
 * **삭제도 스냅샷을 남긴다.** 행 자체는 남지만 그건 "지워졌다"는 표시가 붙은
 * 현재 상태일 뿐이고, 이력이 답해야 하는 질문은 "누가 언제 이 글을 없앴는가"다.
 * 삭제만 기록에서 빠지면 가장 되돌리기 어려운 변경이 가장 안 남는다.
 *
 * 입력이 id 하나뿐이라 검증할 폼이 없다. 대상 확인이 그 자리를 대신한다.
 */
export async function deletePage(
  session: SessionPayload | null,
  id: string,
): Promise<void> {
  assertRole(session, "EDITOR");

  const existing = await getEditablePage(id);

  await snapshot(existing, session.userId);

  await pageRepository.softDelete(id);
}

// ── 상태 전환 ─────────────────────────────────────────────────
// 발행 · 숨김 · 숨김 해제. 셋 다 본문을 건드리지 않고 status 한 칸만 옮긴다.
//
// **허용 여부를 if 로 적지 않는다.** 규칙은 validation/pageStatus 의 전환표가
// 갖고 있고 아래 함수들은 그것을 참조만 한다. 상태가 하나 더 늘 때 고칠 곳이
// 표 하나로 유지되고, Java 이관 시에도 표가 그대로 옮겨진다.
//
// **page_revisions 에 남기지 않는다.** 그 테이블이 담는 것은 (title, content) —
// 본문의 한 판이다. 상태만 바꾼 요청까지 스냅샷을 뜨면 직전 것과 한 글자도
// 다르지 않은 행이 쌓여, 이력이 "무엇이 실제로 바뀌었는가"에 답하지 못하게
// 된다(updatePage 가 검증 뒤에 스냅샷을 두는 것과 같은 이유다). 상태 변경의
// 추적성은 "누가 언제 감췄는가"를 담는 별도 감사 로그의 일이며, 지금은 pages
// 행이 현재 상태와 updated_at 까지만 답한다.

/**
 * 목표 상태로 옮긴다. 세 공개 함수가 공유하는 몸통이다.
 *
 * 순서는 updatePage 와 같다: 권한 → 대상 확인 → 규칙 검증 → repository.
 * 지워진 글은 getEditablePage 가 404 로 막는다 — 삭제는 상태 축이 아니므로
 * 전환표가 답할 질문이 아니다.
 *
 * 실패를 ValidationError 로 던지는 이유: 바디의 `status` 값이 지금 상태에 대해
 * 잘못되었다는 뜻이라 폼(또는 버튼)이 붙일 자리가 있다. 필드명을 `status` 로
 * 두어 요청 바디의 키와 같게 한다.
 */
async function transition(
  session: SessionPayload | null,
  id: string,
  to: PageStatus,
): Promise<Page> {
  assertRole(session, "EDITOR");

  const existing = await getEditablePage(id);

  const allowed = canTransition(existing.status, to);
  if (!allowed.valid) throw new ValidationError({ status: allowed.message });

  // 발행 시각은 **처음 발행할 때 한 번만** 찍는다. 숨김·숨김 해제는 null 을
  // 넘겨 컬럼을 건드리지 않는다 — 해제할 때마다 now() 를 찍으면 감췄다 되살린
  // 글이 새 글인 척 목록 맨 위로 올라온다.
  const publishedAt =
    to === "PUBLISHED" && existing.publishedAt === null
      ? new Date().toISOString()
      : null;

  return pageRepository.updateStatus(id, to, publishedAt);
}

/** DRAFT → PUBLISHED. 초안을 내보낸다. */
export async function publishPage(
  session: SessionPayload | null,
  id: string,
): Promise<Page> {
  return transition(session, id, "PUBLISHED");
}

/** PUBLISHED → HIDDEN. 공개 노출에서만 뺀다. 어드민 목록에는 남는다. */
export async function hidePage(
  session: SessionPayload | null,
  id: string,
): Promise<Page> {
  return transition(session, id, "HIDDEN");
}

/** HIDDEN → PUBLISHED. 원래 발행 시각 그대로 제자리에 돌아온다. */
export async function unhidePage(
  session: SessionPayload | null,
  id: string,
): Promise<Page> {
  return transition(session, id, "PUBLISHED");
}

/**
 * `PATCH /api/admin/pages/[id]/status` 가 부르는 하나의 문.
 *
 * 라우트가 현재 상태를 몰라도 되도록 여기서 갈라 준다. 목표가 PUBLISHED 라는
 * 사실 하나로는 발행(DRAFT→)인지 숨김 해제(HIDDEN→)인지 알 수 없는데, 그 판단에
 * 필요한 것은 지금 상태이고 그건 DB 를 봐야 안다 — 라우트가 미리 조회해서
 * 고르게 만들면 비즈니스 규칙이 HTTP 레이어로 샌다.
 *
 * publishPage / hidePage / unhidePage 를 따로 남겨 두는 이유는 어드민 목록 UI 가
 * 곧 이름으로 부를 동작들이기 때문이다(버튼 하나에 함수 하나).
 */
export async function changePageStatus(
  session: SessionPayload | null,
  id: string,
  input: unknown,
): Promise<Page> {
  // transition 도 첫 줄에서 같은 검사를 하지만, 바디를 좁히기 **전에** 한 번 더
  // 둔다. 권한 없는 요청에 "알 수 없는 상태입니다"가 나가면 그것만으로 어떤
  // 값을 받는 API 인지가 새어나간다 (createPage 와 같은 규칙).
  assertRole(session, "EDITOR");

  const parsed = parseStatusChange(input);
  if (!parsed.ok) throw new ValidationError({ status: parsed.message });

  return transition(session, id, parsed.status);
}
