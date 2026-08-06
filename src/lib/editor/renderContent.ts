// =============================================================
// 읽기 전용 본문 렌더러 — ProseMirror JSON → HTML 문자열 (서버 전용)
//
// 방식 선택: Tiptap Editor 를 editable:false 로 띄우는 대신 generateHTML 로
// 서버에서 HTML 을 만든다. 상세 페이지가 서버 컴포넌트로 남아 본문이 HTML 로
// 내려가므로 검색엔진이 읽고, 읽기만 하는 화면에 에디터 런타임(@tiptap/react +
// ProseMirror view)을 클라이언트 번들로 실어 나르지 않는다.
//
// **@tiptap/html/server 를 명시적으로 가져온다.** 패키지 루트(@tiptap/html)는
// 브라우저/노드 조건부 export 라 번들러 설정에 따라 갈리는데, 이 모듈은 서버
// 컴포넌트에서만 불리므로 갈릴 여지를 두지 않는다.
// =============================================================

import { Extension } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";

import type { PageContent } from "@/lib/types";

import { contentExtensions } from "./extensions";
import { withHeadingIds } from "./toc";

/**
 * heading 에 id 속성을 허용하는 렌더러 전용 확장.
 *
 * Tiptap 스키마에 선언되지 않은 attrs 는 조용히 버려지므로, toc.ts 가 심어 준
 * id 를 HTML 까지 내보내려면 스키마가 그 속성을 알아야 한다.
 *
 * 공용 extensions.ts 가 아니라 여기 두는 이유: 이 속성은 **읽기 화면의 앵커**
 * 용도이고 에디터가 저장하는 JSON 에는 없어야 한다. 렌더러 쪽에만 속성이
 * 더 있는 것은 안전하다(모르는 속성을 버릴 뿐 노드가 사라지지 않는다).
 * 반대 방향 — 에디터에만 있는 노드 — 이 위험한 경우이고 그건 extensions.ts 가 막는다.
 */
const HeadingAnchor = Extension.create({
  name: "headingAnchor",

  addGlobalAttributes() {
    return [
      {
        types: ["heading"],
        attributes: {
          id: {
            default: null,
            // 파싱은 하지 않는다. 이 속성은 렌더 시점에만 생긴다.
            parseHTML: () => null,
            renderHTML: (attributes) =>
              attributes.id ? { id: attributes.id as string } : {},
          },
        },
      },
    ];
  },
});

/**
 * 본문 JSON 을 HTML 문자열로 만든다.
 *
 * ── 이 결과를 dangerouslySetInnerHTML 로 넣어도 되는 근거 ──
 * pages.content 는 **EDITOR 이상만** 작성한다. 회원가입으로 얻는 USER 역할로는
 * 게시물을 쓸 수 없고, EDITOR·ADMIN 승격은 DB 에서 수동으로만 이뤄진다
 * (CLAUDE.md "관리자 계정은 공개 가입 대상이 아니다"). 즉 이 문자열의 출처는
 * 신뢰 경계 안쪽이다 — 역할이 하나 늘어도 "공개 가입으로는 못 얻는다"는
 * 전제는 그대로다.
 *
 * 더구나 여기서 나오는 HTML 은 임의 문자열이 아니라 Tiptap 스키마를 통과한
 * 결과다. 스키마에 없는 노드·속성은 generateHTML 이 버리므로 <script> 같은
 * 태그는 애초에 만들어지지 않는다.
 *
 * **댓글처럼 사용자 입력에는 이 방식을 쓰지 않는다.** 댓글 본문은 plain text 로
 * 저장하고 JSX 로 그대로 렌더한다(React 가 이스케이프한다). 이 함수를 재사용
 * 대상으로 삼지 마라.
 */
export function renderContentToHtml(content: PageContent): string {
  // PageContent 는 의도적으로 불투명한 타입이다(readonly unknown[]). 그 안을
  // 들여다봐도 되는 예외가 렌더러이므로, Tiptap 의 JSONContent 로 좁히는 일을
  // **여기 한 곳에서만** 한다. 이 캐스트가 밖으로 번지면 에디터 타입이 도메인
  // 전체로 새어나간다.
  const doc = withHeadingIds(content) as unknown as JSONContent;

  return generateHTML(doc, [...contentExtensions, HeadingAnchor]);
}
