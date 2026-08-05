import Image from "next/image";

/**
 * 헤더 안의 전체 검색 입력 (Figma 1:448 / 1:1696).
 * 유저 헤더와 관리자 헤더가 동일한 모양을 쓰므로 한 곳에만 둔다.
 */
export default function HeaderSearchBox() {
  return (
    <div className="flex h-[35px] w-[418px] items-center justify-between gap-2 rounded-pill bg-brand-red-white px-5 py-[10px]">
      <input
        type="text"
        placeholder="전체 검색"
        aria-label="전체 검색"
        // TODO: 검색 API 연동 시 제출 핸들러 추가 (GET /api/search)
        className="flex-1 bg-transparent text-[18px] font-medium leading-[22px] text-brand-red-muted outline-none placeholder:text-brand-red-muted"
      />
      <button type="button" aria-label="검색" className="shrink-0">
        <Image src="/icons/search.svg" alt="" width={20} height={20} />
      </button>
    </div>
  );
}
