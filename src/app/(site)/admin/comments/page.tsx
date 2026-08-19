import AdminShell from "@/components/admin/AdminShell";
import AdminCommentList from "@/components/admin/comments/AdminCommentList";
import Pagination from "@/components/common/Pagination";
import { readNumberParam } from "@/lib/api/queryParams";
import type { AdminCommentListBody } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/requireRole";
import { hasRole } from "@/lib/auth/roles";
import type { SessionPayload } from "@/lib/auth/session";
import * as commentService from "@/lib/services/commentService";

/**
 * 댓글 목록 한 페이지. **self-fetch 대신 직접 호출이 사는 자리는 여기 하나다.**
 *
 * 이 응답에는 익명 댓글의 실제 작성자가 실려 있어 사용자마다 다르고, 그래서
 * 예전의 fetchApiAsUser 는 no-store 였다 — fetch 캐시가 아예 걸리지 않으니 자기
 * 라우트로 한 바퀴 도는 비용을 매 요청 그대로 냈다는 뜻이다. 정적화도 세션 때문에
 * 불가능하다 (CLAUDE.md "서버 컴포넌트의 self-fetch").
 *
 * **권한은 그대로 두 겹이다.** `requireRole("EDITOR")` 가 돌려준 세션을 그대로
 * 넘기므로, 라우트 핸들러가 `getSession()` 으로 읽어 넘기던 값과 같다 —
 * commentService.listCommentsForAdmin 의 `assertRole("EDITOR")` 는 이전과 똑같이
 * 호출된다. 화면 가드가 데이터 가드를 대체하지 않는다.
 *
 * 반환 타입을 `AdminCommentListBody` 로 두는 것도 의도다. 라우트가 내려주던 것과
 * 같은 모양이라 화면 코드가 예외를 눈치채지 못하고, Java 이관 시 이 함수 본문만
 * `fetchApiAsUser` 로 되돌리면 끝난다.
 */
async function adminCommentList(
  session: SessionPayload,
  pageParam: string | undefined,
): Promise<AdminCommentListBody> {
  const result = await commentService.listCommentsForAdmin(session, {
    page: readNumberParam(pageParam),
  });

  return {
    comments: result.items,
    total: result.total,
    page: result.page,
    size: result.size,
  };
}

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

  const body = await adminCommentList(session, page);

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
