// =============================================================
// comments 테이블 접근
//
// DB row(snake_case)를 도메인 모델(CommentWithAuthor, camelCase)로 옮기는 것이
// 이 레이어의 책임이다. PostgREST 임베디드 조회의 중첩 모양(`author: { name }`,
// `page: { title }`)도 여기서 평평하게 편다 — 그 모양이 위로 새면 Java 백엔드로
// 갈아끼울 때 프론트까지 흔들린다.
//
// **익명 처리를 여기서 하지 않는다.** authorName 은 언제나 실제 값이고, 가리는
// 판단은 service 가 한다 (types/comment.ts CommentWithAuthor 주석 참조).
// =============================================================

import type {
  AdminCommentSummary,
  CommentStatus,
  CommentWithAuthor,
  CreateCommentData,
  DashboardComment,
  MyCommentSummary,
} from "@/lib/types";

import { getSupabase } from "./supabaseClient";

const TABLE = "comments";

/**
 * 조회하는 컬럼.
 *
 * `author:users(name)` 하나로 작성자 표시명을 같은 왕복에 받는다. 목록 20건에
 * 작성자 조회를 따로 돌면 요청이 21번이 된다.
 */
const COMMENT_COLUMNS =
  "id, page_id, author_id, parent_id, content, is_anonymous, status, created_at, updated_at, author:users(name)";

/**
 * 마이페이지 목록이 읽는 컬럼.
 *
 * **COMMENT_COLUMNS 를 재사용하지 않는다.** 이 목록이 그리는 것은 "어느 글에
 * 무슨 댓글을 썼는가"라서 작성자 조인이 통째로 필요 없고(전부 나다), 대신
 * 게시물 제목이 필요하다. 한 상수로 합치면 두 화면 모두 쓰지 않는 조인이
 * 매 요청 따라붙는다 (pageRepository 가 목록/관리 목록을 나눈 것과 같은 근거).
 */
const MY_COMMENT_COLUMNS = "id, page_id, content, created_at, page:pages(title)";

/**
 * 어드민 최근 댓글 목록이 읽는 컬럼 (`/admin/comments`).
 *
 * **COMMENT_COLUMNS 도 MY_COMMENT_COLUMNS 도 재사용하지 않는다.** 이 목록은
 * 위 둘이 각각 반쪽씩 가진 것을 다 필요로 한다 — 작성자 조인(누가 썼는가)과
 * 게시물 제목 조인(어느 글에 달렸는가)이 동시에 있어야 관리자가 "이 댓글을
 * 지울 것인가"를 판단할 수 있다. 한쪽을 늘려서 겸용하면 그 조인이 상세 화면의
 * 댓글 목록이나 마이페이지에도 매 요청 따라붙는다.
 */
const ADMIN_COMMENT_COLUMNS =
  "id, page_id, author_id, content, is_anonymous, status, created_at, author:users(name), page:pages(title)";

/**
 * 대시보드 카드가 읽는 컬럼 (Figma 1:2184).
 *
 * `page:pages(title, comments(count))` 로 **게시물의 댓글 수까지 같은 왕복에**
 * 받는다. 카드마다 countByPageId 를 부르면 3장에 요청이 4번이 되고, 그건
 * 대시보드가 카드를 몇 장 그리느냐에 따라 늘어나는 비용이다.
 *
 * 그 count 에는 필터를 걸 수 없어서 **지워진 댓글까지 세어진다.** 상세 화면의
 * 배지(pageRepository 의 comments(count) + VISIBLE 필터)와 어긋나는 지점이지만,
 * 대시보드 카드의 숫자는 조작에 쓰이지 않는 참고 표시이고 정확한 수는 그 글로
 * 들어가면 보인다. 여기서 맞추려면 게시물별 조회를 한 번 더 돌아야 한다.
 */
const DASHBOARD_COMMENT_COLUMNS =
  "id, page_id, content, is_anonymous, created_at, author:users(name), page:pages(title, comments(count))";

/** pageRepository 와 같은 이유로 여기서도 끝낸다 — uuid 아닌 문자열 비교. */
const PG_INVALID_TEXT_REPRESENTATION = "22P02";

/** 화면에 보이는 댓글. 소프트 삭제된 행은 status 로 갈린다. */
const VISIBLE: CommentStatus = "VISIBLE";

