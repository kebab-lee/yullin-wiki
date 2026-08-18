"use client";

import Link from "next/link";

import CommentForm from "@/components/comment/CommentForm";
import CommentItem from "@/components/comment/CommentItem";
import { useComments } from "@/components/comment/CommentsProvider";
import CommentBubble from "@/components/common/CommentBubble";
import { hasRole } from "@/lib/auth/roles";
import { useViewerRole } from "@/lib/auth/viewerRoleClient";
import type { CommentView } from "@/lib/types";

type CommentSectionProps = {
  pageId: string;
};

const EMPTY_MESSAGE = "아직 댓글이 없습니다. 첫 댓글을 남겨보세요.";
const LOADING_MESSAGE = "댓글을 불러오는 중입니다...";
const RETRY_LABEL = "다시 시도";

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
 * ── 왜 클라이언트 컴포넌트인가 ──────────────────────────────
 * 예전에는 서버 컴포넌트였고 목록도 권한도 props 로 받았다. 상세 페이지가
 * 정적 생성으로 바뀌면서 그 props 는 전부 **빌드 시점 값**이 된다 — 목록은
 * 그때 이후의 댓글을 모르고, `isMine`·`canModerate` 는 빌드한 사람의 세션으로
 * 굳는다. 그래서 이 컴포넌트가 쓰는 값의 출처가 둘 다 브라우저로 내려왔다:
 *   · 목록 — CommentsProvider (fetch)
 *   · 역할 — viewerRoleClient (헤더와 같은 스토어, 탭당 요청 한 번)
 *
 * **역할은 여전히 표시용이다.** 남의 댓글을 내리는 것은 ADMIN 뿐이라는 판정은
 * commentService.deleteComment 가 하고, 이 화면이 버튼을 감추는 것은 안내다
 * (CLAUDE.md "권한": 두 방어선은 서로를 대체하지 않는다).
 *
 * 댓글 수는 목록 길이 그대로다 — 서버가 센 수와 화면에 그려진 줄 수가 다를
 * 여지를 두지 않는다(둘 다 VISIBLE 만 센다). 본문 헤더의 말풍선도 같은
 * context 를 읽는다 (CommentCountBubble).
 */
export default function CommentSection({ pageId }: CommentSectionProps) {
  const { comments, count, error, reload } = useComments();
  const { role, ready } = useViewerRole();

  // 아직 모르는 동안은 비로그인처럼 다루되 **화면에 단정하지 않는다** —
  // 아래 폼 자리가 그 사이를 자리잡기용 자리로 채운다.
  const isLoggedIn = ready && role !== "GUEST";
  const canModerate = ready && role !== "GUEST" && hasRole(role, "ADMIN");

  const threads = comments === null ? null : toThreads(comments);

  return (
    // Figma: 본문 아래 y=2968. 목차·본문과 같은 800 폭 안에 들어간다.
    <section className="mt-[40px]">
      {/* Figma 1:536 — 말풍선 + "댓글" + 개수, 아래 구분선.
          말풍선은 상세 헤더·목록 카드와 같은 컴포넌트를 쓴다(개수가 그 안에 든다). */}
      <div className="flex items-center gap-[8px]">
        <CommentBubble count={count} />
        <h2 className="text-[16px] font-bold leading-[20px] text-black">댓글</h2>
      </div>
      <hr className="mt-[12px] border-t border-gray2" />

      <div className="mt-[20px]">
        {!ready ? (
          /* 역할을 아직 모르는 동안. **가장 넓은 상태(입력 폼)로 자리를 잡고**
             invisible 로 감춘다 — 헤더의 ViewerAuthActions 와 같은 기법이다.
             opacity-0 이 아닌 이유도 같다: 안 보이는 입력 칸이 눌리면 안 된다. */
          <div className="invisible" aria-hidden>
            <CommentForm pageId={pageId} />
          </div>
        ) : isLoggedIn ? (
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

      {/* 목록 자리. **로딩·빈 목록·목록이 같은 상자 안이고 min-h 로 바닥을
          미리 잡는다** — 안내 문구 한 줄에서 댓글 한 건으로 바뀔 때 아래 내용이
          끌려 올라오지 않게 한다(댓글 한 건 높이가 약 76px). */}
      <div className="mt-[20px] min-h-[76px]">
        {/* **실패해도 이미 받아 둔 목록은 지우지 않는다.** 다시 읽기가 실패한
            것이 이미 보고 있던 댓글이 사라질 이유는 아니다 — 문구를 위에 얹고
            목록은 그대로 둔다. 첫 읽기가 실패한 경우에만 아래가 비고, 그때는
            "불러오는 중"이 아니라 이 문구가 남아야 한다. */}
        {error ? (
          <p
            role="alert"
            className="mb-[12px] text-[14px] leading-[22px] text-brand-red"
          >
            {error}{" "}
            <button
              type="button"
              onClick={reload}
              className="font-medium underline underline-offset-2"
            >
              {RETRY_LABEL}
            </button>
          </p>
        ) : null}

        {threads === null ? (
          error ? null : (
            <p className="text-[14px] font-light leading-[22px] text-gray3">
              {LOADING_MESSAGE}
            </p>
          )
        ) : threads.length === 0 ? (
          <p className="text-[14px] font-light leading-[22px] text-gray3">
            {EMPTY_MESSAGE}
          </p>
        ) : (
          // Figma 1:545 — 항목 간 20px.
          <ul className="flex flex-col gap-[20px]">
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
      </div>
    </section>
  );
}
