"use client";

// =============================================================
// 한 게시물의 댓글 — 브라우저가 읽는다
//
// **게시물 상세(/pages/[id])가 정적 생성이라 여기 있다.** 예전에는 페이지가
// 서버에서 `/api/pages/[id]/comments` 를 fetch 해서 목록을 props 로 내려줬는데,
// 그 라우트를 프리렌더하는 순간 그 응답이 **빌드 시점 값으로 굳는다** —
// 그 뒤에 달린 댓글은 revalidate 가 돌 때까지 아무에게도 보이지 않고, 반대로
// 응답에 실린 `isMine`(내 댓글인가)은 빌드한 사람 기준으로 굳어 남의 댓글에
// 삭제 버튼이 붙는다. 세션 의존 조각을 브라우저로 내리는 것은 헤더에서 쓴
// 방법과 같다 (viewerRoleClient — CLAUDE.md "헤더의 로그인 상태").
//
// **폴링하지 않는다.** 마운트 때 한 번 읽고, 그 뒤에는 이 화면이 무언가를
// 바꿨을 때만(댓글 작성 · 답글 · 삭제) `reload()` 로 다시 읽는다. 남이 쓴 댓글이
// 실시간으로 나타날 필요는 없고, 그러자고 타이머를 걸면 열려 있는 탭 수만큼
// DB 를 친다.
//
// ── 왜 context 인가 ──────────────────────────────────────────
// 같은 수를 말해야 하는 곳이 둘이다: 댓글 섹션 헤더의 말풍선과 **본문 헤더
// (ArticleHeader)의 말풍선**. 둘은 DOM 상 멀리 떨어져 있고 사이에 서버
// 컴포넌트(본문)가 끼어 있어서 props 로 잇지 못한다. 목록을 두 번 fetch 하면
// 두 말풍선이 다른 수를 말할 수 있다.
// =============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import type { CommentListBody } from "@/lib/api/types";
import type { CommentView } from "@/lib/types";

type CommentsValue = {
  /** 아직 못 받았으면 null. 빈 배열(댓글 없음)과 구분된다. */
  comments: CommentView[] | null;
  /**
   * 말풍선에 그릴 수. 받기 전에는 정적 HTML 에 박혀 있던 수를 그대로 쓴다 —
   * 페이지의 나머지(제목·본문)와 같은 시점의 값이라 화면이 앞뒤로 어긋나지
   * 않고, 빈 말풍선이 잠깐 보이는 것보다 낫다. 받은 뒤에는 목록 길이가 정본이다.
   */
  count: number;
  error: string | null;
  reload: () => void;
};

const CommentsContext = createContext<CommentsValue | null>(null);

/** Provider 밖에서 부르면 던진다 — 조용히 0 을 그리면 말풍선만 틀린다. */
export function useComments(): CommentsValue {
  const value = useContext(CommentsContext);
  if (!value) {
    throw new Error("useComments 는 CommentsProvider 안에서만 쓸 수 있습니다.");
  }
  return value;
}

export default function CommentsProvider({
  pageId,
  initialCount,
  children,
}: {
  pageId: string;
  /** 정적 렌더 시점의 댓글 수(page.commentCount). 받기 전까지의 표시용. */
  initialCount: number;
  children: React.ReactNode;
}) {
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      // no-store 다. 응답에 isMine 이 실려 사용자마다 다르고, 방금 쓴 댓글이
      // 바로 보여야 한다 (서버 쪽 fetchApiAsUser 가 같은 이유로 no-store 였다).
      const response = await fetch(`/api/pages/${pageId}/comments`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await readErrorBody(response);
        setError(body.message);
        return;
      }

      const body = (await response.json()) as CommentListBody;
      setComments(body.comments);
    } catch {
      setError(NETWORK_ERROR);
    }
  }, [pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<CommentsValue>(
    () => ({
      comments,
      count: comments?.length ?? initialCount,
      error,
      reload: () => void load(),
    }),
    [comments, initialCount, error, load],
  );

  return (
    <CommentsContext.Provider value={value}>
      {children}
    </CommentsContext.Provider>
  );
}
