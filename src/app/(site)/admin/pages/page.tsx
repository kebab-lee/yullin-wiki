import AdminShell from "@/components/admin/AdminShell";
import AdminPageStatusFilter from "@/components/admin/pages/AdminPageStatusFilter";
import AdminPageTable from "@/components/admin/pages/AdminPageTable";
import Pagination from "@/components/common/Pagination";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { readNumberParam } from "@/lib/api/queryParams";
import { fetchApi } from "@/lib/api/serverFetch";
import type { AdminPageListBody, CategoryListBody } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/requireRole";
import type { SessionPayload } from "@/lib/auth/session";
import * as pageService from "@/lib/services/pageService";

/**
 * 위키 목록 한 페이지. **self-fetch 대신 직접 호출이 사는 자리는 여기 하나다.**
 *
 * 이 목록에는 남에게 보이면 안 되는 초안이 실려 사용자마다 다르고, 그래서 예전의
 * fetchApiAsUser 는 no-store 였다 — fetch 캐시가 아예 걸리지 않으니 자기 라우트로
 * 한 바퀴 도는 비용을 매 요청 그대로 냈다는 뜻이다. 정적화도 세션 때문에
 * 불가능하다 (CLAUDE.md "서버 컴포넌트의 self-fetch").
 *
 * **같은 화면의 항목 목록은 그대로 self-fetch 다.** `/api/categories` 는 세션과
 * 무관해 1시간 캐시(REVALIDATE.categories)가 걸리므로 왕복을 매 요청 내지 않는다 —
 * 위의 사유가 거기엔 해당하지 않는다.
 *
 * **권한은 그대로 두 겹이다.** `requireRole("EDITOR")` 가 돌려준 세션을 그대로
 * 넘기므로, 라우트 핸들러가 `getSession()` 으로 읽어 넘기던 값과 같다 —
 * pageService.listPagesForAdmin 의 `assertRole("EDITOR")` 는 이전과 똑같이
 * 호출된다. 화면 가드가 데이터 가드를 대체하지 않는다.
 *
 * status 를 여기서 판정하지 않는 것도 그대로다. 문자열을 그대로 넘기면 service 가
 * 좁히고(parseStatusFilter) 실제로 적용된 값을 되돌려준다.
 *
 * 반환 타입을 `AdminPageListBody` 로 두는 것도 의도다. 라우트가 내려주던 것과
 * 같은 모양이라 화면 코드가 예외를 눈치채지 못하고, Java 이관 시 이 함수 본문만
 * `fetchApiAsUser` 로 되돌리면 끝난다.
 */
async function adminPageList(
  session: SessionPayload,
  params: { status?: string; page?: string },
): Promise<AdminPageListBody> {
  const result = await pageService.listPagesForAdmin(session, {
    status: params.status,
    page: readNumberParam(params.page),
  });

  return {
    pages: result.items,
    total: result.total,
    page: result.page,
    size: result.size,
    status: result.status,
  };
}

