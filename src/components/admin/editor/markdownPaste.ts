'use client'

// =============================================================
// 마크다운 붙여넣기 (에디터 전용 확장)
//
// **자동으로 바꾸지 않는다.** 붙여넣은 글은 언제나 평소처럼 그대로 들어가고,
// 마크다운처럼 보이면 "서식을 적용할까요?" 하고 물어보기만 한다. 교회 문서를
// 쓰는 사람이 쓰는 기능이라, 틀린 자동 판단은 되돌리는 법을 아는 사람에게만
// 사소하다. 물어보는 방식에서는 아무것도 하지 않는 선택이 기본값이다.
//
// 원문 입력용 모달을 따로 두는 길도 있지만, 그러면 "붙여넣기"라는 이미 아는
// 동작 대신 새 버튼을 찾아 배워야 한다. 지금 방식은 평소대로 붙여넣으면 되고
// 제안이 뜨는 것뿐이다.
//
// **@/lib/editor/extensions.ts 에 두지 않는다.** 그 파일은 읽기 전용 렌더러와
// 공유하는 스키마 정본이고 여기 있는 것은 편집 중 동작이다 (저장되는 JSON 에
// 흔적을 남기지 않는다). imageUpload.ts 를 여기 둔 것과 같은 규칙이다.
// =============================================================

import { Extension, type Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

import {
  looksLikeMarkdown,
  markdownToHtml,
  type MarkdownConversion,
} from '@/lib/editor/markdown'

/** 방금 붙여넣은 마크다운 원문과 그것이 들어간 자리. */
export type MarkdownOffer = {
  readonly from: number
  readonly to: number
  readonly text: string
}

/** 제안이 생기거나(offer) 사라졌음(null)을 화면 쪽에 알리는 통로. */
type ReportOffer = (offer: MarkdownOffer | null) => void

const markdownPasteKey = new PluginKey<MarkdownOffer | null>('markdownPaste')

/** 제안을 거두는 메타. 변환을 끝냈을 때 쓴다. */
const CLEAR = { clear: true } as const

/**
 * 붙여넣은 글이 마크다운 후보인지.
 *
 * **text/html 이 함께 온 붙여넣기는 후보가 아니다.** 웹 페이지나 문서 앱에서
 * 복사하면 클립보드에 서식 있는 HTML 이 실려 오고, 그건 이미 서식을 가진
 * 내용이라 ProseMirror 가 알아서 변환한다. 마크다운 **원문**은 편집기나 .md
 * 파일에서 복사한 순수 텍스트로 온다. 이 한 줄이 오탐의 큰 몫을 걷어낸다.
 */
function markdownCandidate(clipboard: DataTransfer | null): string | null {
  if (!clipboard) return null
  if (clipboard.getData('text/html')) return null

  const text = clipboard.getData('text/plain')
  return text && looksLikeMarkdown(text) ? text : null
}

/**
 * 붙여넣기를 지켜보다가 제안을 띄우는 확장.
 *
 * createImageUpload 와 같은 팩토리 꼴이다 — 제안을 어디에 그릴지는 확장이
 * 아니라 폼이 아는 일이라 콜백으로 받는다.
 */
export function createMarkdownPaste(onOffer: ReportOffer) {
  /**
   * handlePaste 는 붙여넣기 트랜잭션 **전에** 불린다. 그래서 원문과 시작
   * 위치만 여기 적어 두고, 실제 범위는 트랜잭션이 지나간 뒤에 확정한다.
   * 에디터 하나당 확장 인스턴스가 하나라 이 변수도 하나다.
   */
  let pending: { readonly text: string; readonly from: number } | null = null

  return Extension.create({
    name: 'markdownPaste',

    addProseMirrorPlugins() {
      return [
        new Plugin<MarkdownOffer | null>({
          key: markdownPasteKey,

          state: {
            init: () => null,

            apply(tr, value) {
              if (tr.getMeta(markdownPasteKey) === CLEAR) return null
              if (!tr.docChanged) return value

              // 붙여넣기 트랜잭션은 ProseMirror 가 표시해 둔다. 이때 커서는
              // 들어간 내용 끝에 있으므로 거기까지가 방금 붙여넣은 범위다.
              if (pending && tr.getMeta('uiEvent') === 'paste') {
                const offer = { ...pending, to: tr.selection.from }
                pending = null
                return offer
              }

              pending = null
              if (!value) return null

              // **붙여넣기 직후에 확장들이 문서를 한 번 더 손본다.** Tiptap 의
              // paste rule 이 `**굵게**` 에서 별표를 걷어 bold mark 로 바꾸고,
              // Link 의 자동 인식이 주소에 mark 를 얹는다. 이것들은 사용자의
              // 편집이 아니라 붙여넣기의 뒷정리라서, 여기서 제안을 거두면
              // 제안이 뜨자마자 사라진다. ProseMirror 가 그런 트랜잭션에
              // appendedTransaction 표시를 붙여 두므로 그것으로 가른다.
              if (tr.getMeta('appendedTransaction')) {
                return {
                  ...value,
                  // 범위 안에서 일어난 증감을 그대로 흡수하도록 바깥쪽으로
                  // 치우쳐 옮긴다(별표가 사라지면 범위도 그만큼 줄어야 한다).
                  from: tr.mapping.map(value.from, -1),
                  to: tr.mapping.map(value.to, 1),
                }
              }

              // **사람이 한 편집이면 제안을 거둔다.** 제안이 들고 있는 것은
              // 붙여넣은 시점의 원문이라, 사용자가 이미 손댄 글 위에 그것을
              // 덮어쓰면 방금 한 편집이 소리 없이 사라진다.
              return null
            },
          },

          props: {
            handlePaste: (view, event) => {
              // 코드블록 안에서는 마크다운 원문이 곧 내용이다. 서식으로 바꿔
              // 주겠다는 제안 자체가 방해다.
              if (view.state.selection.$from.parent.type.name === 'codeBlock') {
                return false
              }

              const text = markdownCandidate(event.clipboardData)
              pending = text ? { text, from: view.state.selection.from } : null

              // **가로채지 않는다.** 붙여넣기는 평소대로 일어나야 한다.
              return false
            },
          },

          /**
           * 상태가 실제로 달라졌을 때만 화면에 알린다. 트랜잭션마다 부르면
           * 커서만 움직여도 React 가 다시 그린다.
           */
          view: () => ({
            update: (view, prevState) => {
              const before = markdownPasteKey.getState(prevState) ?? null
              const after = markdownPasteKey.getState(view.state) ?? null
              if (before !== after) onOffer(after)
            },
          }),
        }),
      ]
    },
  })
}

/**
 * 제안을 받아들였을 때 — 붙여넣은 원문 자리를 변환 결과로 갈아 끼운다.
 *
 * 삽입은 HTML 문자열로 한다. Tiptap 이 그것을 **에디터 스키마로 다시 파싱**
 * 하므로, markdown.ts 가 미처 거르지 못한 태그가 있더라도 스키마에 없으면
 * 여기서 버려진다. 되돌리기(Ctrl+Z)는 트랜잭션 하나를 되감는 것이라 평소처럼
 * 동작한다 — 제안을 잘못 눌러도 잃는 것이 없다.
 */
export function applyMarkdownOffer(
  editor: Editor,
  offer: MarkdownOffer
): MarkdownConversion {
  const conversion = markdownToHtml(offer.text)

  editor
    .chain()
    .focus()
    .insertContentAt({ from: offer.from, to: offer.to }, conversion.html)
    .command(({ tr }) => {
      tr.setMeta(markdownPasteKey, CLEAR)
      return true
    })
    .run()

  return conversion
}
