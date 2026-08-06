import { renderContentToHtml } from "@/lib/editor/renderContent";
import type { PageContent } from "@/lib/types";

type ArticleBodyProps = {
  content: PageContent;
};

/**
 * 본문 (Figma 1:1330)
 *
 * ProseMirror JSON 을 서버에서 HTML 로 만들어 넣는다. 이 화면은 읽기 전용이라
 * 에디터 런타임을 클라이언트로 보낼 이유가 없고, 그래야 본문이 HTML 로 내려가
 * 검색엔진에 잡힌다.
 *
 * ── dangerouslySetInnerHTML 를 쓰는 근거 ──
 * pages.content 는 관리자만 작성하므로 신뢰 경계 안쪽이고, 문자열도 Tiptap
 * 스키마를 통과한 결과라 스키마에 없는 태그·속성은 애초에 생성되지 않는다.
 * 자세한 근거는 renderContentToHtml 주석에 있다.
 *
 * **사용자 입력(댓글)에는 이 방식을 쓰지 않는다.** 댓글은 plain text 로 저장하고
 * JSX 로 그대로 그린다 — React 가 이스케이프한다.
 */
export default function ArticleBody({ content }: ArticleBodyProps) {
  const html = renderContentToHtml(content);

  return (
    <div
      className="wiki-article"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
