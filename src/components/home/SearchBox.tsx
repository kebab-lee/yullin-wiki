"use client";

import { useState } from "react";

/**
 * 메인 검색창 (히어로 영역)
 */
export default function SearchBox() {
  const [keyword, setKeyword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    // TODO: 검색 결과 페이지로 이동
    console.log("검색:", keyword);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border-2 border-brand-red rounded-full h-[52px] w-full flex items-center justify-between px-5 py-2"
    >
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="열린교회의 크고 작은 이야기"
        className="flex-1 bg-transparent text-brand-red text-[18px] font-light leading-[22px] outline-none placeholder:text-brand-red"
      />
      <button type="submit" className="size-[22px] flex items-center justify-center" aria-label="검색">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-brand-red">
          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M14.5 14.5L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}
