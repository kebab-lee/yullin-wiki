import Link from "next/link";

type MoreButtonProps = {
  href: string;
};

/**
 * 섹션 우측 "더보기" 버튼 (Figma 1:879 more, 57x50)
 * 화살표는 Figma에서 내보낸 벡터(11x18)를 그대로 사용한다.
 */
export default function MoreButton({ href }: MoreButtonProps) {
  return (
    <Link
      href={href}
      className="flex shrink-0 flex-col items-center justify-center gap-[10px] pr-[10px]"
    >
      <svg width="11" height="18" viewBox="0 0 11 18" fill="none" className="text-gray3" aria-hidden>
        <path
          d="M7.00007 9.00006L0 2L2.00002 0L11 9.00006L2.00002 18L0 16L7.00007 9.00006Z"
          fill="currentColor"
        />
      </svg>
      <span className="whitespace-nowrap text-[18px] leading-[22px] text-gray3">더보기</span>
    </Link>
  );
}
