import Link from "next/link";
import { notFound } from "next/navigation";

import CategorySideNav from "@/components/page/CategorySideNav";
import PageList from "@/components/page/PageList";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { ApiResponseError, fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody, PagedPageListBody } from "@/lib/api/types";

/**
 * ── 이 라우트는 정적 생성되지 않는다. generateStaticParams 를 넣지 마라 ──
 *
 * 태그 목록은 유한하니 params 를 미리 뽑는 것 자체는 가능하다. **그런데도 안
 * 되는 이유는 params 가 아니라 아래 `searchParams` 다** — Next 는 searchParams 를
 * 읽는 페이지를 요청 시점 렌더로 고정한다. `/categories/[slug]` 에서 이미 측정으로
 * 확인된 사실이고(그쪽 파일 상단 주석), 붙이면 빌드 표에 `●` 로 찍히지만 `.next`
 * 에 HTML 도 prerender-manifest 항목도 생기지 않는 **가짜 ●** 가 된다.
 *
 * 페이지네이션을 포기하고 정적을 택하지 않는 것도 같은 판단이다. `?page=` 로
 * 페이지 상태가 URL 에 드러나야 뒤로가기·공유가 유지된다 (CLAUDE.md "반응형/모바일").
 *
 * 잃는 것은 크지 않다. 목록 데이터는 fetch 캐시(REVALIDATE.pages)를 타므로 DB 까지
 * 내려가지 않고, 게시물을 발행·수정·삭제하는 경로가 전부 `revalidatePath("/",
 * "layout")` 으로 그 캐시를 함께 턴다. 함수가 한 번 깨어나는 비용만 남는다.
 *
 * **self-fetch 를 유지하는 근거도 그것이다.** 직접 호출로 옮기는 기준은 "왕복
 * 비용을 캐시가 흡수하는가" 하나인데(CLAUDE.md), 이 화면의 URL 은 태그별로 고정이라
 * `/search` 처럼 쿼리마다 달라지지 않고 세션에도 무관해 no-store 가 아니다.
 * 캐시가 흡수한다 → self-fetch 다.
 */

/**
 * 태그별 게시물 목록 — `/tags/[name]`
 *
 * **검색 결과가 아니라 목록이다.** 태그는 정확 일치라 유사도 순위가 없고, 그래서
 * 전체 목록·항목별 목록과 같은 PageList·같은 Pagination 을 쓴다. 검색 결과 줄
 * (SearchResultList)을 빌려 오면 발췌 강조라는 없는 규칙이 딸려 온다.
 *
 * 항목 배지를 그리도록 categories 를 넘긴다 — 태그는 항목을 가로지르므로 한 목록
 * 안에 여러 항목의 글이 섞인다. (`/categories/[slug]` 가 안 넘기는 이유의 반대다.)
 */
/**
 * 라우트 파라미터 → 태그 이름.
 *
 * **`params.name` 은 퍼센트 인코딩된 채로 온다.** Next 가 알아서 풀어 줄 것이라
 * 짐작하고 그대로 쓰면 `URLSearchParams` 가 `%` 를 한 번 더 인코딩해서
 * `?tag=%25EC%2588...` 이 나가고, 서버는 그런 태그가 없다며 **모든 한글 태그를
 * 404 로 답한다.** 실제로 그렇게 한 번 틀렸고 서버 로그의 이중 인코딩으로
 * 확인했다. 영문 slug 를 쓰는 `/categories/[slug]` 에서는 인코딩할 문자가 없어
 * 이 함정이 드러나지 않는다 — 한글이 URL 에 들어오는 첫 라우트가 여기다.
 *
 * 실패하면 원문을 그대로 돌려준다. `decodeURIComponent` 는 짝이 안 맞는 `%` 에
 * URIError 를 던지는데(주소창에 손으로 친 `/tags/%`), 그건 500 이 아니라 404 여야
 * 하는 상황이다 — 원문을 넘기면 그런 이름의 태그가 없어 자연히 404 가 된다.
 * 이름에 `%` 가 든 정상적인 태그는 `%25` 로 실려 오므로 여기서 제대로 풀린다.
 */
function decodeTagName(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { name: rawName } = await params;
  const name = decodeTagName(rawName);
  const { page: pageParam } = await searchParams;

  // 잘못된 page 값은 여기서 판정하지 않는다. 그대로 넘기면 service 가 안전한
  // 값으로 접고, 실제로 적용된 값을 응답에 되돌려준다.
  const query = new URLSearchParams({ tag: name });
  if (pageParam) query.set("page", pageParam);

  const [categoryBody, listBody] = await Promise.all([
    fetchApi<CategoryListBody>("/api/categories", REVALIDATE.categories),
    // 없는 태그만 not-found 로 옮기고, DB 장애 같은 나머지 실패는 그대로
    // 터뜨린다. 전부 삼키면 장애가 "없는 태그"로 위장된다.
    fetchApi<PagedPageListBody>(
      `/api/pages?${query.toString()}`,
      REVALIDATE.pages,
    ).catch((error: unknown) => {
      if (error instanceof ApiResponseError && error.status === 404) return null;
      throw error;
    }),
  ]);

  if (!listBody) notFound();

  return (
    <div className="mx-auto max-w-page">
      {/* 전체 목록·항목별 목록·검색 결과와 같은 컨테이너다. */}
      <div className="flex flex-col gap-[24px] px-4 pb-[60px] pt-[24px] lg:flex-row lg:items-start lg:gap-[40px] lg:pb-[100px] lg:pl-[236px] lg:pr-[150px] lg:pt-[60px]">
        {/* 태그는 항목 축이 아니라 어느 칸도 켜지지 않는다. 그래도 네비를 두는
            것은 여기서 항목 목록으로 건너갈 길이 있어야 하기 때문이다 —
            다른 목록 화면들과 같은 자리에 같은 네비가 있다. */}
        <CategorySideNav current={{ type: "tag" }} />

        <div className="min-w-0 flex-1">
          <PageList
            emoji="🏷️"
            title={name}
            pages={listBody.pages}
            total={listBody.total}
            categories={categoryBody.categories}
            basePath={`/tags/${encodeURIComponent(name)}`}
            currentPage={listBody.page}
            size={listBody.size}
          />

          {/* **태그 화면으로 들어오는 진입점은 본문의 태그 칩뿐이다.** 그래서
              "여기 말고 어떤 태그가 있는가"에 답할 길을 이 화면 안에 둔다
              (푸터에 태그 링크를 더하지 않는 것과 짝이다 — 전 페이지에 붙는
              자리는 태그가 있는지도 모르는 사용자에게 먼저 보인다).
              목록 아래에 두는 것은 이 화면의 답을 다 읽은 뒤에 나올 질문이라서다. */}
          <p className="mt-[24px] text-center lg:mt-[30px]">
            <Link
              href="/tags"
              className="inline-flex h-11 items-center text-[15px] leading-[24px] text-gray3 underline underline-offset-4 transition-colors hover:text-brand-red"
            >
              전체 태그 보기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
