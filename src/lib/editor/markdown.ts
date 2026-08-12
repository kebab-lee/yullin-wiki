// =============================================================
// 마크다운 원문 → HTML (단방향)
//
// **단방향만 만든다.** 반대 방향(본문 JSON → md)은 만들지 않는다. 이미지 크기·
// 정렬처럼 md 문법에 자리가 없는 정보는 왕복하면 조용히 사라지는데, 사용자는
// 무엇을 잃었는지 알 수 없다. "마크다운으로 보기" 토글도 같은 이유로 없다.
//
// 여기서 나온 HTML 은 곧바로 화면에 꽂히지 않는다. Tiptap 이 자기 스키마
// (@/lib/editor/extensions.ts)로 다시 파싱하고, 스키마에 없는 태그는 그때
// 버려진다. 즉 방어선이 둘이다 — 이 파일이 만들지 않고, 스키마가 받지 않는다.
//
// **순수 함수만 둔다.** React·DOM·Tiptap 을 import 하지 않는다. 그래야 파싱
// 규칙을 화면 없이 확인할 수 있고, 붙여넣기 UI 가 바뀌어도 규칙은 그대로다.
// =============================================================

import { Marked, type Tokens } from 'marked'

/** 변환 결과 + "무엇이 그대로 오지 못했는가". */
export type MarkdownConversion = {
  readonly html: string
  /** 사용자에게 그대로 보여줄 안내 문구. 비어 있으면 전부 변환됐다는 뜻이다. */
  readonly notes: readonly string[]
  /** 본문에 들어간 외부(원격) 이미지 수. 실패가 아니라 알림거리다. */
  readonly remoteImages: number
}

// ── 붙여넣은 글이 마크다운인가 ────────────────────────────────
/**
 * **목록 표시(`- 항목`, `1. 항목`)는 신호로 치지 않는다.** 한국어 문서에서
 * 그냥 줄머리 기호로 쓰이는 일이 흔해서, 그것만으로 판단하면 평범한 메모를
 * 붙여넣었을 때 목록으로 바뀐다. 아래 중 **하나라도** 보여야 마크다운으로
 * 의심하고, 그때도 곧바로 바꾸지 않고 물어본다(markdownPaste.ts).
 */
const MARKDOWN_SIGNALS: readonly RegExp[] = [
  /^#{1,6}[ \t]+\S/m, // # 제목
  /^```/m, // 코드 펜스
  /^>[ \t]/m, // > 인용
  /^([-*_])(?:[ \t]*\1){2,}[ \t]*$/m, // --- 수평선
  /!?\[[^\]\n]*\]\([^\s)]+\)/, // [링크](주소) · ![이미지](주소)
  /\*\*[^\s*][^*]*\*\*/, // **굵게**
  /~~[^\s~][^~]*~~/, // ~~취소선~~
  /`[^`\n]+`/, // `인라인 코드`
  /^\|.*\|[ \t]*$/m, // | 표 | (지원하지 않지만 마크다운이라는 신호다)
]

export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_SIGNALS.some((signal) => signal.test(text))
}

// ── 주소 검사 ─────────────────────────────────────────────────
/**
 * 링크 주소. `javascript:` 같은 스킴을 걸러낸다.
 *
 * Tiptap Link 확장에도 자체 허용 목록이 있지만 그쪽에 기대지 않는다 — 붙여넣기
 * 경로에서 무엇을 통과시킬지는 이 파일이 정하고, 스키마는 마지막 그물이다.
 * `//evil.com` (프로토콜 생략)은 사이트 밖으로 나가면서도 상대 경로처럼
 * 보이므로 상대 경로 허용에서 따로 뺀다.
 */
