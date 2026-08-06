// =============================================================
// pages 테이블 접근
//
// DB row(snake_case)를 도메인 모델(Page / PageSummary, camelCase)로 옮기는 것이
// 이 레이어의 책임이다. PostgREST 임베디드 조회의 중첩 모양
// (`page_tags: [{ tags: { name } }]`, `comments: [{ count }]`)도 여기서 평평하게
// 편다 — 그 모양이 위로 새면 Java 백엔드로 갈아끼울 때 프론트까지 흔들린다.
//
// 목록 함수는 content(jsonb)를 select 하지 않는다. 카드 하나 그리자고 본문
// ProseMirror JSON 을 통째로 실어 나르지 않기 위해서다. 본문은 findById 에만
// 실린다.
// =============================================================

import type {
  CreatePageData,
  Page,
  PageContent,
  PageDetail,
  PageStatus,
  PageSummary,
  UpdatePageData,
} from "@/lib/types";

import { getSupabase } from "./supabaseClient";

const TABLE = "pages";
const TAG_TABLE = "tags";
const PAGE_TAG_TABLE = "page_tags";

/**
 * 목록용 select. content 가 빠져 있는 것이 핵심이다.
 *
 *   page_tags(tags(name))  태그 이름만. 카드 배지에 쓴다.
 *   comments(count)        댓글 수. 아래 VISIBLE 필터와 짝이다.
 */
const SUMMARY_COLUMNS =
  "id, title, category_id, plain_text, published_at, page_tags(tags(name)), comments(count)";

/**
 * 상세용 select. 여기서만 content 를 싣는다.
 *
 * 태그·작성자명·댓글 수를 한 왕복에 같이 받는다. 화면이 이 넷을 함께 그리므로
 * 나눠 받을 이유가 없고, 나누면 상세 한 건에 쿼리가 넷이 된다.
 */
const PAGE_COLUMNS =
  "id, category_id, author_id, title, content, plain_text, status, published_at, created_at, updated_at, deleted_at, page_tags(tags(name)), comments(count), author:users(name)";

/**
 * pages 행 자체의 컬럼. 임베디드 조회가 붙지 않은 판이다.
 *
 * insert 직후 돌려받을 때 쓴다 — 방금 만든 행에 붙일 태그·댓글은 아직 없거나
 * (page_tags) 있을 수 없다(comments). 없는 것을 조인해서 빈 배열을 받아올 이유가 없다.
 */
const PAGE_CORE_COLUMNS =
  "id, category_id, author_id, title, content, plain_text, status, published_at, created_at, updated_at, deleted_at";

/** 카드 미리보기 길이. 넘으면 잘라내고 말줄임표를 붙인다. */
const EXCERPT_LENGTH = 120;

/**
 * Postgres invalid_text_representation. uuid 컬럼에 uuid 가 아닌 문자열을
 * 비교하면 온다 (`/api/pages/abc` 같은 URL). 드라이버 사정이므로 여기서 끝내고
 * "그런 행이 없다"(null)로 올린다.
 */
const PG_INVALID_TEXT_REPRESENTATION = "22P02";

// ── row 타입 ──────────────────────────────────────────────────
/**
 * 임베디드 조회 결과. 배열로 오는 것은 PostgREST 사정이지 도메인 사정이 아니다.
 * tags 가 nullable 인 이유도 같다 — 조인 대상이 없을 수 있다는 드라이버 표현이다.
 */
type TagLinkRows = { tags: { name: string } | null }[] | null;
type CommentCountRows = { count: number }[] | null;

