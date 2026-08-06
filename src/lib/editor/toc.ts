// =============================================================
// 목차(TOC) — ProseMirror 문서 JSON 에서 heading 을 뽑아 번호를 매긴다.
//
// **순수 함수만 둔다.** React·DOM·Tiptap 을 import 하지 않는다. 목차는 저장하는
// 데이터가 아니라 본문에서 매번 유도하는 값이고(CLAUDE.md "목차와 참고문헌은
// 별도 저장하지 않는다"), 유도 규칙이 컴포넌트 안에 있으면 서버 렌더러와
// 사이드바가 서로 다른 번호를 매기게 된다.
//
// 앵커 id 도 여기서 만든다. 목차 링크(#...)와 본문 heading 의 id 는 반드시
// 같은 규칙으로 나와야 하는데, 그 규칙이 두 파일에 흩어지면 한쪽만 고쳐질 때
// 링크가 조용히 아무 데도 가지 않는다. 그래서 목차 생성(buildToc)과
// id 주입(withHeadingIds)이 같은 순회를 공유하는 이 파일에 함께 산다.
// =============================================================

import type { PageContent } from "@/lib/types";

/** 목차에 올릴 최대 깊이. Figma 시안은 대제목·소제목 두 단이다. */
const MAX_TOC_LEVEL = 2;

export interface TocEntry {
  /** 본문 heading 의 id 이자 앵커 링크 대상. `#${id}` 로 건다. */
  id: string;
  /** 1 = 대제목, 2 = 소제목 */
  level: number;
  /** `1.` / `1.1.` 형태의 번호 문자열 */
  number: string;
  /** heading 안의 텍스트만 이어붙인 값 */
  text: string;
}

/**
 * ProseMirror 노드의 최소 형태.
 *
 * PageContent 는 의도적으로 불투명한 타입이다(CLAUDE.md). 그 안을 들여다봐도
 * 되는 예외가 렌더러와 이 추출기이므로, 필요한 필드만 여기서 좁게 선언하고
 * 밖으로 내보내지 않는다. `any` 를 쓰지 않기 위한 장치이기도 하다.
 */
type JsonNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  text?: string;
};

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null;
}

function toNodes(content: readonly unknown[] | undefined): JsonNode[] {
  return (content ?? []).filter(isJsonNode);
}

/** heading 의 level. 값이 없으면 Tiptap 기본값과 같은 1로 읽는다. */
function levelOf(node: JsonNode): number {
  const level = node.attrs?.level;
  return typeof level === "number" ? level : 1;
}

/** 앵커 id. 제목 텍스트가 아니라 **문서 순번**으로 만든다.
 *
 * 한글 제목을 slug 로 만들면 URL 인코딩이 끼고, 같은 제목이 두 번 나오면
 * id 가 충돌한다. 순번은 둘 다 겪지 않는다. 대신 문서를 고치면 id 가 밀리므로
 * 외부에 공유되는 영구 링크로는 쓰지 않는다 — 페이지 안 목차 전용이다. */
function headingId(index: number): string {
  return `heading-${index}`;
}

/**
 * 문서를 순회하며 heading 노드를 문서 순서대로 방문한다.
 *
 * buildToc 과 withHeadingIds 가 **반드시 같은 순번**을 보게 하려고 순회를
 * 한 곳에 둔다. 깊이 우선이라 blockquote 안에 들어간 heading 도 제자리 순서로
 * 잡힌다.
 */
function walkHeadings(
  nodes: JsonNode[],
  visit: (node: JsonNode, index: number) => void,
  counter = { value: 0 },
): void {
  for (const node of nodes) {
    if (node.type === "heading") {
      visit(node, counter.value);
      counter.value += 1;
    }
    if (node.content) walkHeadings(node.content, visit, counter);
  }
}

/** heading 안의 text 노드만 이어붙인다. 굵게·링크 같은 mark 는 무시한다. */
function textOf(node: JsonNode): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map(textOf).join("");
}

/**
 * `1.` / `1.1.` 형태의 번호를 매기는 카운터.
 *
 * 상위 번호가 아직 0인 상태에서 하위 제목이 먼저 나오면(h1 없이 h2 로 시작하는
 * 본문) `0.1.` 이 되어버리므로 상위를 1로 올려 둔다. 작성자가 건너뛴 단계를
 * 화면에서 0으로 드러내는 것보다 1부터 세는 편이 읽는 사람에게 자연스럽다.
 */
function createNumbering() {
  const counters: number[] = [];

  return (level: number): string => {
    counters.length = Math.max(counters.length, level);
    for (let i = 0; i < level - 1; i += 1) {
      counters[i] = counters[i] || 1;
    }
    counters[level - 1] = (counters[level - 1] ?? 0) + 1;
    // 더 깊은 단계의 카운터는 새 상위 제목이 시작되면 리셋된다.
    counters.length = level;

    return `${counters.join(".")}.`;
  };
}

/** 본문에서 목차를 만든다. heading 이 없으면 빈 배열. */
export function buildToc(content: PageContent): TocEntry[] {
  const nextNumber = createNumbering();
  const entries: TocEntry[] = [];

  walkHeadings(toNodes(content.content), (node, index) => {
    const level = levelOf(node);
    // 번호는 목차에 올리지 않는 깊이(h3)도 세어야 한다. 건너뛰면 그 뒤의
    // 소제목 번호가 어긋난다.
    const number = nextNumber(level);
    if (level > MAX_TOC_LEVEL) return;

    entries.push({ id: headingId(index), level, number, text: textOf(node) });
  });

  return entries;
}

/**
 * 각 heading 에 앵커 id 를 심은 사본을 돌려준다. 원본은 건드리지 않는다.
 *
 * 렌더러가 generateHTML 을 부르기 직전에 통과시킨다. id 를 노드 attrs 로
 * 넣어두면 HTML 생성 뒤에 문자열을 정규식으로 헤집을 필요가 없다.
 */
export function withHeadingIds(content: PageContent): PageContent {
  const ids = new Map<JsonNode, string>();
  walkHeadings(toNodes(content.content), (node, index) => {
    ids.set(node, headingId(index));
  });

  const rewrite = (node: JsonNode): JsonNode => {
    const id = ids.get(node);
    return {
      ...node,
      ...(id ? { attrs: { ...node.attrs, id } } : {}),
      ...(node.content ? { content: node.content.map(rewrite) } : {}),
    };
  };

  return {
    ...content,
    content: toNodes(content.content).map(rewrite),
  };
}
