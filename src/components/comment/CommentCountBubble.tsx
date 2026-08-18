"use client";

import CommentBubble from "@/components/common/CommentBubble";

import { useComments } from "./CommentsProvider";

/**
 * 게시물 상세 헤더의 댓글 수 말풍선.
 *
 * **모양은 CommentBubble 그대로이고 수만 브라우저에서 온다.** 상세 페이지가
 * 정적 생성이라 `page.commentCount` 는 빌드 시점 값으로 굳는데, 댓글은 그 뒤에도
 * 계속 달린다. 댓글 섹션 헤더의 말풍선과 **같은 context 를 읽으므로** 한 화면의
 * 두 말풍선이 다른 수를 말할 수 없다 (CommentsProvider 주석).
 *
 * 목록을 받기 전에는 정적 HTML 에 박혀 있던 수를 그대로 그린다 — 자리를 비워
 * 두면 말풍선이 깨진 것처럼 보이고, 폭(28x24)이 고정이라 수가 바뀌어도 헤더
 * 배치는 움직이지 않는다.
 */
export default function CommentCountBubble() {
  const { count } = useComments();
  return <CommentBubble count={count} />;
}
