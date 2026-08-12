"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { readCategoryParam, searchHref } from "@/lib/search/searchUrl";
import { isSearchable } from "@/lib/validation/search";

/**
 * 놓이는 자리. **모양만 다르고 하는 일은 같다.**
 *
 *   hero    홈 히어로 안 (Figma Frame 1301 / 1:2118 — 52px, 흰 바탕에 빨간 테두리)
 *   header  헤더 안 (Figma 1:448 / 1:1696 — 35x418, 연분홍 알약)
 *
 * 두 시안은 크기·색만 다르고 동작(제출하면 /search 로 간다)이 완전히 같다.
 * 컴포넌트를 두 벌로 두면 검색 진입 경로가 둘로 갈려서, 한쪽만 고쳐지는 순간
 * 헤더에서 검색한 결과와 히어로에서 검색한 결과가 달라진다
 * (CLAUDE.md "로그인/로그아웃 버튼처럼 헤더와 히어로가 공유하는 조각"과 같은 결).
 */
type SearchInputVariant = "hero" | "header";

type SearchInputProps = {
  variant: SearchInputVariant;
  /** 검색 결과 화면에서 방금 쓴 검색어를 되살릴 때. */
  defaultValue?: string;
};

const STYLES: Record<
  SearchInputVariant,
  { form: string; input: string; placeholder: string }
> = {
  hero: {
    form: "h-[52px] w-full rounded-full border-2 border-brand-red bg-white px-5 py-2",
    input:
      "text-[18px] font-light leading-[22px] text-brand-red placeholder:text-brand-red",
    placeholder: "열린교회의 크고 작은 이야기",
  },
  header: {
    // 좁은 화면에서는 전폭 + 44px 높이(터치 타깃 하한)로 늘어나고,
    // lg 부터 시안의 35x418 알약으로 되돌아간다.
    form: "h-11 w-full rounded-pill bg-brand-red-white px-5 lg:h-[35px] lg:w-[418px] lg:py-[10px]",
    input:
      "text-[18px] font-medium leading-[22px] text-brand-red-muted placeholder:text-brand-red-muted",
    placeholder: "전체 검색",
  },
};

/** 히어로 시안의 돋보기. 헤더 시안은 아이콘 파일(/icons/search.svg)을 쓴다. */
function SearchGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M14.5 14.5L20 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 전체 검색 입력. 제출하면 `/search?q=` 로 이동한다.
 *
 * **form 의 method/action 을 그대로 살려 둔다.** JS 가 아직 안 붙었거나 꺼져 있어도
 * 브라우저가 `GET /search?q=…` 로 보내 준다 — 검색은 링크를 공유할 수 있어야 하는
 * 기능이라 URL 이 정본이고, 자바스크립트는 그 위의 편의다. onSubmit 에서
 * preventDefault 하는 것은 전체 새로고침 대신 클라이언트 라우팅을 쓰기 위함이다.
 * **항목 조건도 hidden input 으로 폼 안에 둔다** — router.push 쪽에만 실으면
 * JS 없이 제출됐을 때 항목만 조용히 풀린다.
 *
 * **검색어를 여기서 검증하지 않고 "보낼 수 있는가"만 묻는다**(isSearchable).
 * 규칙의 정본은 validation/search.ts 이고, 문구를 띄우는 것은 결과 화면의 몫이다 —
 * 35px 알약 안에 에러 문구를 놓을 자리가 없다.
 */
function SearchForm({
  variant,
  defaultValue = "",
  categorySlug,
}: SearchInputProps & { categorySlug: string | null }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(defaultValue);

  const style = STYLES[variant];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSearchable(keyword)) return;

    router.push(searchHref({ query: keyword, category: categorySlug }));
  };

  return (
    <form
      action="/search"
      method="get"
      role="search"
      onSubmit={handleSubmit}
      className={`flex items-center justify-between gap-2 ${style.form}`}
    >
      <input
        type="search"
        // name 이 곧 쿼리스트링 키다. JS 없이 제출돼도 /search?q= 로 간다.
        name="q"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder={style.placeholder}
        aria-label="전체 검색"
        className={`min-w-0 flex-1 bg-transparent outline-none ${style.input}`}
      />

      {/* 지금 보고 있는 항목을 검색에 그대로 얹는다. 이것이 없으면 항목 목록에서
          검색하는 순간 항목이 풀려 전체 검색이 된다. */}
      {categorySlug && (
        <input type="hidden" name="category" value={categorySlug} />
      )}

      <button
        type="submit"
        aria-label="검색"
        className="-mr-2 flex size-11 shrink-0 items-center justify-center text-brand-red lg:mr-0 lg:size-auto"
      >
        {variant === "hero" ? (
          <SearchGlyph />
        ) : (
          <Image src="/icons/search.svg" alt="" width={20} height={20} />
        )}
      </button>
    </form>
  );
}

/** `/categories/space` 에서 slug 를 뽑는다. 그 외 경로에서는 null. */
function categorySlugFromPathname(pathname: string): string | null {
  const matched = /^\/categories\/([^/]+)/.exec(pathname);
  return matched ? decodeURIComponent(matched[1]) : null;
}

/**
 * 지금 걸려 있는 항목을 URL 에서 읽어 폼에 얹는다.
 *
 * **props 로 내려받을 수 없어서 URL 을 직접 읽는다.** 이 입력은 헤더 안에 있고
 * (`SiteHeader` → `PublicHeaderView`/`AdminHeaderView`), Next 의 layout 은
 * searchParams 를 받지 못한다 — 서버에서 내려줄 방법이 아예 없다. 클라이언트
 * 상태로 드는 것도 아니다. 정본은 여전히 URL 이고 여기서는 읽기만 한다.
 *
 * 두 자리를 함께 보는 이유는 조건이 경로와 쿼리 양쪽에 살기 때문이다:
 *   `/categories/space`            항목 목록 — 경로가 조건이다
 *   `/search?q=…&category=space`   항목 내 검색 — 쿼리가 조건이다
 */
function CategoryAwareSearchForm(props: SearchInputProps) {
  const pathname = usePathname();
  const params = useSearchParams();

  const categorySlug =
    categorySlugFromPathname(pathname) ?? readCategoryParam(params.get("category"));

  return <SearchForm {...props} categorySlug={categorySlug} />;
}

/**
 * useSearchParams 는 정적 프리렌더를 중단시키므로 Suspense 경계가 위에 있어야
 * 한다. 경계를 호출부(헤더 두 곳 + 홈 히어로)마다 두면 세 곳이 각자 fallback 을
 * 갖게 되고 한 곳만 빠뜨리면 그 페이지의 빌드가 깨진다 — 경계를 컴포넌트가
 * 스스로 갖는다.
 *
 * fallback 이 **항목 없는 같은 폼**인 것이 중요하다. 모양이 완전히 같아서 깜빡임이
 * 없고, 최악의 경우에도 동작이 "전체 검색으로 나간다"까지만 후퇴한다.
 */
export default function SearchInput(props: SearchInputProps) {
  return (
    <Suspense fallback={<SearchForm {...props} categorySlug={null} />}>
      <CategoryAwareSearchForm {...props} />
    </Suspense>
  );
}
