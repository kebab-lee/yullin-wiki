'use client'

import type { Editor } from '@tiptap/core'

const BLOCK_TYPES = [
  {
    label: '제목',
    check: (e: Editor) => e.isActive('heading', { level: 1 }),
    apply: (e: Editor) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    label: '부제목',
    check: (e: Editor) => e.isActive('heading', { level: 2 }),
    apply: (e: Editor) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    label: '소제목',
    check: (e: Editor) => e.isActive('heading', { level: 3 }),
    apply: (e: Editor) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    label: '머릿말',
    check: (e: Editor) => e.isActive('blockquote'),
    apply: (e: Editor) => e.chain().focus().setBlockquote().run(),
  },
  {
    label: '본문',
    check: (e: Editor) => e.isActive('paragraph') && !e.isActive('blockquote'),
    apply: (e: Editor) => e.chain().focus().setParagraph().run(),
  },
]

function currentBlockLabel(editor: Editor) {
  for (const type of BLOCK_TYPES) {
    if (type.check(editor)) return type.label
  }
  return '본문'
}

type Props = {
  editor: Editor
  onImageUpload: () => void
}

export default function EditorToolbar({ editor, onImageUpload }: Props) {
  const activeLabel = currentBlockLabel(editor)

  const handleLinkToggle = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const url = window.prompt('링크 URL을 입력하세요')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div className="flex items-center gap-1 px-2 py-2 border-y border-gray2 bg-white sticky top-0 z-10 flex-wrap">
      {/* 블록 타입 드롭다운 */}
      <div className="relative mr-1">
        <select
          value={activeLabel}
          onChange={(e) => {
            const found = BLOCK_TYPES.find((t) => t.label === e.target.value)
            found?.apply(editor)
          }}
          className="appearance-none bg-brand-red-white text-brand-red text-[13px] font-semibold rounded-lg pl-3 pr-7 py-1.5 cursor-pointer outline-none"
        >
          {BLOCK_TYPES.map((t) => (
            <option key={t.label} value={t.label}>
              {t.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-brand-red text-[10px]">
          ▾
        </span>
      </div>

      <Divider />

      {/* 인라인 포맷 */}
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="굵게 (Ctrl+B)"
      >
        <span className="font-bold text-[13px]">B</span>
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="기울임 (Ctrl+I)"
      >
        <span className="italic text-[13px]">I</span>
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="취소선"
      >
        <span className="line-through text-[13px]">S</span>
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('link')}
        onClick={handleLinkToggle}
        title="링크"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M5.5 8.5l3-3M8.2 9.8l-.8.8a2.8 2.8 0 01-3.96-3.96l.8-.8M5.8 4.2l.8-.8a2.8 2.8 0 013.96 3.96l-.8.8"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </ToolbarButton>

      <Divider />

      {/* 리스트 */}
      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="목록 (Ctrl+Shift+8)"
      >
        <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
          <circle cx="1.5" cy="2" r="1.5" fill="currentColor" />
          <circle cx="1.5" cy="10" r="1.5" fill="currentColor" />
          <line x1="5" y1="2" x2="15" y2="2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="5" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="번호목록 (Ctrl+Shift+7)"
      >
        <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
          <text x="0" y="4" fontSize="5" fill="currentColor" fontFamily="monospace">
            1.
          </text>
          <text x="0" y="11" fontSize="5" fill="currentColor" fontFamily="monospace">
            2.
          </text>
          <line x1="6" y1="2" x2="15" y2="2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="6" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </ToolbarButton>

      <Divider />

      {/* 이미지 */}
      <ToolbarButton onClick={onImageUpload} title="이미지 삽입">
        <svg width="15" height="14" viewBox="0 0 15 14" fill="none">
          <rect x="0.5" y="0.5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="4.5" cy="4" r="1.2" fill="currentColor" />
          <path
            d="M0.5 9.5l3.5-3.5 3 3 2.5-2 5 5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </ToolbarButton>

      {/* / 커맨드 힌트 */}
      <span className="ml-auto text-[12px] text-gray3 pr-2 hidden sm:block">
        / 로 블록 삽입
      </span>
    </div>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray2 mx-1 shrink-0" />
}

function ToolbarButton({
  children,
  active = false,
  onClick,
  title,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault() // 에디터 포커스 유지
        onClick()
      }}
      className={`size-8 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
        active
          ? 'bg-brand-red text-white'
          : 'text-gray3 hover:bg-brand-red-white hover:text-brand-red'
      }`}
    >
      {children}
    </button>
  )
}
