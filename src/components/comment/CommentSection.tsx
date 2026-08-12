import Link from "next/link";

import CommentForm from "@/components/comment/CommentForm";
import CommentItem from "@/components/comment/CommentItem";
import CommentBubble from "@/components/common/CommentBubble";
import type { CommentView } from "@/lib/types";

type CommentSectionProps = {
  pageId: string;
  /** 평면 배열. 대댓글도 여기 들어 있고 parentId 로 구분된다. */
  comments: CommentView[];
  /** ADMIN 인가. 남의 댓글에도 삭제 버튼이 붙는다. */
  canModerate: boolean;
  isLoggedIn: boolean;
};

const EMPTY_MESSAGE = "아직 댓글이 없습니다. 첫 댓글을 남겨보세요.";

/** 답글 한 묶음. 부모 id → 그 부모에 달린 답글들. */
type Thread = { root: CommentView; replies: CommentView[] };

/**
 * 평면 배열을 부모-자식으로 묶는다.
 *
 * **이 조립이 서버(repository/service)가 아니라 화면에 있는 것이 의도다.**
 * 트리는 DB 가 답한 사실이 아니라 이 화면이 원하는 모양이고, 계약을 평면으로
 * 두면 백엔드가 Java 로 바뀌어도 프론트가 안 바뀐다
 * (근거는 commentRepository.findByPageId 주석).
 *
 * **부모를 못 찾은 답글은 버리지 않고 최상위로 올린다.** 부모가 지워지면
 * 목록에서 빠지는데(VISIBLE 만 내려온다), 그때 답글까지 화면에서 사라지면
 * 내 삭제가 남의 발언을 지운 것이 된다. 순서는 서버가 준 작성순 그대로다.
 */
function toThreads(comments: readonly CommentView[]): Thread[] {
  const rootIds = new Set(
    comments.filter((c) => c.parentId === null).map((c) => c.id),
  );

  const threads: Thread[] = [];
  const byId = new Map<string, Thread>();

  for (const comment of comments) {
    // 부모가 목록에 없는 답글은 그 자체를 최상위로 취급한다.
    const parent =
      comment.parentId !== null && rootIds.has(comment.parentId)
        ? byId.get(comment.parentId)
        : undefined;

    if (parent) {
      parent.replies.push(comment);
      continue;
    }

    const thread: Thread = { root: comment, replies: [] };
    byId.set(comment.id, thread);
    threads.push(thread);
  }

  return threads;
}

/**
 * 게시물 상세의 댓글 영역 (Figma Frame 1478, 1:535 — 800폭).
 *
 * 서버 컴포넌트다. 목록을 그리는 데 상태가 필요 없고, 조작이 필요한 조각
 * (입력 · 답글 · 삭제)만 클라이언트 컴포넌트로 내려간다.
 *
 * 댓글 수는 목록 길이 그대로다 — 서버가 센 수와 화면에 그려진 줄 수가 다를
 * 여지를 두지 않는다(둘 다 VISIBLE 만 센다).
 */
export default function CommentSection({
  pageId,
  comments,
  canModerate,
  isLoggedIn,
}: CommentSectionProps) {
  const threads = toThreads(comments);

  return (
    // Figma: 본문 아래 y=2968. 목차·본문과 같은 800 폭 안에 들어간다.
    <section className="mt-[40px]">
      {/* Figma 1:536 — 말풍선 + "댓글" + 개수, 아래 구분선.
          말풍선은 상세 헤더·목록 카드와 같은 컴포넌트를 쓴다(개수가 그 안에 든다). */}
      <div className="flex items-center gap-[8px]">
        <CommentBubble count={comments.length} />
        <h2 className="text-[16px] font-bold leading-[20px] text-black">댓글</h2>
      </div>
      <hr className="mt-[12px] border-t border-gray2" />

      <div className="mt-[20px]">
        {isLoggedIn ? (
          <CommentForm pageId={pageId} />
        ) : (
          /* **비로그인에게 폼을 보여주고 제출 때 막지 않는다.** 다 쓴 다음에
             로그인하라고 하면 쓴 내용이 사라진다. 익명 댓글도 로그인이
             필요하다 — "표시만 익명"이라 작성자는 언제나 기록된다. */
          <p className="rounded-card border border-gray2 px-[16px] py-[14px] text-[14px] font-light leading-[22px] text-gray4">
            댓글을 남기려면{" "}
            <Link
              href="/login"
              className="font-medium text-brand-red underline underline-offset-2"
            >
              로그인
            </Link>
            이 필요합니다.
          </p>
        )}
      </div>

      {threads.length === 0 ? (
        <p className="mt-[20px] text-[14px] font-light leading-[22px] text-gray3">
          {EMPTY_MESSAGE}
        </p>
      ) : (
        // Figma 1:545 — 항목 간 20px.
        <ul className="mt-[20px] flex flex-col gap-[20px]">
          {threads.map(({ root, replies }) => (
            <CommentItem
              key={root.id}
              pageId={pageId}
              comment={root}
              replies={replies}
              canModerate={canModerate}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
