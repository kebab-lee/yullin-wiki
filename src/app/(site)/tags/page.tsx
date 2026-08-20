import Tag from "@/components/common/Tag";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { fetchApi } from "@/lib/api/serverFetch";
import type { TagListBody } from "@/lib/api/types";

/**
 * ⚠️ 임시 — `/api/tags` 가 배포된 뒤 이 한 줄을 지우면 정적으로 돌아간다.
 *
 * 빌드 시점의 self-fetch 는 `getBaseUrl()` 이 가리키는 `NEXT_PUBLIC_SITE_URL`,
 * 즉 **지금 배포돼 있는 사이트**로 나간다. `/api/tags` 는 이번에 새로 만든
 * 엔드포인트라 거기엔 아직 없다 → 프리렌더가 404 로 죽고 배포 전체가 깨진다.
 * (`/pages/[id]` 가 같은 방식으로 멀쩡했던 것은 `/api/pages` 가 이미 배포돼
 * 있었기 때문이다. 이 화면이 신규 API 에 의존하는 첫 정적 페이지다.)
 *
 * **신규 API 에 의존하는 정적 페이지는 첫 배포에서 반드시 실패한다.** 이
 * 화면만의 사고가 아니라 구조적 함정이라 CLAUDE.md 의 빌드 절에도 적어 두었다.
 * 그래서 두 번에 나눠 배포한다: ① 이 줄과 함께 배포해 `/api/tags` 를 띄우고,
 * ② 이 줄을 지우고 다시 배포하면 정적이 된다.
 *
 * **이 화면은 정적 생성이 가능하다** — 실측으로 확인했다. `tags.html` 33KB 가
 * 만들어지고 prerender-manifest 에도 등록된다. 막고 있는 것은 화면의 성질이
 * 아니라 배포 순서뿐이다.
 *
 * 잃는 것은 HTML 프리렌더뿐이고 아래 `fetchApi` 의 `REVALIDATE.pages` 는 그대로
 * 산다 — `force-dynamic` 은 명시적 revalidate 를 가진 fetch 는 건드리지 않는다.
 */
export const dynamic = "force-dynamic";

/**
 * 전체 태그 목록 — `/tags`
 *
 * ── 이 페이지는 정적으로 생성된다 (지금은 위 `dynamic` 이 막고 있다) ──
 * `params` 도 `searchParams` 도 세션도 읽지 않고, 데이터는 캐시되는 fetch
 * 하나(`/api/tags`)뿐이다. `/categories` 와 같은 조건이며, 셋 중 하나라도 읽는
 * 순간 이 라우트는 동적으로 돌아간다 — 태그가 많아져 `?page=` 를 붙이는 날이
 * 그날이다 (`/tags/[name]` 이 이미 그 이유로 동적이다).
 *
 * 갱신은 게시물 쪽 경로가 맡는다. 태그와 그 문서 수를 바꾸는 유일한 길이
 * 게시물의 작성·수정·상태 전환·삭제인데, 그 넷이 전부
 * `revalidatePath("/", "layout")` 으로 이 HTML 과 fetch 캐시를 함께 턴다.
 * **태그 전용 revalidate 경로를 새로 만들지 마라** (CLAUDE.md: 경로를 잘게
 * 나누거나 캐시 태그 체계를 도입하지 않는다).
 *
 * 수명으로 REVALIDATE.pages 를 쓰고 태그 전용 상수를 만들지 않는다. 이 목록이
 * 세는 것이 공개 게시물이라 게시물 목록과 같은 주기로 낡는다 — 별도 수를 두면
 * 같은 사실을 두 수명이 다르게 말하게 된다 (baseUrl.ts 주석).
 * ─────────────────────────────────────────────────────────
 *
 * 정렬(문서 수 내림차순 → 이름순)과 "공개 문서 0건인 태그는 뺀다"는 규칙은
 * 화면이 아니라 tagService 가 갖는다. 여기서 다시 sort 하지 마라 — 두 벌이 되면
 * API 를 직접 부르는 소비자가 다른 순서를 본다.
 *
 * **태그가 많아지면 어떻게 할 것인가.** 지금은 자르지도 넘기지도 않고 전부
 * 그린다(수십 개 규모). 넣어야 하는 시점의 조건은 tagService.listTags 주석에
 * 적어 두었고, 그때 이 화면은 `?page=` 를 읽게 되므로 **정적 생성을 잃는다** —
 * 위 블록이 그 대가를 미리 적어 둔 이유다. 무한 스크롤은 쓰지 않는다.
 */
export default async function TagsPage() {
  const { tags } = await fetchApi<TagListBody>("/api/tags", REVALIDATE.pages);

  return (
    <div className="mx-auto max-w-page">
      {/* `/categories` 와 같은 컨테이너다 — 사이드 네비가 없는 목록 화면. */}
      <div className="px-4 pb-[60px] pt-[24px] lg:pb-[100px] lg:pl-[253px] lg:pr-[276px] lg:pt-[60px]">
        {/* 화면 헤더 — 목록 화면들과 같은 모양(Figma 1:579: 이모지 45px + 제목). */}
        <header className="flex flex-wrap items-center gap-x-[12px] gap-y-[6px] lg:flex-nowrap lg:gap-[20px]">
          <span
            className="text-[32px] leading-[32px] lg:text-[45px] lg:leading-[45px]"
            aria-hidden
          >
            🏷️
          </span>
          <h1 className="text-[22px] font-bold leading-[34px] text-black lg:text-[28px]">
            전체 태그
          </h1>
          <span className="text-[16px] leading-[22px] text-gray3">
            {tags.length}개
          </span>
        </header>

        {tags.length === 0 ? (
          // 태그가 하나도 없는 것은 사고가 아니다 — 아직 태그를 붙인 공개 글이
          // 없을 뿐이라 404 가 아니라 빈 안내다. (`/categories` 가 시드가 비면
          // 404 인 것과 갈린다: 그쪽은 없으면 안 되는 값이다.)
          <p className="mt-[40px] text-[16px] text-gray3">
            아직 사용된 태그가 없습니다.
          </p>
        ) : (
          // 칩을 흘려 놓는다. 줄 간격(`gap-y`)이 가로 간격보다 넓은 것은 모바일
          // 에서 칩 높이가 44px 라 촘촘하면 오히려 누르기 어려워지기 때문이다.
          <ul className="mt-[30px] flex flex-wrap items-center gap-x-[10px] gap-y-[12px] lg:mt-[40px]">
            {tags.map((tag) => (
              <li key={tag.name} className="flex items-center gap-[4px]">
                <Tag name={tag.name} />
                {/* 문서 수는 칩 안이 아니라 옆에 둔다. Tag 는 게시물 상세·목록
                    줄과 공유하는 시안 정본(1:1364)이라, 이 화면에서만 필요한
                    값을 칩 안에 넣으면 저쪽 두 화면이 함께 흔들린다. */}
                <span className="text-[13px] leading-[20px] text-gray3">
                  {tag.pageCount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
