'use client'

// =============================================================
// 이미지 삽입 = 업로드 (에디터 전용 확장)
//
// 붙여넣기 · 드래그앤드롭 · 툴바 · 슬래시 커맨드 — 이미지가 본문에 들어오는
// 길이 넷인데, 저장되는 JSON 에 들어가는 것은 **언제나 스토리지 URL 하나**여야
// 한다. 그래서 네 길이 모두 이 파일의 uploadImagesInto 로 모인다. 길마다
// 따로 짜면 한 길만 base64 로 남고, 그 사실은 DB 가 비대해진 뒤에야 드러난다.
//
// **@/lib/editor/extensions.ts 에 두지 않는다.** 그 파일은 읽기 전용 렌더러와
// 공유하는 스키마 정본이고, 여기 있는 것은 스키마가 아니라 편집 중 동작이다
// (저장되는 JSON 에 흔적을 남기지 않는다 — 플레이스홀더는 문서가 아니라
// 데코레이션이다). Placeholder·슬래시 커맨드를 에디터 쪽에 남긴 것과 같은 규칙이다.
// =============================================================

import { Extension, type Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

import { uploadEditorImage } from './uploadImage'

const UPLOAD_FAILED = '⚠ 이미지 업로드에 실패했습니다.'

/** 실패 문구를 화면에 띄우는 쪽으로 넘기는 통로. */
type ReportError = (message: string) => void

// ── 업로드 중 플레이스홀더 ────────────────────────────────────
// **문서가 아니라 데코레이션이다.** 임시 이미지 노드를 넣었다가 URL 로
// 바꾸는 방법도 있지만, 그러면 업로드가 도는 동안 문서에 blob: 이나 빈 src 가
// 실제로 존재하게 되고 그 사이에 저장 버튼이 눌리면 그대로 DB 에 들어간다.
// 데코레이션은 editor.getJSON() 에 나타나지 않으므로 그 창이 없다.

type PlaceholderAction =
  | { readonly add: { readonly id: object; readonly pos: number } }
  | { readonly remove: { readonly id: object } }

const placeholderKey = new PluginKey<DecorationSet>('imageUploadPlaceholder')

function createPlaceholderElement(): HTMLElement {
  const element = document.createElement('span')
  element.className = 'wiki-image-uploading'
  element.textContent = '이미지 업로드 중…'
  return element
}

/**
 * id 는 빈 객체다 — 값이 아니라 **정체성**으로 찾기 때문이다. 문자열 id 를
 * 쓰면 같은 이미지를 연달아 올릴 때 충돌할 수 있고, 굳이 유일한 문자열을
 * 만들 이유도 없다.
 */
const placeholderPlugin = new Plugin<DecorationSet>({
  key: placeholderKey,

  state: {
    init: () => DecorationSet.empty,

    apply(tr, value) {
      // 먼저 따라 옮긴다. 업로드가 도는 동안 사용자가 위쪽에 글을 쓰면
      // 플레이스홀더 위치가 밀리는데, 매핑하지 않으면 엉뚱한 자리에 이미지가
      // 꽂힌다.
      let set = value.map(tr.mapping, tr.doc)

      const action = tr.getMeta(placeholderKey) as PlaceholderAction | undefined
      if (!action) return set

      if ('add' in action) {
        return set.add(tr.doc, [
          Decoration.widget(action.add.pos, createPlaceholderElement(), {
            id: action.add.id,
          }),
        ])
      }

      set = set.remove(
        set.find(undefined, undefined, (spec: { id?: unknown }) => spec.id === action.remove.id)
      )
      return set
    },
  },

  props: {
    decorations: (state) => placeholderKey.getState(state) ?? DecorationSet.empty,
  },
})

/**
 * 플레이스홀더가 지금 어디에 있는가. 사라졌으면 null —
 * 업로드가 도는 동안 사용자가 그 자리를 지웠다는 뜻이라 이미지를 넣지 않는다.
 */
function findPlaceholder(view: EditorView, id: object): number | null {
  const found = placeholderKey
    .getState(view.state)
    ?.find(undefined, undefined, (spec: { id?: unknown }) => spec.id === id)

  return found && found.length > 0 ? found[0].from : null
}

// ── 업로드 실행 ───────────────────────────────────────────────
/**
 * 파일 하나를 올리고, 끝나면 그 자리에 이미지 노드를 넣는다.
 *
 * 성공·실패 어느 쪽이든 플레이스홀더는 반드시 걷는다. 남으면 "업로드 중…"이
 * 영원히 붙어 있는 문서가 된다.
 *
 * 넣는 것은 URL 하나뿐이다. alt 를 파일명으로 채우지 않는다 — 캡처의 파일명은
 * `screenshot 2026-08-07.png` 같은 값이라 대체 텍스트로서 의미가 없고,
 * 의미 있는 alt 를 받으려면 캡션 편집 UI 가 필요한데 그건 범위 밖이다.
 */
async function uploadOne(
  view: EditorView,
  file: File,
  pos: number,
  onError: ReportError
): Promise<void> {
  const id = {}

  view.dispatch(view.state.tr.setMeta(placeholderKey, { add: { id, pos } }))

  try {
    const url = await uploadEditorImage(file)

    const at = findPlaceholder(view, id)
    const tr = view.state.tr.setMeta(placeholderKey, { remove: { id } })

    if (at !== null) {
      tr.replaceWith(at, at, view.state.schema.nodes.image.create({ src: url }))
    }

    view.dispatch(tr)
  } catch (error) {
    view.dispatch(view.state.tr.setMeta(placeholderKey, { remove: { id } }))
    onError(error instanceof Error ? error.message : UPLOAD_FAILED)
  }
}

/**
 * 여러 장을 **순서대로** 올린다.
 *
 * 병렬로 쏘지 않는 이유가 둘이다. 하나는 서버 쪽 — 업로드마다 sharp 가 원본을
 * 메모리에 펼치므로 서버리스 함수 하나에 동시에 몰리면 메모리를 넘긴다.
 * 다른 하나는 문서 쪽 — 먼저 끝난 것이 먼저 꽂히면 사용자가 고른 순서와
 * 다른 순서로 이미지가 배열된다.
 */
export async function uploadImagesInto(
  editor: Editor,
  files: readonly File[],
  pos: number,
  onError: ReportError
): Promise<void> {
  let at = pos

  for (const file of files) {
    await uploadOne(editor.view, file, at, onError)
    // 다음 장은 방금 넣은 것 뒤에 온다. 같은 자리에 계속 꽂으면 순서가 뒤집힌다.
    at = editor.state.selection.from
  }
}

// ── 클립보드 · 드롭에서 이미지 꺼내기 ─────────────────────────
/**
 * 이미지 파일만 걸러낸다.
 *
 * 여기서 허용 형식(PNG/JPG/WEBP/GIF)까지 좁히지 않는 것은 의도다. SVG 를
 * 떨어뜨리면 이 함수가 빈 배열을 주고, 그러면 기본 동작으로 넘어가 파일이
 * 그냥 무시된다 — 사용자에게는 아무 일도 안 일어난 것처럼 보인다.
 * 이미지이기만 하면 일단 받아서 검증 문구를 띄우게 한다.
 */
function imageFilesFrom(transfer: DataTransfer | null): File[] {
  return Array.from(transfer?.files ?? []).filter((file) =>
    file.type.startsWith('image/')
  )
}

/** `data:image/png;base64,...` → File. 모양이 어긋나면 null. */
function dataUrlToFile(dataUrl: string): File | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl)
  if (!match) return null

  const [, type, base64] = match

  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return new File([bytes], `pasted.${type.split('/')[1]}`, { type })
  } catch {
    return null
  }
}