function safeHref(href: string): string | null {
  const url = href.trim()
  if (/^(?:https?:|mailto:)/i.test(url)) return url
  if (url.startsWith('//')) return null
  if (/^[/#]/.test(url)) return url
  return null
}

/**
 * 이미지 주소는 http(s) 만 받는다.
 *
 * 상대 경로(`./사진.png`)는 여기 붙여넣는 순간 반드시 깨진 이미지가 되고,
 * `data:` 는 본문에 base64 를 심는 길이라 애초에 막는다
 * (CLAUDE.md "본문에 base64 이미지를 넣지 않는다").
 */
function safeImageSrc(href: string): string | null {
  const url = href.trim()
  return /^https?:\/\//i.test(url) ? url : null
}

// ── 문자열 이스케이프 ─────────────────────────────────────────
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 여러 줄 원문을 문단 하나로. 줄바꿈은 살린다. */
function rawToParagraph(raw: string): string {
  const lines = raw.replace(/\n+$/, '').split('\n').map(escapeHtml)
  return `<p>${lines.join('<br>')}</p>`
}

// ── 변환되지 않은 것 세기 ─────────────────────────────────────
type DropKind =
  | 'table'
  | 'html'
  | 'checkbox'
  | 'headingDepth'
  | 'unsafeLink'
  | 'unsafeImage'

/**
 * 문구를 이 모듈이 소유한다. 컴포넌트는 받아서 그리기만 한다
 * (CLAUDE.md "에러 문구도 검증 모듈이 소유한다"와 같은 결).
 */
const DROP_MESSAGE: Record<DropKind, (count: number) => string> = {
  table: (n) => `표 ${n}개 — 지원하지 않는 문법이라 원문 그대로 두었습니다.`,
  html: (n) => `HTML 태그 ${n}개 — 안전을 위해 제거했습니다.`,
  checkbox: (n) => `체크박스 ${n}개 — 지원하지 않아 표시를 지우고 글자만 남겼습니다.`,
  headingDepth: (n) => `4단계 이하 제목 ${n}개 — 소제목(h3)으로 낮췄습니다.`,
  unsafeLink: (n) => `주소를 쓸 수 없는 링크 ${n}개 — 글자만 남겼습니다.`,
  unsafeImage: (n) =>
    `외부 주소가 아닌 이미지 ${n}개 — 넣을 수 없어 대체 텍스트만 남겼습니다.`,
}

/** 종류별로 세어 두었다가 마지막에 문구로 편다. 순서는 위 표의 선언 순서다. */
type DropTally = Partial<Record<DropKind, number>>

function toNotes(tally: DropTally): string[] {
  return (Object.keys(DROP_MESSAGE) as DropKind[])
    .filter((kind) => (tally[kind] ?? 0) > 0)
    .map((kind) => DROP_MESSAGE[kind](tally[kind] as number))
}

// ── 변환 ──────────────────────────────────────────────────────
/**
 * 스키마가 아는 제목은 h1~h3 뿐이다(extensions.ts 의 `heading.levels`).
 * h4 이하를 그대로 내보내면 Tiptap 이 제목으로 알아보지 못해 평범한 문단이
 * 되므로, **제목이라는 사실만이라도 남기려고** h3 으로 낮추고 그 사실을 알린다.
 */
const MAX_HEADING_LEVEL = 3

/**
 * 마크다운 원문을 Tiptap 이 파싱할 HTML 로 바꾼다.
 *
 * 호출마다 Marked 인스턴스를 새로 만든다 — 렌더러가 클로저로 집계표를 붙잡고
 * 있어서, 인스턴스를 재사용하면 지난 변환의 개수가 다음 결과에 섞인다.
 */
export function markdownToHtml(markdown: string): MarkdownConversion {
  const tally: DropTally = {}
  let remoteImages = 0

  const bump = (kind: DropKind) => {
    tally[kind] = (tally[kind] ?? 0) + 1
  }

  const marked = new Marked({ gfm: true })

  marked.use({
    renderer: {
      /**
       * **raw HTML 은 통째로 버린다.** 마크다운은 HTML 을 그대로 품을 수 있어서
       * `<script>` 가 원문에 섞여 올 수 있는데, 그걸 통과시킬 이유가 없다.
       * "EDITOR 만 글을 쓴다"는 신뢰 경계에 기대지 않는다 — EDITOR 는 보안
       * 담당자가 아니고, 출처를 모르는 문서를 붙여넣는 쪽이 오히려 흔하다.
       * 태그 하나하나를 판별해 착한 것만 남기는 길은 가지 않는다. 허용 목록은
       * 틀리기 쉽고, 여기서 얻을 것은 `<b>` 몇 개뿐이다.
       */
      html() {
        bump('html')
        return ''
      },

      heading({ tokens, depth }: Tokens.Heading) {
        const level = Math.min(depth, MAX_HEADING_LEVEL)
        if (depth > MAX_HEADING_LEVEL) bump('headingDepth')
        return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`
      },

      /**
       * 표는 지원 문법이 아니다. **새 확장(Table)을 넣지 않는다** — 스키마가
       * 늘면 렌더러·목차·반응형 래퍼까지 함께 손봐야 해서 범위가 터진다
       * (CLAUDE.md 반응형 규칙의 표 항목). 대신 조용히 버리지 않고 원문을
       * 평문으로 남겨서, 사용자가 직접 옮길 재료를 잃지 않게 한다.
       */
      table(token: Tokens.Table) {
        bump('table')
        return rawToParagraph(token.raw)
      },

      /** 체크박스도 스키마에 없다. 표시만 지우고 항목 글자는 목록으로 남는다. */
      checkbox() {
        bump('checkbox')
        return ''
      },

      /**
       * 이미지만 있는 문단은 `<p>` 로 감싸지 않는다.
       *
       * Tiptap 의 image 는 블록 노드라, `<p><img></p>` 를 파싱하면 이미지가
       * 문단 밖으로 끌려 나오면서 **빈 문단 하나가 남는다**. 마크다운에서
       * 이미지는 대개 한 줄에 혼자 있으므로(`![alt](url)`), 그 흔한 경우에
       * 본문이 빈 줄로 지저분해지지 않게 여기서 벗겨 둔다.
       */
      paragraph({ tokens }: Tokens.Paragraph) {
        const inline = this.parser.parseInline(tokens)
        const onlyImages = tokens.every(
          (token) => token.type === 'image' || token.type === 'space'
        )
        return onlyImages ? `${inline}\n` : `<p>${inline}</p>\n`
      },

      link({ href, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens)
        const safe = safeHref(href)
        if (!safe) {
          bump('unsafeLink')
          return text
        }
        return `<a href="${escapeHtml(safe)}">${text}</a>`
      },

      /**
       * 이미지는 원격 주소 그대로 둔다. 서버로 다시 올리지 않는다 — 별도 과제다.
       * 대신 몇 장이 외부에 걸려 있는지 세어서 알린다 (원본이 사라지면 본문에서
       * 함께 사라지는 이미지라는 뜻이므로 사용자가 알아야 한다).
       */
      image({ href, text }: Tokens.Image) {
        const safe = safeImageSrc(href)
        if (!safe) {
          bump('unsafeImage')
          return escapeHtml(text)
        }
        remoteImages += 1
        return `<img src="${escapeHtml(safe)}"${text ? ` alt="${escapeHtml(text)}"` : ''}>`
      },
    },
  })

  const html = marked.parse(markdown, { async: false })

  return { html, notes: toNotes(tally), remoteImages }
}
