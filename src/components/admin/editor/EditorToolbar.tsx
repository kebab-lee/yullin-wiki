'use client'

import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'

/**
 * 블록 타입 버튼 — Figma menu-bar Frame 1407 (1:1638) 의 h1 / h2 / h3 / P / C.
 *
 * 드롭다운이 아니라 버튼 다섯 개인 것이 시안이다. 드롭다운은 "지금 무엇인가"를
 * 접어 두기 때문에, 커서를 옮길 때마다 바뀌는 값을 보여주기에 맞지 않는다.
 *
 * `C` 는 인용(blockquote)이다. 코드블록이 아니다 — 에디터 스키마
 * (src/lib/editor/extensions.ts)에 CodeBlock 을 넣지 않기로 했으므로 그런
 * 블록은 존재할 수 없다.
 */
const BLOCK_TYPES = [
  {
    key: 'h1',
    label: 'h1',
    title: '제목',
    /** 시안의 h1 이 가장 굵다(Pretendard Black). 글자 자체가 미리보기 역할을 한다. */
    className: 'font-black',
    isActive: (e: Editor) => e.isActive('heading', { level: 1 }),
    can: (e: Editor) => e.can().setHeading({ level: 1 }),
    apply: (e: Editor) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    key: 'h2',
    label: 'h2',
    title: '부제목',
    className: 'font-bold',
    isActive: (e: Editor) => e.isActive('heading', { level: 2 }),
    can: (e: Editor) => e.can().setHeading({ level: 2 }),
    apply: (e: Editor) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    key: 'h3',
    label: 'h3',
    title: '소제목',
    className: 'font-medium',
    isActive: (e: Editor) => e.isActive('heading', { level: 3 }),
    can: (e: Editor) => e.can().setHeading({ level: 3 }),
    apply: (e: Editor) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    key: 'paragraph',
    label: 'P',
    title: '본문',
    className: 'font-normal',
    // 인용 안의 문단도 paragraph 다. 여기서 blockquote 를 빼면 P 가 거짓말을
    // 한다 — 인용 안에서 P 를 눌러 문단이 되었는데도 P 가 꺼진 채로 남는다.
    // 상호배타는 h1/h2/h3/P 넷 사이의 약속이고, C 는 그 넷 중 하나를 **감싸는**
    // 별개의 축이다 (블록 타입이 아니라 래퍼라서 둘이 함께 켜지는 것이 맞다).
    isActive: (e: Editor) => e.isActive('paragraph'),
    can: (e: Editor) => e.can().setParagraph(),
    apply: (e: Editor) => e.chain().focus().setParagraph().run(),
  },
  {
    key: 'blockquote',
    label: 'C',
    title: '인용',
    className: 'font-normal',
    isActive: (e: Editor) => e.isActive('blockquote'),
    can: (e: Editor) => e.can().toggleBlockquote(),
    // 다른 넷과 달리 toggle 이다. 인용은 문단을 감싸는 블록이라 되돌릴 곳이
    // 분명하지만(문단), 제목은 서로 갈아타는 관계라 끄는 동작이 없다.
    apply: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
  },
] as const

type Props = {
  editor: Editor
  onImageUpload: () => void
}

/**
 * 에디터 툴바 — Figma menu-bar 1:1631.
 *
 * **활성 상태는 렌더 시점에 한 번 읽으면 안 된다.** `editor.isActive()` 는
 * 그 순간의 selection 을 보고 답하는 함수일 뿐이라, 커서를 옮겨도 React 가
 * 다시 그릴 이유가 없으면 툴바는 옛 답을 붙잡고 있는다. `useEditorState` 로
 * 에디터 트랜잭션을 구독해서, 상태가 바뀔 때마다 아래 플래그를 다시 계산하고
 * **값이 실제로 달라졌을 때만** 리렌더한다(선택자 결과를 얕게 비교한다).
 */
