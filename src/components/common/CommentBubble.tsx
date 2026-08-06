type CommentBubbleProps = {
  count: number;
};

/**
 * 댓글 수 말풍선 (Figma 1:892 card-small, 28x24)
 *
 * 홈·목록 카드와 게시물 상세 헤더가 같은 모양을 쓴다. 벡터를 양쪽에 복사해
 * 두면 디자인이 바뀔 때 한쪽만 고쳐진다.
 *
 * Figma 에서 말풍선 벡터는 좌우 반전되어 배치된다.
 */
export default function CommentBubble({ count }: CommentBubbleProps) {
  return (
    <div className="relative h-[24px] w-[28px] shrink-0">
      <svg
        width="28"
        height="24"
        viewBox="0 0 28 24"
        fill="none"
        className="absolute inset-0 -scale-x-100 text-redgray-light"
        aria-hidden
      >
        <path
          d="M4.45455 20.2817L0 24V6.76056C0 4.50704 1.52727 0 7.63636 0H21.3182C23.5455 0.112676 28 1.62254 28 6.76056V12.507C27.8939 14.7606 26.4091 19.2676 21.3182 19.2676H7.63636C7 19.2676 5.72727 19.2676 4.45455 20.2817Z"
          fill="currentColor"
        />
      </svg>
      <span className="absolute left-1/2 top-[calc(50%-3px)] -translate-x-1/2 -translate-y-1/2 text-[13px] font-medium leading-[16px] text-white">
        {count}
      </span>
    </div>
  );
}
