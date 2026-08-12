import AdminShell from "@/components/admin/AdminShell";
import AdminCommentList from "@/components/admin/comments/AdminCommentList";
import Pagination from "@/components/common/Pagination";
import { fetchApiAsUser } from "@/lib/api/serverFetch";
import type { AdminCommentListBody } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/requireRole";
import { hasRole } from "@/lib/auth/roles";

/**
 * 최근 달린 댓글 — `/admin/comments` (Figma 1:2184)
 *
 * **가드가 EDITOR 다.** 신고 관리(/admin/reports)와 선이 다르다 — 저쪽에는
 * 사용자 차단이 붙어 있어 계정을 다루는 화면이지만, 여기가 하는 일은 달린
 * 댓글을 훑고 문제가 있으면 해당 글로 건너가는 것이라 위키 운영의 일부다.
 * 위키를 운영하는 사람이 자기 문서에 달린 댓글을 보지도 못하면 운영이 성립하지
 * 않는다.
 *
 * ⚠️ **그런데 삭제는 ADMIN 만 할 수 있다.** commentService.deleteComment 의
 * 기준이 그렇고(EDITOR 는 글을 다루는 권한이지 남의 발언을 내리는 권한이
 * 아니다), 이 화면은 그 차이를 role 로 미리 보여준다 — 눌러도 403 인 버튼을
 * 그리지 않는다. **화면이 버튼을 감추는 것은 안내이지 차단이 아니다** — 진짜
 * 차단은 service 가 하고, EDITOR 가 API 를 직접 불러도 막힌다.
 *
 * **이 가드는 데이터 차단을 대체하지 않는다.** API 는 이 페이지를 거치지 않고
 * 직접 호출되므로 commentService.listCommentsForAdmin 의 assertRole 이 따로
 * 필요하다 (CLAUDE.md "권한").
 *
 * 상태 필터가 없다 — 관리 목록은 지워진 댓글도 함께 보여주는 것이 규칙이고
 * (repository 주석), 걸러 볼 이유가 아직 화면에 없다. 페이지네이션은 기존
 * 컴포넌트를 그대로 쓰는 offset(`?page=`) 방식이다.
 */
export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireRole("EDITOR");

  const { page } = await searchParams;
  const suffix = page ? `?page=${page}` : "";

  // 세션 쿠키를 실어야 한다. 이 목록에는 익명 댓글의 실제 작성자가 실려 있고
  // fetchApiAsUser 가 no-store 로 고정한다 — 캐시되면 그 값이 남에게 나간다.
  const body = await fetchApiAsUser<AdminCommentListBody>(
    `/api/admin/comments${suffix}`,
  );

  // 마지막 페이지는 서버가 되돌려준 size 로 계산한다. 요청한 size 가 상한(50)
  // 에서 접혔으면 실제 쪽수가 달라진다.
  const lastPage = Math.max(Math.ceil(body.total / body.size), 1);

  return (
    <AdminShell role={session.role}>
      {/* 헤더 — Figma 1:2184 (아이콘 45px + 제목) */}
      <header className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] lg:flex-nowrap lg:gap-[20px]">
        <span
          className="text-[32px] leading-[32px] lg:text-[45px] lg:leading-[45px]"
          aria-hidden
        >
          💬
        </span>
        <h1 className="min-w-0 text-[22px] font-bold leading-[34px] text-black lg:text-[28px]">
          최근 달린 댓글
        </h1>
        <span className="text-[16px] leading-[22px] text-gray3">
          {body.total}개
        </span>
      </header>

      <AdminCommentList
        comments={body.comments}
        canDelete={hasRole(session.role, "ADMIN")}
      />

      <Pagination
        basePath="/admin/comments"
        currentPage={body.page}
        lastPage={lastPage}
      />
    </AdminShell>
  );
}