/**
 * 붙여넣은 HTML 에서 data: 이미지를 떼어낸다.
 *
 * **이 경로를 막지 않으면 base64 가 그대로 되돌아온다.** 클립보드에 파일이
 * 아니라 `<img src="data:image/png;base64,…">` 가 담긴 HTML 이 오는 경우가
 * 있는데(다른 에디터·문서 앱에서 복사할 때), Image 확장이 allowBase64 라
 * ProseMirror 가 그 src 를 그대로 문서에 넣는다. 화면상 결과가 똑같아서
 * 아무도 눈치채지 못한 채 DB 만 커진다.
 *
 * 떼어낸 자리는 비워 두고 이미지는 업로드가 끝난 뒤 커서 위치에 들어간다.
 * 글과 이미지가 섞인 HTML 에서는 이미지가 문단 끝으로 밀릴 수 있는데,
 * 순서를 정확히 지키려면 붙여넣기를 조각내 재조립해야 한다 — 흔한 경우
 * (이미지 한 장짜리 복사)에서는 결과가 같으므로 그 복잡도를 사지 않는다.
 */
function splitDataImages(html: string): { html: string; files: File[] } {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const files: File[] = []

  for (const image of Array.from(parsed.querySelectorAll('img'))) {
    const src = image.getAttribute('src') ?? ''
    if (!src.startsWith('data:image')) continue

    const file = dataUrlToFile(src)
    if (file) files.push(file)
    image.remove()
  }

  return { html: parsed.body.innerHTML, files }
}

// ── 확장 ──────────────────────────────────────────────────────
/**
 * 붙여넣기·드롭을 가로채 업로드로 돌리는 확장.
 *
 * createSlashCommand 와 같은 팩토리 꼴인 이유: 실패 문구를 어디에 그릴지는
 * 확장이 아니라 폼이 아는 일이라 콜백으로 받는다.
 */
export function createImageUpload(onError: ReportError) {
  return Extension.create({
    name: 'imageUpload',

    addProseMirrorPlugins() {
      const editor = this.editor

      return [
        placeholderPlugin,

        new Plugin({
          props: {
            handlePaste: (view, event) => {
              const files = imageFilesFrom(event.clipboardData)
              if (files.length > 0) {
                event.preventDefault()
                void uploadImagesInto(editor, files, view.state.selection.from, onError)
                return true
              }

              const html = event.clipboardData?.getData('text/html') ?? ''
              if (!html.includes('data:image')) return false

              const split = splitDataImages(html)
              if (split.files.length === 0) return false

              event.preventDefault()
              // 이미지를 뺀 나머지를 먼저 넣는다. 그래야 이어지는 업로드가
              // 그 뒤(= 현재 커서)에 이미지를 꽂는다.
              editor.commands.insertContent(split.html)
              void uploadImagesInto(
                editor,
                split.files,
                editor.state.selection.from,
                onError
              )
              return true
            },

            handleDrop: (view, event, _slice, moved) => {
              // 에디터 안에서 이미 있는 노드를 옮기는 중이면 건드리지 않는다.
              if (moved) return false

              const files = imageFilesFrom(event.dataTransfer)
              if (files.length === 0) return false

              event.preventDefault()
              // 떨어뜨린 자리에 넣는다. selection 을 쓰면 커서가 있던
              // 엉뚱한 곳으로 간다.
              const dropped = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })
              void uploadImagesInto(
                editor,
                files,
                dropped?.pos ?? view.state.selection.from,
                onError
              )
              return true
            },
          },
        }),
      ]
    },
  })
}
