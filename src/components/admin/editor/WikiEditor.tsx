'use client'

import { useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import EditorToolbar from './EditorToolbar'
import { createSlashCommand } from './slashCommand'

// TODO: GET /api/categories 연동 시 제거. value는 category.id 로 바뀜.
const CATEGORIES = ['공간', '섬김', '열청']

type SaveStatus = 'idle' | 'saving' | 'saved'

export default function WikiEditor() {
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [title, setTitle] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const imageInputRef = useRef<HTMLInputElement>(null)

  const triggerImageUpload = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: true }),
      Placeholder.configure({
        placeholder: '내용을 입력하세요. / 를 입력하면 블록을 삽입할 수 있습니다.',
      }),
      createSlashCommand(triggerImageUpload),
    ],
    editorProps: {
      attributes: { class: 'outline-none min-h-[500px] py-6' },
    },
  })

  // ---- 태그 핸들러 ----

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '')
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag])
    setTagInput('')
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  // ---- 이미지 업로드 ----

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    // URL.createObjectURL: 현재 세션에서만 유효. 실제 배포 시 서버 업로드 endpoint 연결 필요.
    const url = URL.createObjectURL(file)
    editor.chain().focus().setImage({ src: url, alt: file.name }).run()
    e.target.value = ''
  }

  // ---- 액션 핸들러 ----

  const handleSaveDraft = () => {
    if (!title.trim()) {
      alert('저장을 진행하기 위해서 제목을 입력해주세요.')
      return
    }
    setSaveStatus('saving')
    const draft = { title, category, tags, content: editor?.getJSON(), savedAt: new Date().toISOString() }
    localStorage.setItem('wiki-draft', JSON.stringify(draft))
    setTimeout(() => setSaveStatus('saved'), 500)
    setTimeout(() => setSaveStatus('idle'), 3000)
  }

  const handlePreview = () => {
    if (!title.trim()) {
      alert('미리보기를 진행하기 위해서 제목을 입력해주세요.')
      return
    }
    alert('미리보기 기능은 준비 중입니다.')
  }

  const handlePublish = () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }
    if (!category) {
      alert('카테고리를 선택해주세요.')
      return
    }
    alert('발행 기능은 준비 중입니다.')
  }

  return (
    <div className="mx-auto max-w-[832px] py-5 px-4">
      {/* ── 메타데이터: 카테고리 + 태그 ── */}
      <div className="flex items-start gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-[13px] text-gray3 font-medium whitespace-nowrap">
            카테고리
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-[14px] border border-gray2 rounded-full px-3 py-1 outline-none focus:border-brand-red bg-white cursor-pointer"
          >
            <option value="">선택</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-6 bg-gray2 self-center shrink-0" />

        <div className="flex items-center flex-wrap gap-2 flex-1 min-w-0">
          <label className="text-[13px] text-gray3 font-medium whitespace-nowrap">
            태그
          </label>
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 bg-category-green-light text-category-green-dark text-[13px] px-2.5 py-0.5 rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                className="leading-none opacity-60 hover:opacity-100"
                aria-label={`${tag} 태그 삭제`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => tagInput.trim() && addTag(tagInput)}
            placeholder="태그 입력 후 Enter"
            className="text-[13px] outline-none flex-1 min-w-[100px] placeholder:text-gray3"
          />
        </div>
      </div>

      {/* ── 제목 ── */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력하세요"
        className="w-full text-[36px] font-extrabold text-black placeholder:text-gray2 outline-none mb-3 leading-tight"
      />

      <div className="w-full h-px bg-gray2" />

      {/* ── 툴바 ── */}
      {editor && (
        <EditorToolbar editor={editor} onImageUpload={triggerImageUpload} />
      )}

      {/* ── 에디터 본문 ── */}
      <div className="wiki-editor">
        <EditorContent editor={editor} />
      </div>

      <div className="w-full h-px bg-gray2 mt-4" />

      {/* ── 액션바 ── */}
      <div className="flex items-center gap-3 pt-4">
        {saveStatus === 'saved' && (
          <p className="text-[13px] text-category-green-dark mr-auto animate-fade-in">
            성공적으로 저장되었습니다!
          </p>
        )}

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saveStatus === 'saving'}
            className="px-5 py-2 rounded-full border border-gray2 text-[14px] text-gray3 hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-50"
          >
            {saveStatus === 'saving' ? '저장 중...' : '임시저장'}
          </button>
          <button
            type="button"
            onClick={handlePreview}
            className="px-5 py-2 rounded-full border border-gray2 text-[14px] text-gray3 hover:border-brand-red hover:text-brand-red transition-colors"
          >
            미리보기
          </button>
          <button
            type="button"
            onClick={handlePublish}
            className="px-6 py-2 rounded-full bg-brand-red text-white text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            발행
          </button>
        </div>
      </div>

      {/* 숨겨진 파일 input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />
    </div>
  )
}
