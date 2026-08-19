import AdminShell from "@/components/admin/AdminShell";
import AdminReportList from "@/components/admin/reports/AdminReportList";
import AdminReportStatusFilter from "@/components/admin/reports/AdminReportStatusFilter";
import Pagination from "@/components/common/Pagination";
import { readNumberParam } from "@/lib/api/queryParams";
import type { AdminReportListBody } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/requireRole";
import type { SessionPayload } from "@/lib/auth/session";
import * as reportService from "@/lib/services/reportService";

/**
 * 신고 목록 한 페이지. **self-fetch 대신 직접 호출이 사는 자리는 여기 하나다.**
 *
 * 관리자만 받을 수 있는 응답인 데다 익명 댓글의 실제 작성자가 실려 있어, 예전의
 * fetchApiAsUser 는 no-store 였다 — fetch 캐시가 아예 걸리지 않으니 자기 라우트로
 * 한 바퀴 도는 비용을 매 요청 그대로 냈다는 뜻이다. 정적화도 세션 때문에
 * 불가능하다 (CLAUDE.md "서버 컴포넌트의 self-fetch").
 *
 * **권한은 그대로 두 겹이다.** `requireRole("ADMIN")` 이 돌려준 세션을 그대로
 * 넘기므로, 라우트 핸들러가 `getSession()` 으로 읽어 넘기던 값과 같다 —
 * reportService.listReportsForAdmin 의 `assertRole("ADMIN")` 은 이전과 똑같이
 * 호출된다. 화면 가드가 데이터 가드를 대체하지 않는다.
 *
 * status 를 여기서 판정하지 않는 것도 그대로다. 문자열을 그대로 넘기면 service 가
 * 안전한 값으로 접고(모르는 status 는 "전체") 실제로 적용한 값을 되돌려준다.
 *
 * 반환 타입을 `AdminReportListBody` 로 두는 것도 의도다. 라우트가 내려주던 것과
 * 같은 모양이라 화면 코드가 예외를 눈치채지 못하고, Java 이관 시 이 함수 본문만
 * `fetchApiAsUser` 로 되돌리면 끝난다.
 */
async function adminReportList(
  session: SessionPayload,
  params: { status?: string; page?: string },
): Promise<AdminReportListBody> {
  const result = await reportService.listReportsForAdmin(session, {
    status: params.status,
    page: readNumberParam(params.page),
  });

  return {
    reports: result.items,
    total: result.total,
    page: result.page,
    size: result.size,
    status: result.status,
  };
}

/**
 * 댓글 신고 관리 — `/admin/reports` (Figma 1:2208)
 *
 * **가드가 ADMIN 이다. EDITOR 가 아니다.** 위키 관리(/admin/pages)·댓글 관리
 * (/admin/comments)와 선이 다르다 — 이 화면에는 **사용자 차단**이 붙어 있어서
 * 계정을 다루는 화면이고, 그건 글을 다루는 권한과 층위가 다르다. 사용자
 * 관리(/admin/users)와 같은 선이며 LNB 의 minRole 도 같은 ADMIN 이지만, 그건
 * 표시 판정일 뿐이다 — 메뉴에서 안 보여도 주소를 직접 치면 요청은 그대로 온다.
 *
 * **이 가드는 데이터 차단을 대체하지 않는다.** API 는 이 페이지를 거치지 않고
 * 직접 호출되므로 reportService.listReportsForAdmin 의 assertRole 이 따로
 * 필요하고, 반대로 service 가드만으로는 화면이 그려지는 것을 막지 못한다
 * (CLAUDE.md "권한").
 *
 * 필터는 URL(`?status=`)이 정본이다. 클라이언트 상태로 들면 새로고침·뒤로가기·
 * 링크 공유가 깨지고 이 페이지가 서버 컴포넌트로 남을 수 없다. 페이지네이션도
 * 기존 컴포넌트를 그대로 쓰는 offset(`?page=`) 방식이다.
 *
 * ── 기본 필터를 PENDING 으로 걸지 않는다 ────────────────────
 * 대시보드 카드는 미처리만 보여주지만 이 화면의 기본은 전체다. 종결된 신고가
 * 기본에서 빠지면 "이 댓글을 전에 어떻게 판단했는가"를 보려고 매번 필터를
 * 눌러야 하고, 처리 직후 목록에서 사라지는 것이 취소된 것처럼 읽힌다.
 * 미처리만 보려면 탭이 첫 칸 옆에 있다.
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await requireRole("ADMIN");

  const { status, page } = await searchParams;

  const body = await adminReportList(session, { status, page });

  // 마지막 페이지는 서버가 되돌려준 size 로 계산한다. 요청한 size 가 상한(50)
  // 에서 접혔으면 실제 쪽수가 달라진다.
  const lastPage = Math.max(Math.ceil(body.total / body.size), 1);

  // 페이지를 넘겨도 필터가 유지되어야 한다. Pagination 은 basePath 에 이미
  // 쿼리가 있으면 `&` 로 잇는다.
  const basePath = body.status
    ? `/admin/reports?status=${body.status}`
    : "/admin/reports";

  return (
    <AdminShell role={session.role}>
      {/* 헤더 — Figma 1:2209 (아이콘 45px + 제목) */}
      <header className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] lg:flex-nowrap lg:gap-[20px]">
        <span
          className="text-[32px] leading-[32px] lg:text-[45px] lg:leading-[45px]"
          aria-hidden
        >
          🚨
        </span>
        <h1 className="min-w-0 text-[22px] font-bold leading-[34px] text-black lg:text-[28px]">
          댓글 신고 관리
        </h1>
        <span className="text-[16px] leading-[22px] text-gray3">
          {body.total}건
        </span>
      </header>

      <div className="mt-[24px]">
        <AdminReportStatusFilter current={body.status} />
      </div>

      <AdminReportList reports={body.reports} />

      <Pagination
        basePath={basePath}
        currentPage={body.page}
        lastPage={lastPage}
      />
    </AdminShell>
  );
}