/**
 * 위키 관리 — `/admin/pages` (Figma AdSaved 1:1490 이 목록형 관리 화면의 기준)
 *
 * ── 일괄 처리(체크박스 + 일괄 삭제)를 넣지 않았다 ──────────────
 * Figma AdSaved(1:2002)에 선택 모드와 "취소 / 삭제하기"가 있지만, 그 화면과 이
 * 화면은 대상이 다르다. AdSaved 는 **내 임시저장 글** 목록이라(draftPages 만
 * 작성자를 본다) 여러 개를 한 번에 버리는 것이 자연스럽다. 여기는 발행된 남의
 * 글까지 포함한 전체 위키다. 셋 다 걸린다:
 *
 *   ① 삭제 확인 절차와 정면으로 충돌한다. 단건 삭제는 지금 **제목을 그대로 옮겨
 *      적어야** 통과한다(DeletePageDialog) — EDITOR 가 소유권 없이 남의 글을
 *      지울 수 있어서 일부러 둔 한 겹이다. N건을 선택하면 그 절차를 지킬 수
 *      없으므로 일괄 삭제는 필연적으로 **더 위험한 대상에 더 약한 확인**이 된다.
 *   ② 일괄 상태 전환은 전환표와 맞지 않는다. 허용 전환은 현재 상태별로 갈리는데
 *      (DRAFT→PUBLISHED / PUBLISHED→HIDDEN / HIDDEN→PUBLISHED) 섞인 선택에는
 *      모두에게 합법인 목표가 없다. 부분 성공을 허용하거나 클라이언트가 상태별로
 *      묶어 보내야 하고, 둘 다 전환 규칙을 UI 로 새어나가게 한다.
 *   ③ 원자성이 없다. repository 에 다중 문장 트랜잭션 수단이 없어서(create/update
 *      주석) N건 처리는 "3건 성공 2건 실패"로 끝날 수 있는데, 그 중간 상태를
 *      되돌릴 재료도 사용자에게 설명할 화면도 없다.
 *
 * 그래서 이 화면의 조작 단위는 한 줄이다. 임시저장 일괄 정리가 실제로 필요해지면
 * 그건 AdSaved 화면의 과제이며(대상이 자기 초안으로 좁혀져 ①이 사라진다) 거기서
 * 다시 판단한다.
 * ────────────────────────────────────────────────────────────
 *
 * 상태 필터는 URL(`?status=`)이 정본이다. 클라이언트 상태로 들면 새로고침·
 * 뒤로가기·링크 공유가 깨지고 이 페이지가 서버 컴포넌트로 남을 수 없다.
 * 페이지네이션도 기존 컴포넌트를 그대로 쓰는 offset(`?page=`) 방식이다.
 */
export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  // 화면 접근 차단. 데이터 변경 차단은 service 의 assertRole 이 따로 맡는다.
  // 위키 관리는 EDITOR 부터다 (ADMIN 은 계층상 포함).
  const session = await requireRole("EDITOR");

  const { status: statusParam, page: pageParam } = await searchParams;

  const [categoryBody, listBody] = await Promise.all([
    // 항목 목록은 그대로 self-fetch 다. 세션과 무관해 캐시(1시간)가 걸리므로
    // 직접 호출로 바꿀 사유가 여기엔 해당하지 않는다.
    fetchApi<CategoryListBody>("/api/categories", REVALIDATE.categories),
    adminPageList(session, { status: statusParam, page: pageParam }),
  ]);

  // 마지막 페이지는 서버가 되돌려준 size 로 계산한다. 요청한 size 가 상한(50)에서
  // 접혔으면 실제 쪽수가 달라진다.
  const lastPage = Math.max(Math.ceil(listBody.total / listBody.size), 1);

  // 페이지를 넘겨도 필터가 유지되어야 한다. Pagination 은 basePath 에 이미 쿼리가
  // 있으면 `&` 로 잇는다.
  const basePath = listBody.status
    ? `/admin/pages?status=${listBody.status}`
    : "/admin/pages";

  return (
    <AdminShell role={session.role}>
      {/* 헤더 — Figma Frame 1455 (아이콘 45px + 제목) */}
      <header className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] lg:flex-nowrap lg:gap-[20px]">
        <span
          className="text-[32px] leading-[32px] lg:text-[45px] lg:leading-[45px]"
          aria-hidden
        >
          📚
        </span>
        <h1 className="min-w-0 text-[22px] font-bold leading-[34px] text-black lg:text-[28px]">
          위키 관리
        </h1>
        <span className="text-[16px] leading-[22px] text-gray3">
          {listBody.total}개
        </span>
      </header>

      <div className="mt-[24px]">
        <AdminPageStatusFilter current={listBody.status} />
      </div>

      <AdminPageTable pages={listBody.pages} categories={categoryBody.categories} />

      <Pagination
        basePath={basePath}
        currentPage={listBody.page}
        lastPage={lastPage}
      />
    </AdminShell>
  );
}
