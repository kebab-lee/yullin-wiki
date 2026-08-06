'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { NETWORK_ERROR, readErrorBody } from '@/lib/api/errorBody'
import type {
  CategoryListBody,
  CurrentUserBody,
  PageCreatedBody,
} from '@/lib/api/types'
import { contentExtensions } from '@/lib/editor/extensions'
import type { Category } from '@/lib/types'
import {
  validateNewPage,
  type NewPageErrors,
  type NewPageInput,
} from '@/lib/validation/page'
import EditorToolbar from './EditorToolbar'
import { createSlashCommand } from './slashCommand'

type SaveStatus = 'idle' | 'saving' | 'saved'

/** 서버가 돌려준 필드 에러 중 이 폼이 아는 칸만 남긴다. */
const ERROR_FIELDS = ['title', 'categoryId', 'content', 'tags'] as const

function toFieldErrors(fields: Record<string, string> | undefined): NewPageErrors {
  const errors: NewPageErrors = {}
  for (const key of ERROR_FIELDS) {
    const message = fields?.[key]
    if (message) errors[key] = message
  }
  return errors
}

export default function WikiEditor() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  // 표시 전용이다. 서버로 보내지 않는다 — authorId 는 세션에서 온다.
  const [authorName, setAuthorName] = useState('')
  // 발행 시 pages.category_id 로 그대로 들어갈 값. 표시명이 아니라 id 를 담는다 —
  // 표시명은 바뀔 수 있고, 바뀌면 저장된 값이 어느 항목인지 알 수 없게 된다.
  const [categoryId, setCategoryId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [title, setTitle] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // 발행 진행 상태와 에러. publishing 은 중복 제출 방지용이다 —
  // 두 번 눌리면 같은 글이 두 건 생긴다(멱등키가 없다).
  const [publishing, setPublishing] = useState(false)
  const [errors, setErrors] = useState<NewPageErrors>({})
  /** 특정 칸에 붙지 않는 실패(401/403/네트워크)를 담는다. */
  const [formError, setFormError] = useState<string | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)

  // 에디터는 ssr: false 라 서버에서 props 로 받을 경계가 없다. 클라이언트가
  // 자기 도메인 API 를 직접 부른다 (CLAUDE.md "클라이언트는 자기 프로젝트 API만").
  useEffect(() => {
    let cancelled = false

    fetch('/api/categories')
      .then((res) => {
        if (!res.ok) throw new Error(`카테고리 조회 실패 (${res.status})`)
        return res.json() as Promise<CategoryListBody>
      })
      .then((body) => {
        if (!cancelled) setCategories(body.categories)
      })
      .catch((error) => {
        console.error('[WikiEditor] 카테고리 조회 실패', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 작성자 표시용. 저장에는 쓰지 않으므로 실패해도 발행을 막지 않는다 —
  // 진짜 작성자는 서버가 세션에서 정한다.
  useEffect(() => {
    let cancelled = false

    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error(`사용자 조회 실패 (${res.status})`)
        return res.json() as Promise<CurrentUserBody>
      })
      .then((body) => {
        // users.name 은 탈퇴 시 NULL 이 된다. 탈퇴 계정으로 여기까지 올 일은
        // 없지만(getCurrentUser 가 ACTIVE 만 통과시킨다) 타입이 남긴 여지를 닫는다.
        if (!cancelled) setAuthorName(body.user.name ?? '')
      })
      .catch((error) => {
        console.error('[WikiEditor] 사용자 조회 실패', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const triggerImageUpload = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // 스키마를 이루는 확장은 읽기 전용 렌더러와 같은 정본을 쓴다.
      // 여기에 직접 더하면 저장은 되는데 상세 화면에서 사라지는 노드가 생긴다.
      ...contentExtensions,
      // 아래 둘은 편집 중 동작만 바꾸고 저장되는 JSON 에 흔적을 남기지 않으므로
      // 렌더러가 알 필요가 없다.
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
    const draft = { title, categoryId, tags, content: editor?.getJSON(), savedAt: new Date().toISOString() }
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

  /**
   * 발행 — POST /api/admin/pages → 성공 시 /pages/[id].
   *
   * 클라이언트 검증은 왕복을 아끼는 편의일 뿐이고 진짜 방어선은 service 다.
   * 그래서 서버와 **같은 함수**(validateNewPage)를 쓴다 — 규칙을 여기 적으면
   * 서버에서 다시 쓰게 되고 두 벌이 조용히 어긋난다.
   *
   * 본문은 editor.getJSON() 을 그대로 싣는다. 커스텀 포맷으로 변환하지 않는다
   * (CLAUDE.md "에디터 / 본문 포맷"). 작성자도 싣지 않는다 — 서버가 세션에서 정한다.
   */
  const handlePublish = async () => {
    if (!editor || publishing) return

    const input: NewPageInput = {
      title,
      categoryId,
      content: editor.getJSON(),
      tags,
    }

    const found = validateNewPage(input)
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setPublishing(true)

    try {
      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        // 400 은 필드 문구가, 401/403 은 폼 단위 문구만 실려 온다.
        const body = await readErrorBody(response)
        setErrors(toFieldErrors(body.fields))
        setFormError(body.message)
        setPublishing(false)
        return
      }

      const { id } = (await response.json()) as PageCreatedBody
      // 이동이 끝날 때까지 버튼을 다시 열지 않는다. 여기서 publishing 을 내리면
      // 화면이 바뀌기 전 짧은 틈에 한 번 더 눌려 같은 글이 두 건 생긴다.
      router.push(`/pages/${id}`)
    } catch {
      setFormError(NETWORK_ERROR)
      setPublishing(false)
    }
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
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="text-[14px] border border-gray2 rounded-full px-3 py-1 outline-none focus:border-brand-red bg-white cursor-pointer"
          >
            <option value="">선택</option>
            {/* value 는 id, 보이는 글자는 짧은 형(name). fullName 은 푸터 전용이다. */}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-6 bg-gray2 self-center shrink-0" />

        {/* 작성자 — 읽기 전용. 서버로 보내지 않는다(authorId 는 세션에서 온다).
            입력 칸으로 두면 남의 이름으로 글을 쓸 수 있는 것처럼 보인다. */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-[13px] text-gray3 font-medium whitespace-nowrap">
            작성자
          </label>
          <span className="text-[14px] text-black">{authorName || '—'}</span>
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

      {/* 메타 행(항목·태그)의 문구. 칸마다 아래에 붙이면 한 줄짜리 행이
          에러 유무에 따라 위아래로 튀므로 행 전체의 아래에 모아 둔다. */}
      {(errors.categoryId || errors.tags) && (
        <p className="text-[13px] text-brand-red -mt-4 mb-4">
          {errors.categoryId ?? errors.tags}
        </p>
      )}

      {/* ── 제목 ── */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력하세요"
        className="w-full text-[36px] font-extrabold text-black placeholder:text-gray2 outline-none mb-3 leading-tight"
      />

      {/* 문구는 만들지 않고 검증 모듈이 준 것을 그대로 그린다. */}
      {errors.title && (
        <p className="text-[13px] text-brand-red mb-2">{errors.title}</p>
      )}

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
        {saveStatus === 'saved' && !formError && !errors.content && (
          <p className="text-[13px] text-category-green-dark mr-auto animate-fade-in">
            성공적으로 저장되었습니다!
          </p>
        )}

        {(formError || errors.content) && (
          <p className="text-[13px] text-brand-red mr-auto">
            {errors.content ?? formError}
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
            disabled={publishing}
            className="px-6 py-2 rounded-full bg-brand-red text-white text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {publishing ? '게시 중...' : '게시하기'}
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