// ── row 타입 ──────────────────────────────────────────────────
/**
 * 임베디드 조회 결과. 객체로 오는 것은 PostgREST 사정이지 도메인 사정이 아니다.
 * author_id 는 NOT NULL 이고 FK 가 걸려 있어 행은 반드시 있다. name 만
 * nullable 이다(탈퇴 시 NULL). 그래도 드라이버가 null 을 줄 여지를 남겨 둔다.
 */
type CommentRow = {
  id: string;
  page_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  is_anonymous: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  author: { name: string | null } | null;
};

type MyCommentRow = {
  id: string;
  page_id: string;
  content: string;
  created_at: string;
  page: { title: string } | null;
};

type AdminCommentRow = {
  id: string;
  page_id: string;
  author_id: string;
  content: string;
  is_anonymous: boolean;
  status: string;
  created_at: string;
  author: { name: string | null } | null;
  page: { title: string } | null;
};

/**
 * 대시보드 행. `comments(count)` 는 pageRepository 와 같은 모양으로 온다 —
 * 집계 한 줄이 배열에 담겨 있다(`[{ count: 3 }]`).
 */
type DashboardCommentRow = {
  id: string;
  page_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  author: { name: string | null } | null;
  page: { title: string; comments: { count: number }[] | null } | null;
};

// ── 변환 ──────────────────────────────────────────────────────
function toComment(row: CommentRow): CommentWithAuthor {
  return {
    id: row.id,
    pageId: row.page_id,
    authorId: row.author_id,
    parentId: row.parent_id,
    content: row.content,
    isAnonymous: row.is_anonymous,
    // varchar + CHECK 제약이 값을 보증한다. 도메인 유니온으로 좁혀서 올린다.
    status: row.status as CommentStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: row.author?.name ?? null,
  };
}

function toMyComment(row: MyCommentRow): MyCommentSummary {
  return {
    id: row.id,
    pageId: row.page_id,
    // 게시물이 지워지면 조인 결과가 없다. 화면이 문구를 정한다.
    pageTitle: row.page?.title ?? null,
    content: row.content,
    createdAt: row.created_at,
  };
}

function toAdminComment(row: AdminCommentRow): AdminCommentSummary {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    status: row.status as CommentStatus,
    authorId: row.author_id,
    // 익명이어도 실제 이름을 그대로 올린다 — 가리는 판단은 service 의 몫이고,
    // 어드민 화면은 이 값을 봐야 한다 (파일 맨 위 주석).
    authorName: row.author?.name ?? null,
    isAnonymous: row.is_anonymous,
    pageId: row.page_id,
    pageTitle: row.page?.title ?? null,
  };
}

function toDashboardComment(row: DashboardCommentRow): DashboardComment {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    authorName: row.author?.name ?? null,
    isAnonymous: row.is_anonymous,
    pageId: row.page_id,
    pageTitle: row.page?.title ?? null,
    // 집계는 배열 한 줄로 온다. 게시물이 지워졌으면 조인 자체가 비어 0 이 된다.
    commentCount: row.page?.comments?.[0]?.count ?? 0,
  };
}

// ── 조회 ──────────────────────────────────────────────────────
/**
 * 한 게시물의 댓글 전부. **대댓글을 포함한 평면 배열**이다.
 *
 * ── 왜 중첩 트리가 아니라 평면 배열인가 ──
 * ① SQL 이 돌려주는 것이 평면이다. 트리는 이 자리에서 한 번 조립하고 API
 *    경계에서 다시 직렬화되는데, 그 조립은 DB 가 답한 사실이 아니라 **화면이
 *    원하는 모양**이다. repository 는 DB row 를 도메인 모델로 옮기는 곳이지
 *    화면 모양을 만드는 곳이 아니다.
 * ② 깊이가 1단계로 고정돼 있다(service 가 강제한다). 트리로 만들어 봐야
 *    `children` 이 한 겹뿐이라 재귀 구조가 값을 못 하고, 반대로 타입은
 *    자기참조가 되어 무한 깊이를 표현할 수 있는 것처럼 거짓말을 한다.
 * ③ Java 이관 시 그대로 간다. JPA 든 native query 든 자연스러운 반환은
 *    `List<Comment>` 이고, 계약이 평면이면 백엔드가 바뀌어도 프론트가 안 바뀐다.
 * 부모 아래로 묶는 일은 화면에서 parentId 로 한 번 그룹핑하면 끝난다.
 *
 * **소프트 삭제된 댓글은 싣지 않는다.** 게시물 카드의 댓글 수(pageRepository 의
 * `comments.status = 'VISIBLE'` 필터)와 같은 규칙이라 배지의 수와 실제 목록
 * 길이가 어긋나지 않는다.
 *
 * 정렬은 작성 순(오름차순)이다. comments_page_idx(page_id, created_at)가 이
 * 조회 그대로의 인덱스다.
 */
