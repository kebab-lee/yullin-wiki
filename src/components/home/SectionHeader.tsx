import Link from "next/link";

type SectionHeaderProps = {
  emoji: string;
  title: string;
  href: string;
};

/**
 * 홈 화면 섹션 좌측 헤더 (Figma 1:368, 143x59)
 * 이모지 / → 를 한 줄에 양끝 배치하고, 15px 아래에 제목.
 */
export default function SectionHeader({ emoji, title, href }: SectionHeaderProps) {
  return (
    <Link
      href={href}
      className="flex w-[143px] shrink-0 flex-col items-start gap-[15px] text-black"
    >
      <div className="flex w-full items-start justify-between">
        <span className="text-[40px] font-bold leading-[22px]">{emoji}</span>
        <span className="text-[25px] font-medium leading-[22px]">→</span>
      </div>
      <p className="whitespace-nowrap text-[20px] font-bold leading-[22px]">{title}</p>
    </Link>
  );
}
