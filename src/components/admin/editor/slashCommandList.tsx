'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

export type SlashCommandItem = {
  label: string
  description: string
  icon: string
  command: (editor: any, range: any) => void
}

type Props = {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

const SlashCommandList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  Props
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => setSelectedIndex(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }: { event: KeyboardEvent }) {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i - 1 + items.length) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        const item = items[selectedIndex]
        if (item) command(item)
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray2 py-2 min-w-[220px]">
        <p className="px-4 py-2 text-sm text-gray3">결과 없음</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray2 py-2 min-w-[220px]">
      {items.map((item, index) => (
        <button
          key={item.label}
          type="button"
          onClick={() => command(item)}
          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
            index === selectedIndex ? 'bg-brand-red-white' : 'hover:bg-brand-red-white'
          }`}
        >
          <span className="size-8 flex items-center justify-center rounded-lg bg-brand-red-white text-brand-red font-bold text-sm shrink-0">
            {item.icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-black">{item.label}</p>
            <p className="text-xs text-gray3">{item.description}</p>
          </div>
        </button>
      ))}
    </div>
  )
})

SlashCommandList.displayName = 'SlashCommandList'
export default SlashCommandList
