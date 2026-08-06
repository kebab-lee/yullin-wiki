"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    form: "h-[35px] w-[418px] rounded-pill bg-brand-red-white px-5 py-[10px]",
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
 *
 * **검색어를 여기서 검증하지 않고 "보낼 수 있는가"만 묻는다**(isSearchable).
 * 규칙의 정본은 validation/search.ts 이고, 문구를 띄우는 것은 결과 화면의 몫이다 —
 * 35px 알약 안에 에러 문구를 놓을 자리가 없다.
 */
export default function SearchInput({
  variant,
  defaultValue = "",
}: SearchInputProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(defaultValue);

  const style = STYLES[variant];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSearchable(keyword)) return;

    router.push(`/search?q=${encodeURIComponent(keyword.trim())}`);
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

      <button
        type="submit"
        aria-label="검색"
        className="flex shrink-0 items-center justify-center text-brand-red"
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