export default function EditorToolbar({ editor, onImageUpload }: Props) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      blocks: BLOCK_TYPES.map((type) => ({
        active: type.isActive(e),
        // 이미 그 블록이면 `can()` 은 false 다 — "문단을 문단으로 바꾸기"는
        // 실행할 것이 없는 명령이라 ProseMirror 가 거절한다. 그 값을 그대로
        // 쓰면 **지금 켜져 있는 버튼이 흐리게** 그려진다. 켜져 있다는 것은
        // 쓸 수 없다는 뜻이 아니므로, 활성일 때는 못 쓴다고 말하지 않는다.
        enabled: type.isActive(e) || type.can(e),
      })),
      bold: e.isActive('bold'),
      canBold: e.can().toggleBold(),
      italic: e.isActive('italic'),
      canItalic: e.can().toggleItalic(),
      strike: e.isActive('strike'),
      canStrike: e.can().toggleStrike(),
      link: e.isActive('link'),
      canLink: e.can().setLink({ href: '' }),
      bulletList: e.isActive('bulletList'),
      canBulletList: e.can().toggleBulletList(),
      orderedList: e.isActive('orderedList'),
      canOrderedList: e.can().toggleOrderedList(),
    }),
    // 기본 비교는 선택자 결과를 얕게 훑는다. blocks 가 매번 새 배열이라
    // 그 기본 비교로는 항상 "달라졌다"가 되므로, 한 겹 더 들어가서 비교한다.
    equalityFn: (a, b) =>
      b !== null &&
      a.blocks.length === b.blocks.length &&
      a.blocks.every(
        (block, i) =>
          block.active === b.blocks[i].active &&
          block.enabled === b.blocks[i].enabled,
      ) &&
      a.bold === b.bold &&
      a.canBold === b.canBold &&
      a.italic === b.italic &&
      a.canItalic === b.canItalic &&
      a.strike === b.strike &&
      a.canStrike === b.canStrike &&
      a.link === b.link &&
      a.canLink === b.canLink &&
      a.bulletList === b.bulletList &&
      a.canBulletList === b.canBulletList &&
      a.orderedList === b.orderedList &&
      a.canOrderedList === b.canOrderedList,
  })

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
      {/* 블록 타입 (Frame 1407) */}
      <div className="flex items-center gap-[6px] shrink-0">
        {BLOCK_TYPES.map((type, i) => (
          <BlockButton
            key={type.key}
            label={type.label}
            title={type.title}
            labelClassName={type.className}
            active={state.blocks[i].active}
            disabled={!state.blocks[i].enabled}
            onClick={() => type.apply(editor)}
          />
        ))}
      </div>

      <Divider />

      {/* 인라인 포맷 (1:1645) */}
      <ToolbarButton
        active={state.bold}
        disabled={!state.canBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="굵게 (Ctrl+B)"
      >
        <span className="font-bold text-[13px]">B</span>
      </ToolbarButton>

      <ToolbarButton
        active={state.italic}
        disabled={!state.canItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="기울임 (Ctrl+I)"
      >
        <span className="italic text-[13px]">I</span>
      </ToolbarButton>

      <ToolbarButton
        active={state.strike}
        disabled={!state.canStrike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="취소선"
      >
        <span className="line-through text-[13px]">S</span>
      </ToolbarButton>

      <ToolbarButton
        active={state.link}
        disabled={!state.canLink}
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

      {/* 리스트 (1:1651) */}
      <ToolbarButton
        active={state.bulletList}
        disabled={!state.canBulletList}
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
        active={state.orderedList}
        disabled={!state.canOrderedList}
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

      {/* 이미지 (1:1654) — 삽입 동작이라 켜고 끄는 상태가 없다. */}
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

/**
 * 활성 표시의 정본 — Figma Frame 1408 (1:1641).
 *
 * 시안이 h3 하나에만 씌워 둔 그 모양(gray3 로 꽉 찬 원 + 흰 글자)을 활성
 * 상태의 공용 언어로 삼는다. 배경이 없다가 생기고 글자색이 뒤집히므로,
 * 색만 살짝 바뀌는 표시와 달리 곁눈으로도 어느 것이 켜져 있는지 보인다.
 * 아이콘 버튼도 같은 규칙을 쓴다 — 활성이 화면 안에서 두 가지 모양으로
 * 보이면 사용자가 그 둘을 다른 뜻으로 읽는다.
 */
const ACTIVE_CLASS = 'bg-gray3 text-white'
const IDLE_CLASS = 'text-black hover:bg-brand-red-white hover:text-brand-red'
/**
 * 지금 커서 자리에 적용할 수 없는 버튼.
 *
 * 감추지 않고 흐리게 둔다 — 이미지를 고른 상태처럼 잠깐 못 쓰는 경우가
 * 대부분이라, 버튼이 사라졌다 나타나면 툴바 폭이 흔들리고 누르려던 자리가
 * 어긋난다.
 */
const DISABLED_CLASS = 'text-gray2 cursor-not-allowed'

/** 텍스트 라벨 버튼(h1/h2/h3/P/C). 시안의 활성 칩이 25px 원이다. */
function BlockButton({
  label,
  title,
  labelClassName,
  active,
  disabled,
  onClick,
}: {
  label: string
  title: string
  labelClassName: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault() // 에디터 포커스 유지
        if (!disabled) onClick()
      }}
      className={`min-w-[25px] h-[25px] px-1.5 flex items-center justify-center rounded-full text-[15px] leading-[1.4] transition-colors shrink-0 ${labelClassName} ${
        disabled ? DISABLED_CLASS : active ? ACTIVE_CLASS : IDLE_CLASS
      }`}
    >
      {label}
    </button>
  )
}

function ToolbarButton({
  children,
  active = false,
  disabled = false,
  onClick,
  title,
}: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault() // 에디터 포커스 유지
        if (!disabled) onClick()
      }}
      className={`size-8 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
        disabled ? DISABLED_CLASS : active ? ACTIVE_CLASS : IDLE_CLASS
      }`}
    >
      {children}
    </button>
  )
}
