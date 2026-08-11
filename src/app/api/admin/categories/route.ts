// GET  /api/admin/categories — 어드민 항목 관리 목록 (문서 수 포함)
// POST /api/admin/categories — 항목 추가
//
// **공개 GET /api/categories 와 갈라 둔 것이 의도다.** 같은 테이블이지만 둘은
// 답하는 질문도 캐시 전략도 다르다:
//   · 공개 조회 — 홈·푸터·에디터가 부르고, 거의 안 바뀌는 값이라 1시간 캐시된다
//     (REVALIDATE.categories). 문서 수를 모른다.
//   · 관리 조회 — 관리자만 부르고, 방금 자기가 고친 값이 즉시 보여야 하므로
//     캐시하지 않는다(fetchApiAsUser 가 no-store 로 고정). 문서 수를 단다.
// 한 라우트로 겸용하면 캐시 수명이 둘 중 하나로 정해져야 하는데, 공개 쪽에
// 맞추면 관리 화면이 낡은 목록을 보고 관리 쪽에 맞추면 홈이 매 요청마다
// DB 를 친다. 경계가 URL 에 드러나야 Java 쪽에서도 필터 체인을 경로 단위로 나눈다.
//
// **여기서 role 을 검사하지 않는다.** 권한 판정은 categoryService 의 assertRole 이
// 전담한다 (CLAUDE.md "권한"). 세션 유무만 보는 것은 권한 판정이 아니라
// "service 에 넘길 신원이 있는가"이며, /api/admin/pages 와 같은 규칙이다.

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { handleError } from "@/lib/api/handleError";
import type {
  AdminCategoryListBody,
  CategoryCreatedBody,
} from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/errors";
import * as categoryService from "@/lib/services/categoryService";

/**
 * 바뀐 항목이 공개 화면에 곧 보이도록 캐시를 턴다.
 *
 * ── 왜 이게 필요한가 ────────────────────────────────────────────
 * 공개 카테고리 조회는 `REVALIDATE.categories = 3600` 으로 캐시된다. 그대로 두면
 * 관리 화면에서 이름을 고쳐도 홈 버튼·푸터·배지에 최대 한 시간 동안 옛 이름이
 * 남는다. 관리자는 방금 고쳤는데 사이트는 안 바뀐 것처럼 보이므로 같은 수정을
 * 반복하게 된다.
 *
 * ── 왜 revalidateTag 가 아니라 revalidatePath 인가 ──────────────
 * revalidateTag 를 쓰려면 먼저 **fetch 쪽에 태그를 달아야 한다**
 * (`next: { tags: [...] }`). 지금 서버 컴포넌트의 조회는 fetchApi(serverFetch.ts)
 * 한 곳을 지나는데, 거기에 태그 인자를 새로 뚫으면 이 리소스만을 위한 옵션이
 * 공용 fetch 헬퍼의 시그니처에 남고 호출부마다 태그 문자열을 손으로 맞춰야 한다.
 * 한 곳만 빠뜨려도 그 화면만 조용히 낡는다.
 *
 * 반면 카테고리는 **거의 모든 화면에 걸려 있다** — 홈 원형 버튼, 전 페이지 공통
 * 푸터(fullName), 게시물 배지, 목록 사이드 네비, 에디터 셀렉트. 태그를 정교하게
 * 나눠도 결국 전부를 무효화하게 되므로, 얻는 정밀도가 없다. 게시물 수정이
 * `revalidatePath("/", "layout")` 을 쓰는 것과 같은 판단이며(admin/pages/[id]),
 * 이 규모에서는 정확한 경로 목록을 유지하는 비용이 더 크다. 항목 수정은 1년에
 * 몇 번 일어나는 조작이라 전체 무효화의 대가도 사실상 없다.
 *
 * ── Java 이관 시 이 코드는 어떻게 되는가 ────────────────────────
 * `revalidatePath` 는 Next 전용 API 라 그대로 옮겨갈 수 없다. 그래서 **route
 * handler(Next 레이어)에만 둔다** — service 에 넣으면 이관 대상인 도메인 로직에
 * Next 의존이 박힌다. 백엔드가 Spring 으로 바뀌어도 이 파일은 남거나(프론트가
 * Next 인 채로 API 주소만 그쪽을 가리킴) Next 와 함께 사라지고, 그때 캐시
 * 무효화는 프론트의 관심사(SWR/react-query 무효화, CDN purge)로 옮겨간다.
 * categoryService 와 categoryRepository 는 이 줄을 몰라도 그대로 이식된다.
 */
function revalidateCategories(): void {
  revalidatePath("/", "layout");
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    const categories = await categoryService.listCategoriesForAdmin(session);

    return NextResponse.json<AdminCategoryListBody>({ categories });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new UnauthorizedError();

    // 바디는 unknown 그대로 넘긴다. 모양을 좁히는 일은 validation 이 한다.
    const body: unknown = await request.json().catch(() => null);

    const category = await categoryService.createCategory(session, body);
    revalidateCategories();

    return NextResponse.json<CategoryCreatedBody>(
      { id: category.id },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
