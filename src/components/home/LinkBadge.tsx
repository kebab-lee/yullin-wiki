type LinkBadgeProps = {
  /** 위에 작게 표시되는 텍스트 (Regular) */
  topLabel: string;
  /** 아래에 굵게 표시되는 텍스트 (Bold) */
  bottomLabel: string;
  /** 클릭 시 이동할 외부 URL */
  href?: string;
  /** 아이콘 (이모지나 SVG) */
  icon?: React.ReactNode;
};

/**
 * 히어로 영역 우측의 외부 링크 박스
 * (예: "열린교회 공식페이지", "열린교회 인스타", "열린교회 문화팀")
 */
export default function LinkBadge({
  topLabel,
  bottomLabel,
  href = "#",
  icon,
}: LinkBadgeProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-brand-red-white rounded-[10px] size-[85px] flex flex-col items-center justify-center gap-[7px] p-[5px]"
    >
      <div className="flex flex-col items-center justify-center gap-[5px] text-brand-red text-[14px] leading-[14px]">
        <p className="font-normal">{topLabel}</p>
        <p className="font-bold">{bottomLabel}</p>
      </div>
      {icon ?? (
        <div className="size-[18px] rounded-full border-2 border-brand-red flex items-center justify-center text-brand-red text-[10px]">
          🌐
        </div>
      )}
    </a>
  );
}
