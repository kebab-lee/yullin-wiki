import { GlobeIcon } from "./LinkBadgeIcons";

type LinkBadgeProps = {
  /** 위에 작게 표시되는 텍스트 (Regular) */
  topLabel: string;
  /** 아래에 굵게 표시되는 텍스트 (Bold) */
  bottomLabel: string;
  /** 클릭 시 이동할 외부 URL */
  href?: string;
  /**
   * 아이콘. `LinkBadgeIcons` 의 글리프를 넘긴다 — 색은 배지가 정하는
   * text-brand-red 를 currentColor 로 물려받는다. 안 넘기면 지구본.
   */
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
      aria-label={`${topLabel} ${bottomLabel} (새 창)`}
      className="bg-brand-red-white rounded-[10px] size-[85px] flex flex-col items-center justify-center gap-[7px] p-[5px] text-brand-red transition-opacity hover:opacity-90"
    >
      <div className="flex flex-col items-center justify-center gap-[5px] text-[14px] leading-[14px]">
        <p className="font-normal">{topLabel}</p>
        <p className="font-bold">{bottomLabel}</p>
      </div>
      {/* 높이 18px 자리를 고정한다 — 유튜브 글리프만 가로로 넓고 세로가 낮아서,
          자리를 안 잡으면 배지 셋의 텍스트 baseline 이 서로 어긋난다. */}
      <span className="flex h-[18px] items-center justify-center">
        {icon ?? <GlobeIcon />}
      </span>
    </a>
  );
}