/** pages 행 그대로. 임베디드 조회가 붙기 전의 모양이다. */
type PageCoreRow = {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  content: PageContent;
  plain_text: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type PageRow = PageCoreRow & {
  page_tags: TagLinkRows;
  comments: CommentCountRows;
  // author_id 는 NOT NULL 이고 FK 가 걸려 있어 행은 반드시 있다. name 만 nullable
  // 이다(탈퇴 시 NULL). 그래도 드라이버가 null 을 줄 여지를 타입에 남겨 둔다.
  author: { name: string | null } | null;
};

type PageSummaryRow = {
  id: string;
  title: string;
  category_id: string;
  plain_text: string;
  published_at: string | null;
  page_tags: TagLinkRows;
  comments: CommentCountRows;
};

// ── 변환 ──────────────────────────────────────────────────────
function toExcerpt(plainText: string): string {
  const text = plainText.trim();
  if (text.length <= EXCERPT_LENGTH) return text;
  return `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

/** page_tags(tags(name)) 의 중첩·nullable 을 평평한 이름 배열로 편다. */
function toTagNames(rows: TagLinkRows): string[] {
  return (rows ?? [])
    .map((link) => link.tags?.name)
    .filter((name): name is string => Boolean(name));
}

/** 임베디드 aggregate 는 항상 한 줄로 온다. 없으면 0 으로 읽는다. */
function toCommentCount(rows: CommentCountRows): number {
  return rows?.[0]?.count ?? 0;
}

function toPageCore(row: PageCoreRow): Page {
  return {
    id: row.id,
    categoryId: row.category_id,
    authorId: row.author_id,
    title: row.title,
    content: row.content,
    plainText: row.plain_text,
    // varchar + CHECK 제약이 값을 보증한다. 도메인 유니온으로 좁혀서 올린다.
    status: row.status as PageStatus,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toPage(row: PageRow): PageDetail {
  return {
    ...toPageCore(row),
    tags: toTagNames(row.page_tags),
    authorName: row.author?.name ?? null,
    commentCount: toCommentCount(row.comments),
  };
}

function toSummary(row: PageSummaryRow): PageSummary {
  return {
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    tags: toTagNames(row.page_tags),
    excerpt: toExcerpt(row.plain_text),
    commentCount: toCommentCount(row.comments),
    publishedAt: row.published_at,
  };
}

// ── 조회 ──────────────────────────────────────────────────────
/**
 * 공개된 최근 게시물. 홈 "최근 추가된 게시물" 이 쓴다.
 *
 * 공개 여부(PUBLISHED · 미삭제) 필터를 SQL 에 두는 이유는 목록에서는 그것이
 * 정렬·개수의 전제이기 때문이다. 걸러낼 행을 가져와서 TS 에서 버리면 limit 이
 * 의미를 잃는다. pages_recent_idx 가 이 조건 그대로의 partial 인덱스다.
 *
 * 반대로 단건 조회(findById)는 상태로 거르지 않는다 — 거기서는 공개 여부가
 * 조회 전제가 아니라 판정 대상이라 service 가 규칙을 갖는다.
 */
export async function findRecent(limit: number): Promise<PageSummary[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(SUMMARY_COLUMNS)
    .eq("status", "PUBLISHED")
    .is("deleted_at", null)
    // 삭제된 댓글은 카드 배지에서 세지 않는다. 임베디드 필터라 게시물 행 자체는
    // 남고 count 만 줄어든다.
    .eq("comments.status", "VISIBLE")
    .order("published_at", { ascending: false })
    .limit(limit)
    .returns<PageSummaryRow[]>();

  if (error) throw new Error(`최근 게시물 조회 실패: ${error.message}`);
  return (data ?? []).map(toSummary);
}

/** 1-based 페이지 번호. UI 의 "1페이지"와 같은 수를 쓴다. */
export type Pagination = {
  page: number;
  size: number;
};

/**
 * 카테고리별 공개 게시물 한 페이지 + 전체 건수.
 *
 * 조회 키가 표시명이 아니라 slug 다 (CLAUDE.md "분기 조건에 표시명을 쓰지 않는다").
 * 페이지네이션 UI 가 마지막 페이지를 알아야 하므로 total 을 같은 왕복에서
 * 받아 온다 (`count: "exact"`).
 *
 * slug 가 아예 없는 카테고리면 여기서는 빈 목록으로 보인다. "없는 항목"과
 * "글이 없는 항목"을 가르는 것은 service 의 몫이다.
 */
export async function findByCategorySlug(
  slug: string,
  { page, size }: Pagination,
): Promise<{ items: PageSummary[]; total: number }> {
  const from = (page - 1) * size;

  const { data, count, error } = await getSupabase()
    .from(TABLE)
    // categories 는 필터용 조인이라 !inner 다. 결과 컬럼은 쓰지 않는다.
    .select(`${SUMMARY_COLUMNS}, categories!inner(slug)`, { count: "exact" })
    .eq("categories.slug", slug)
    .eq("status", "PUBLISHED")
    .is("deleted_at", null)
    .eq("comments.status", "VISIBLE")
    .order("published_at", { ascending: false })
    .range(from, from + size - 1)
    .returns<PageSummaryRow[]>();

  if (error) throw new Error(`카테고리 게시물 조회 실패: ${error.message}`);

  return { items: (data ?? []).map(toSummary), total: count ?? 0 };
}

/**
 * id 로 게시물 한 건. 없으면 null.
 *
 * status / deleted_at 으로 거르지 않고 그대로 올린다. "이 게시물을 보여줘도
 * 되는가"는 보는 사람이 누구냐에 따라 갈리는 업무 규칙이라 service 가 판정한다
 * (임시저장 조회는 다음 슬라이스에서 같은 함수를 그대로 재사용한다).
 */
export async function findById(id: string): Promise<PageDetail | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(PAGE_COLUMNS)
    .eq("id", id)
    // 목록 카드와 같은 규칙으로 센다. 삭제된 댓글은 개수에 넣지 않는다.
    .eq("comments.status", "VISIBLE")
    .maybeSingle<PageRow>();

  if (error) {
    if (error.code === PG_INVALID_TEXT_REPRESENTATION) return null;
    throw new Error(`게시물 조회 실패: ${error.message}`);
  }

  return data ? toPage(data) : null;
}

// ── 생성 ──────────────────────────────────────────────────────
// 게시물 한 건을 만드는 데 쓰기가 셋으로 쪼개진다 (tags upsert · pages insert ·
// page_tags insert). PostgREST 에는 다중 문장 트랜잭션이 없어서 BEGIN/COMMIT 을
// 걸 수단이 클라이언트 쪽에 없다.
//
// **그래서 보상 삭제(compensating delete)로 처리한다.** 순서와 근거:
//   ① tags upsert     — 실패해도 남는 게 없다. 성공 후 뒤가 깨져도 고아 tags 행은
//                       무해하다(name unique, 다음 글이 그대로 재사용한다).
//   ② pages insert    — 여기부터 되돌릴 대상이 생긴다.
//   ③ page_tags insert — 실패하면 ②를 지운다.
// 보상 대상이 pages 한 행으로 좁혀지도록 태그를 먼저 만든다.
//
// 진짜 원자성은 아니다. 보상 삭제 자체가 실패하면 태그 없는 게시물이 남는다
// (화면은 정상 동작하고 태그 배지만 빈다). RPC 함수로 내리면 원자적이지만
// CLAUDE.md "DB 안에 넣는 로직은 최소로"에 걸리고 Java 이관 시 버려진다.
//
// **트랜잭션 경계가 이 함수 안에만 있다는 점이 핵심이다.** Java 로 옮길 때
// service 메서드에 @Transactional 을 붙이고 아래 보상 코드를 지우면 끝이며,
// service·route·UI 는 무변경이다.

/** 태그 이름들을 tags 에 넣고(있으면 재사용) id 를 돌려준다. */
async function upsertTags(names: readonly string[]): Promise<string[]> {
  if (names.length === 0) return [];

  const { data, error } = await getSupabase()
    .from(TAG_TABLE)
    // ignoreDuplicates: false — 이미 있는 이름도 결과에 실어야 id 를 받는다.
    // 같은 이름이 배열 안에 두 번 들어오면 Postgres 가 거절하므로 호출부(검증)가
    // 중복을 미리 제거한다.
    .upsert(
      names.map((name) => ({ name })),
      { onConflict: "name", ignoreDuplicates: false },
    )
    .select("id")
    .returns<{ id: string }[]>();

  if (error) throw new Error(`태그 저장 실패: ${error.message}`);
  return (data ?? []).map((row) => row.id);
}

/** 보상 삭제. 이미 실패한 경로라 여기서 또 던지면 원래 원인이 가려진다. */
async function rollbackPage(pageId: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq("id", pageId);

  if (error) {
    console.error(
      `[pageRepository] 보상 삭제 실패 (page ${pageId}): ${error.message}`,
    );
  }
}

/** 게시물에 걸린 태그 id. 수정 시 되돌릴 재료로 미리 떠 둔다. */
async function findTagIds(pageId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from(PAGE_TAG_TABLE)
    .select("tag_id")
    .eq("page_id", pageId)
    .returns<{ tag_id: string }[]>();

  if (error) throw new Error(`게시물 태그 조회 실패: ${error.message}`);
  return (data ?? []).map((row) => row.tag_id);
}

async function deleteTagLinks(pageId: string): Promise<void> {
  const { error } = await getSupabase()
    .from(PAGE_TAG_TABLE)
    .delete()
    .eq("page_id", pageId);

  if (error) throw new Error(`게시물 태그 해제 실패: ${error.message}`);
}

async function insertTagLinks(
  pageId: string,
  tagIds: readonly string[],
): Promise<void> {
  if (tagIds.length === 0) return;

  const { error } = await getSupabase()
    .from(PAGE_TAG_TABLE)
    .insert(tagIds.map((tagId) => ({ page_id: pageId, tag_id: tagId })));

  if (error) throw new Error(`게시물 태그 연결 실패: ${error.message}`);
}

/**
 * 태그 연결을 예전 상태로 되돌린다. rollbackPage 와 같은 이유로 던지지 않는다 —
 * 이미 실패한 경로이고, 여기서 또 던지면 원래 원인이 가려진다.
 */
async function rollbackTagLinks(
  pageId: string,
  tagIds: readonly string[],
): Promise<void> {
  try {
    await deleteTagLinks(pageId);
    await insertTagLinks(pageId, tagIds);
  } catch (error) {
    console.error(
      `[pageRepository] 태그 보상 복구 실패 (page ${pageId})`,
      error,
    );
  }
}

/**
 * 게시물 한 건을 만든다.
 *
 * 돌려주는 것은 Page 다 — PageDetail 이 아니다. 방금 만든 글에 댓글은 있을 수
 * 없고 작성자 표시명은 호출한 쪽이 이미 안다. 그것들을 채우자고 insert 직후에
 * 조인 조회를 한 번 더 돌 이유가 없다.
 */
export async function create(data: CreatePageData): Promise<Page> {
  const tagIds = await upsertTags(data.tags);

  const { data: row, error } = await getSupabase()
    .from(TABLE)
    .insert({
      category_id: data.categoryId,
      author_id: data.authorId,
      title: data.title,
      content: data.content,
      plain_text: data.plainText,
      status: data.status,
      published_at: data.publishedAt,
    })
    .select(PAGE_CORE_COLUMNS)
    .single<PageCoreRow>();

  if (error) throw new Error(`게시물 저장 실패: ${error.message}`);

  const page = toPageCore(row);

  try {
    await insertTagLinks(page.id, tagIds);
  } catch (linkError) {
    await rollbackPage(page.id);
    throw linkError;
  }

  return page;
}

// ── 수정 ──────────────────────────────────────────────────────
/**
 * 게시물 한 건을 고친다.
 *
 * **되돌리기 전략은 create 와 같은 문제(다중 문장 트랜잭션 부재)에 대한 같은
 * 답이다.** 다만 되돌릴 대상이 다르다 — create 는 "방금 만든 행을 지우면
 * 되던" 문제였지만 수정은 지울 수 없고 **예전 값으로 되돌려야** 한다.
 * 그래서 태그 연결의 예전 상태를 먼저 떠 놓고(previousTagIds) 시작한다.
 *
 * 순서와 실패 시 복구 범위:
 *   ① tags upsert       실패 → 아무것도 안 바뀜. 고아 tags 행은 무해하다(create 와 동일).
 *   ② 기존 링크 스냅샷   실패 → 아무것도 안 바뀜.
 *   ③ page_tags 교체     실패 → 예전 링크로 되돌리고 던진다. pages 행은 아직 안 건드렸다.
 *   ④ pages update       실패 → 예전 링크로 되돌리고 던진다. → 전부 원상복구.
 *
 * **여러 문장 중 한 문장만 남는 pages update 를 일부러 마지막에 둔다.** 반대로
 * 두면(본문 먼저·태그 나중) 태그 교체가 깨졌을 때 본문만 새 값인 상태가 남는데,
 * 그건 되돌릴 재료(예전 본문)를 repository 가 갖고 있지 않아 복구가 불가능하다.
 *
 * 되돌리기가 성립하지 않는 경우는 하나뿐이다: 보상 복구 자체가 실패할 때
 * (rollbackTagLinks 가 로그만 남긴다). 그때 남는 어긋남은 "본문은 예전 값인데
 * 태그만 새 값" 이며 화면은 정상 동작한다.
 *
 * create 와 마찬가지로 **트랜잭션 경계가 이 함수 안에만 있다.** Java 이관 시
 * service 메서드에 @Transactional 을 붙이고 아래 보상 코드를 지우면 끝이다.
 */
export async function update(
  id: string,
  data: UpdatePageData,
): Promise<Page> {
  const tagIds = await upsertTags(data.tags);
  const previousTagIds = await findTagIds(id);

  try {
    await deleteTagLinks(id);
    await insertTagLinks(id, tagIds);
  } catch (linkError) {
    await rollbackTagLinks(id, previousTagIds);
    throw linkError;
  }

  const { data: row, error } = await getSupabase()
    .from(TABLE)
    .update({
      category_id: data.categoryId,
      title: data.title,
      content: data.content,
      plain_text: data.plainText,
    })
    .eq("id", id)
    .select(PAGE_CORE_COLUMNS)
    .single<PageCoreRow>();

  if (error) {
    await rollbackTagLinks(id, previousTagIds);
    throw new Error(`게시물 수정 실패: ${error.message}`);
  }

  // updated_at 은 set_updated_at() 트리거가 채운다. 여기서 now() 를 적어 넣으면
  // 정본이 둘이 된다.
  return toPageCore(row);
}

// ── 삭제 ──────────────────────────────────────────────────────
/**
 * soft delete — deleted_at 에 시각을 찍는다. 행은 지우지 않는다
 * (CLAUDE.md: hard delete 금지).
 *
 * 이 한 컬럼이 공개 노출의 기준이다. 목록 쿼리는 `is("deleted_at", null)` 로
 * 거르고 상세는 service 의 isPublic 이 같은 값을 본다.
 *
 * 이미 삭제된 행을 다시 지워도 조용히 통과한다(멱등). "정말 있는 글인가"는
 * service 가 먼저 확인하는 질문이라 여기서 또 판정하지 않는다.
 */
export async function softDelete(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`게시물 삭제 실패: ${error.message}`);
}