export async function findByPageId(
  pageId: string,
): Promise<CommentWithAuthor[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(COMMENT_COLUMNS)
    .eq("page_id", pageId)
    .eq("status", VISIBLE)
    .order("created_at", { ascending: true })
    .returns<CommentRow[]>();

  if (error) {
    if (error.code === PG_INVALID_TEXT_REPRESENTATION) return [];
    throw new Error(`댓글 목록 조회 실패: ${error.message}`);
  }

  return (data ?? []).map(toComment);
}

/**
 * 한 게시물에 달린 댓글 수. findByPageId 와 **같은 조건**(VISIBLE)으로 센다.
 *
 * 행을 실어 오지 않는다(`head: true`) — 개수만 필요한 호출부가 본문을 통째로
 * 받아 갈 이유가 없다.
 */
export async function countByPageId(pageId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("page_id", pageId)
    .eq("status", VISIBLE);

  if (error) {
    if (error.code === PG_INVALID_TEXT_REPRESENTATION) return 0;
    throw new Error(`댓글 수 조회 실패: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * 내가 쓴 최근 댓글 (마이페이지 "내 댓글 모아보기").
 *
 * comments_author_idx(author_id, created_at desc)가 이 조회 그대로의 인덱스다.
 * 지워진 내 댓글은 빼고 센다 — 목록과 같은 규칙(VISIBLE)이다.
 */
export async function findRecentByAuthorId(
  authorId: string,
  limit: number,
): Promise<MyCommentSummary[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(MY_COMMENT_COLUMNS)
    .eq("author_id", authorId)
    .eq("status", VISIBLE)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<MyCommentRow[]>();

  if (error) throw new Error(`내 댓글 조회 실패: ${error.message}`);

  return (data ?? []).map(toMyComment);
}

/**
 * id 로 댓글 한 건. 없으면 null.
 *
 * **status 로 거르지 않는다.** "이 댓글을 어떻게 할 수 있는가"는 보는 사람이
 * 누구냐에 따라 갈리는 업무 규칙이라 service 가 판정한다 (pageRepository 의
 * findById 가 publicPages 를 쓰지 않는 것과 같은 근거). 여기서 걸러 버리면
 * 이미 지워진 댓글에 답글이 달리는 것을 service 가 막을 수 없다.
 */
export async function findById(id: string): Promise<CommentWithAuthor | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(COMMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle<CommentRow>();

  if (error) {
    if (error.code === PG_INVALID_TEXT_REPRESENTATION) return null;
    throw new Error(`댓글 조회 실패: ${error.message}`);
  }

  return data ? toComment(data) : null;
}

/**
 * 어드민 최근 댓글 목록 한 페이지 + 전체 건수 (`/admin/comments`).
 *
 * **지워진 댓글을 거르지 않는다.** 공개 목록(findByPageId)이 VISIBLE 만 싣는
 * 것과 반대다 — 관리 화면에서 삭제분이 통째로 사라지면 "이 댓글이 지워졌는가,
 * 애초에 없었는가"를 구분할 방법이 없고, 신고 관리에서 넘어와 대조할 수도 없다.
 * status 는 도메인 모델에 실려 나가므로 화면이 배지로 가른다
 * (findUsersForAdmin 이 탈퇴 계정을 거르지 않는 것과 같은 근거).
 *
 * 정렬은 작성 시각 내림차순이다 — 화면 이름이 "최근 달린 댓글"이고, 관리자가
 * 먼저 봐야 할 것은 방금 달린 댓글이다. 공개 목록의 오름차순(대화 순서)과
 * 반대인 것이 의도다.
 */
export async function findForAdmin({
  page,
  size,
}: {
  page: number;
  size: number;
}): Promise<{ items: AdminCommentSummary[]; total: number }> {
  const from = (page - 1) * size;

  const { data, count, error } = await getSupabase()
    .from(TABLE)
    .select(ADMIN_COMMENT_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + size - 1)
    .returns<AdminCommentRow[]>();

  if (error) throw new Error(`댓글 관리 목록 조회 실패: ${error.message}`);

  return { items: (data ?? []).map(toAdminComment), total: count ?? 0 };
}

/**
 * 대시보드 카드용 최근 댓글 (Figma 1:2184).
 *
 * **findForAdmin 을 limit 만 바꿔 부르지 않는다.** 저쪽은 `count: "exact"` 로
 * 전체 건수를 매번 세는데 대시보드는 카드 3장만 그리므로 그 비용이 낭비이고,
 * 이쪽만 게시물의 댓글 수를 함께 읽는다(DASHBOARD_COMMENT_COLUMNS).
 *
 * 여기서는 **VISIBLE 만 싣는다.** 관리 목록과 반대인 이유는 대시보드가 조작
 * 없는 미리보기라서다 — 지워진 댓글 카드는 눌러도 할 일이 없고, "최근 이런
 * 댓글이 달렸습니다"라는 화면의 질문에 대한 답도 아니다.
 * comments_recent_idx(created_at desc where status = 'VISIBLE')가 이 조회
 * 그대로의 인덱스다.
 */
export async function findRecentForDashboard(
  limit: number,
): Promise<DashboardComment[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(DASHBOARD_COMMENT_COLUMNS)
    .eq("status", VISIBLE)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<DashboardCommentRow[]>();

  if (error) throw new Error(`최근 댓글 조회 실패: ${error.message}`);

  return (data ?? []).map(toDashboardComment);
}

// ── 생성 ──────────────────────────────────────────────────────
/**
 * 댓글 한 건을 만든다.
 *
 * 게시물 작성(pageRepository.create)과 달리 문장이 하나뿐이라 트랜잭션 문제가
 * 없다 — 댓글에는 태그처럼 딸린 테이블이 없다. 보상 삭제 코드도 필요 없다.
 *
 * status 를 넘기지 않는다. 새 댓글은 언제나 VISIBLE 이고 그건 DB 기본값이
 * 이미 답하는 사실이다 — 여기서 다시 적으면 정본이 둘이 된다.
 */
export async function create(
  data: CreateCommentData,
): Promise<CommentWithAuthor> {
  const { data: row, error } = await getSupabase()
    .from(TABLE)
    .insert({
      page_id: data.pageId,
      author_id: data.authorId,
      parent_id: data.parentId,
      content: data.content,
      is_anonymous: data.isAnonymous,
    })
    .select(COMMENT_COLUMNS)
    .single<CommentRow>();

  if (error) throw new Error(`댓글 저장 실패: ${error.message}`);

  return toComment(row);
}

// ── 삭제 ──────────────────────────────────────────────────────
/**
 * soft delete — status 를 DELETED 로 바꾼다. 행은 지우지 않는다
 * (CLAUDE.md: hard delete 금지).
 *
 * **deleted_at 같은 새 컬럼을 만들지 않는다.** 이미 status 가 그 상태를 담고
 * 있고, 비슷한 플래그를 늘리지 않는 것이 코딩 컨벤션이다. 게시물이
 * deleted_at 을 쓰는 것과 달라 보이지만 그쪽은 status(DRAFT/PUBLISHED/HIDDEN)가
 * 공개 단계를 담고 있어 삭제를 겹쳐 넣을 자리가 없었던 반면, 댓글의 status 는
 * 애초에 VISIBLE/DELETED 두 값짜리다.
 *
 * **딸린 대댓글은 건드리지 않는다.** 남의 발언이라 부모를 지웠다고 함께
 * 지울 수 없다. 부모를 잃은 답글이 화면에서 어떻게 놓이는지는 commentService
 * 의 목록 주석에 있다.
 *
 * 이미 지워진 행을 다시 지워도 조용히 통과한다(멱등). "정말 있는 댓글인가"는
 * service 가 먼저 확인하는 질문이라 여기서 또 판정하지 않는다.
 */
export async function softDelete(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .update({ status: "DELETED" satisfies CommentStatus })
    .eq("id", id);

  if (error) throw new Error(`댓글 삭제 실패: ${error.message}`);
}
