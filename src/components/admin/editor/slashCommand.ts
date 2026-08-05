import { Extension } from '@tiptap/core'
import { Suggestion } from '@tiptap/suggestion'
import type { SlashCommandItem } from './slashCommandList'

const BASE_ITEMS: SlashCommandItem[] = [
  {
    label: '제목',
    description: 'H1 — 큰 제목',
    icon: 'H1',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    label: '부제목',
    description: 'H2 — 중간 제목',
    icon: 'H2',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    label: '소제목',
    description: 'H3 — 작은 제목',
    icon: 'H3',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    label: '머릿말',
    description: '인용 블록 (왼쪽 강조선)',
    icon: '❝',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    label: '본문',
    description: '일반 텍스트',
    icon: '¶',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    label: '목록',
    description: '순서 없는 목록',
    icon: '•',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    label: '번호목록',
    description: '순서 있는 목록',
    icon: '1.',
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
]

export function createSlashCommand(onImageUpload: () => void) {
  const ITEMS: SlashCommandItem[] = [
    ...BASE_ITEMS,
    {
      label: '이미지',
      description: '로컬 이미지 삽입',
      icon: '🖼',
      command: (editor, range) => {
        editor.chain().focus().deleteRange(range).run()
        onImageUpload()
      },
    },
  ]

  return Extension.create({
    name: 'slashCommand',

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: '/',
          command: ({ editor, range, props }: any) => {
            props.command(editor, range)
          },
          items: ({ query }: { query: string }) =>
            ITEMS.filter((item) =>
              item.label.toLowerCase().startsWith(query.toLowerCase())
            ),
          render: () => {
            let component: any = null
            let popup: HTMLDivElement | null = null

            const cleanup = () => {
              popup?.remove()
              popup = null
              component?.destroy()
              component = null
            }

            return {
              onStart: (props: any) => {
                if (typeof window === 'undefined') return

                // Dynamic import to keep this file SSR-safe
                Promise.all([
                  import('@tiptap/react'),
                  import('./slashCommandList'),
                ]).then(([{ ReactRenderer }, { default: SlashCommandList }]) => {
                  if (!props.editor) return

                  component = new ReactRenderer(SlashCommandList, {
                    editor: props.editor,
                    props: { items: props.items, command: props.command },
                  })

                  popup = document.createElement('div')
                  popup.style.cssText =
                    'position:fixed;z-index:9999;pointer-events:auto'
                  document.body.appendChild(popup)
                  popup.appendChild(component.element)

                  const rect = props.clientRect?.()
                  if (rect && popup) {
                    popup.style.left = `${rect.left}px`
                    popup.style.top = `${rect.bottom + 4}px`
                  }
                })
              },

              onUpdate: (props: any) => {
                component?.updateProps({ items: props.items, command: props.command })
                const rect = props.clientRect?.()
                if (rect && popup) {
                  popup.style.left = `${rect.left}px`
                  popup.style.top = `${rect.bottom + 4}px`
                }
              },

              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  cleanup()
                  return true
                }
                return component?.ref?.onKeyDown?.(props) ?? false
              },

              onExit: cleanup,
            }
          },
        }),
      ]
    },
  })
}
