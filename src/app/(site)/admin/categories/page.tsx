import AdminShell from "@/components/admin/AdminShell";
import AdminCategoryList from "@/components/admin/categories/AdminCategoryList";
import type { AdminCategoryListBody } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/requireRole";
import type { SessionPayload } from "@/lib/auth/session";
import * as categoryService from "@/lib/services/categoryService";

/**
 * 항목 목록. **self-fetch 대신 직접 호출이 사는 자리는 여기 하나다.**
 *
 * `requireRole` 이 돌려준 세션을 그대로 넘긴다 — 라우트 핸들러가 `getSession()`
 * 으로 읽어 넘기던 것과 같은 값이라, service 의 `assertRole("ADMIN")` 은
 * 이전과 똑같이 호출된다. **화면 가드가 데이터 가드를 대체하지 않는다.**
 *
 * 반환 타입을 `AdminCategoryListBody` 로 두는 것도 의도다. 라우트가 내려주던
 * 것과 같은 모양이라 화면 코드가 예외를 눈치채지 못하고, Java 이관 시 이 함수
 * 본문만 `fetchApiAsUser` 로 되돌리면 끝난다.
 */
async function adminCategoryList(
  session: SessionPayload,
): Promise<AdminCategoryListBody> {
  return { categories: await categoryService.listCategoriesForAdmin(session) };
}

/**
 * 카테고리 관리 — `/admin/categories`
 *
 * **가드가 ADMIN 이다. EDITOR 가 아니다.** 위키 관리(/admin/pages)와 선이 다르다 —
 * 카테고리는 문서가 아니라 **사이트의 구조**다. 항목 하나가 홈의 원형 버튼과 전
 * 페이지 공통 푸터, 그리고 `/categories/[slug]` 라는 주소 체계를 함께 움직인다.
 * 글을 쓰는 권한과는 층위가 다르다. LNB 의 minRole(adminMenu.ts)도 같은 ADMIN
 * 이지만 그건 표시 판정일 뿐이다 — 메뉴에서 안 보여도 주소를 직접 치면 요청은
 * 그대로 온다.
 *
 * **이 가드는 데이터 차단을 대체하지 않는다.** API 는 이 페이지를 거치지 않고
 * 직접 호출되므로 categoryService 의 assertRole 이 따로 필요하고, 반대로 service
 * 가드만으로는 화면이 그려지는 것을 막지 못한다 (CLAUDE.md "권한").
 *
 * **공개 목록(fetchApi + REVALIDATE.categories)을 쓰지 않는다.** 관리자만 받을
 * 수 있는 응답인 데다, 이 화면은 **방금 자기가 고친 값을 즉시 봐야 한다** —
 * 1시간 캐시된 공개 응답을 그리면 수정 직후 화면이 안 바뀐 것처럼 보여서 같은
 * 수정을 반복하게 된다.
 *
 * **self-fetch 를 하지 않고 service 를 직접 부른다** (CLAUDE.md "서버 컴포넌트의
 * self-fetch" — 세션 의존 화면의 규칙). 예전에는 fetchApiAsUser 로 자기 라우트를
 * 불렀는데, 그 응답은 사용자마다 달라 no-store 라서 fetch 캐시가 아예 걸리지
 * 않았다 — 왕복 비용을 매 요청 그대로 냈다는 뜻이다. 그 자리는 이 파일 위쪽의
 * adminCategoryList() 하나다.
 *
 * 필터도 페이지네이션도 없다. 항목은 시드로 고정된 소수라 한 화면에 다 들어온다
 * (URL 로 표현할 목록 상태가 아예 없다).
 */
export default async function AdminCategoriesPage() {
  const session = await requireRole("ADMIN");

  const body = await adminCategoryList(session);

  return (
    <AdminShell role={session.role}>
      <AdminCategoryList categories={body.categories} />
    </AdminShell>
  );
}
