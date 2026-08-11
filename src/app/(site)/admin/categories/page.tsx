import AdminShell from "@/components/admin/AdminShell";
import AdminCategoryList from "@/components/admin/categories/AdminCategoryList";
import { fetchApiAsUser } from "@/lib/api/serverFetch";
import type { AdminCategoryListBody } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/requireRole";

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
 * **공개 목록(fetchApi + REVALIDATE.categories)이 아니라 fetchApiAsUser 다.**
 * 두 가지가 걸린다. 관리자만 받을 수 있는 응답이라 세션 쿠키를 실어야 하고,
 * 무엇보다 이 화면은 **방금 자기가 고친 값을 즉시 봐야 한다** — 1시간 캐시된
 * 공개 응답을 그리면 수정 직후 화면이 안 바뀐 것처럼 보여서 같은 수정을 반복하게
 * 된다. fetchApiAsUser 가 no-store 로 고정한다.
 *
 * 필터도 페이지네이션도 없다. 항목은 시드로 고정된 소수라 한 화면에 다 들어온다
 * (URL 로 표현할 목록 상태가 아예 없다).
 */
export default async function AdminCategoriesPage() {
  const session = await requireRole("ADMIN");

  const body = await fetchApiAsUser<AdminCategoryListBody>(
    "/api/admin/categories",
  );

  return (
    <AdminShell role={session.role}>
      <AdminCategoryList categories={body.categories} />
    </AdminShell>
  );
}
