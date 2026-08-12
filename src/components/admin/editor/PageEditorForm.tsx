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
import type { PageStatus } from '@/lib/types'
import { contentExtensions } from '@/lib/editor/extensions'
import type { Category, PageDetail } from '@/lib/types'
import { ALLOWED_IMAGE_TYPES } from '@/lib/validation/upload'
import {
  toEditorContent,
  validatePageForm,
  type PageFormErrors,
  type PageFormInput,
} from '@/lib/validation/page'
import EditorToolbar from './EditorToolbar'
import { createImageUpload, uploadImagesInto } from './imageUpload'
import {
  applyMarkdownOffer,
  createMarkdownPaste,
  type MarkdownOffer,
} from './markdownPaste'
import { createSlashCommand } from './slashCommand'

type SaveStatus = 'idle' | 'saving' | 'saved'

/**
 * 에디터 위에 뜨는 마크다운 안내. **하나의 상태로 두 국면을 표현한다** —
 * 물어보는 중(offer)과 변환 결과 보고(result)는 같은 자리에 번갈아 뜨고
 * 동시에 뜰 일이 없다. 플래그를 둘로 나누면 둘 다 켜진 경우를 화면이 따로
 * 처리해야 한다 (CLAUDE.md "기존 플래그를 재사용한다").
 */
type MarkdownBanner =
  | { kind: 'offer'; offer: MarkdownOffer }
  | { kind: 'result'; notes: readonly string[]; remoteImages: number }

/**
 * 작성 화면과 수정 화면은 **같은 폼**이다. 채우는 칸도, 검증 규칙도, 저장 후
 * 가는 곳도 같고 다른 것은 셋뿐이다 — 초기값 · 보낼 곳(POST/PATCH) · 버튼 문구.
 * 그래서 컴포넌트를 복제하지 않고 mode 로 가른다. 복제하면 태그 입력·이미지
 * 업로드·검증 연결 같은 덩어리가 두 벌이 되고 한쪽만 고쳐진다.
 *
 * edit 일 때 page 가 필수라는 것을 유니온으로 못박는다. `page?: PageDetail` 로
 * 두면 "수정 화면인데 초기값이 없는" 상태가 타입상 가능해진다.
 */
export type PageEditorFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; page: PageDetail }

/** 서버가 돌려준 필드 에러 중 이 폼이 아는 칸만 남긴다. */
const ERROR_FIELDS = ['title', 'categoryId', 'content', 'tags'] as const

function toFieldErrors(
  fields: Record<string, string> | undefined
): PageFormErrors {
  const errors: PageFormErrors = {}
  for (const key of ERROR_FIELDS) {
    const message = fields?.[key]
    if (message) errors[key] = message
  }
  return errors
}

export default function PageEditorForm(props: PageEditorFormProps) {
  /** 수정 대상. null 이면 작성 화면이다. 분기 조건을 이 값 하나로 모은다. */
  const initial = props.mode === 'edit' ? props.page : null

  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  // 표시 전용이다. 서버로 보내지 않는다 — authorId 는 세션에서 온다.
  // 수정 화면에서는 **원 작성자**를 그린다. 고치는 사람이 작성자를 덮어쓰지
  // 않기 때문이다 ("누가 고쳤는가"는 page_revisions 가 답한다).
  const [authorName, setAuthorName] = useState(initial?.authorName ?? '')
  // 저장 시 pages.category_id 로 그대로 들어갈 값. 표시명이 아니라 id 를 담는다 —
  // 표시명은 바뀔 수 있고, 바뀌면 저장된 값이 어느 항목인지 알 수 없게 된다.
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  /**
   * 임시저장으로 만들어 둔 초안의 id. 두 번째 저장부터는 새 글을 만들지 않고
   * 이 글을 고친다 — 없으면 누를 때마다 초안이 한 건씩 쌓인다.
   *
   * 화면을 떠나면 사라지는 값이라는 점은 의도다. 초안은 이미 서버에 있고
   * (localStorage 사본이 아니다) 이어 쓰기는 임시저장소 화면이 열 일이다.
   */
  const [draftId, setDraftId] = useState<string | null>(null)

  // 저장 진행 상태와 에러. saving 은 중복 제출 방지용이다 — 작성에서 두 번
  // 눌리면 같은 글이 두 건 생긴다(멱등키가 없다).
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<PageFormErrors>({})
  /** 특정 칸에 붙지 않는 실패(401/403/404/네트워크)를 담는다. */
  const [formError, setFormError] = useState<string | null>(null)
  /** 마크다운 붙여넣기 제안 · 변환 결과. 에디터 바로 위에 그린다. */
  const [markdownBanner, setMarkdownBanner] = useState<MarkdownBanner | null>(
    null
  )

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
        console.error('[PageEditorForm] 카테고리 조회 실패', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 작성자 표시용. 저장에는 쓰지 않으므로 실패해도 저장을 막지 않는다 —
  // 진짜 작성자는 서버가 세션에서 정한다. 수정 화면은 원 작성자를 이미 props 로
  // 받았으므로 부르지 않는다.
  const isEditing = initial !== null

  useEffect(() => {
    if (isEditing) return
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
        console.error('[PageEditorForm] 사용자 조회 실패', error)
      })

    return () => {
      cancelled = true
    }
  }, [isEditing])

  const triggerImageUpload = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  /**
   * 이미지 업로드 실패 문구. **새 상태를 만들지 않고 formError 를 쓴다** —
   * 특정 입력 칸에 붙지 않는 실패라는 점에서 401/403/네트워크 실패와 같은
   * 종류이고, 비슷한 플래그를 하나 더 만들면 두 문구가 동시에 뜨는 경우를
   * 화면이 따로 처리해야 한다 (CLAUDE.md "기존 플래그를 재사용한다").
   */
  const reportImageError = useCallback((message: string) => {
    setFormError(message)
  }, [])

  /**
   * 마크다운 제안이 생기거나 사라졌다.
   *
   * 사라졌다는 알림(null)이 **결과 보고까지 지우지는 않게** 한다. 변환 자체가
   * 문서를 바꾸는 편집이라 확장은 그 직후 제안을 거두는데, 그때 결과 문구가
   * 함께 사라지면 무엇이 변환되지 않았는지 읽을 새가 없다.
   */
  const reportMarkdownOffer = useCallback((offer: MarkdownOffer | null) => {
    setMarkdownBanner((prev) => {
      if (offer) return { kind: 'offer', offer }
      return prev?.kind === 'offer' ? null : prev
    })
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
      // 붙여넣기·드롭으로 들어오는 이미지를 스토리지 업로드로 돌린다.
      // 이것이 없으면 ProseMirror 기본 동작이 base64 를 본문 JSON 에 박는다.
      createImageUpload(reportImageError),
      // 마크다운 원문을 붙여넣었을 때 서식 적용을 **제안**한다. 자동으로
      // 바꾸지 않으므로 이 확장이 없을 때와 붙여넣기 결과가 같다.
      createMarkdownPaste(reportMarkdownOffer),
    ],
    editorProps: {
      attributes: { class: 'outline-none min-h-[500px] py-6' },
    },
  })

  /**
   * 저장된 본문을 에디터에 채운다 (수정 화면).
   *
   * 저장된 값을 **그대로** 넣는다. 커스텀 포맷으로 바꿔 넣지 않는다 —
   * pages.content 는 Tiptap 이 내보낸 ProseMirror 문서 JSON 그 자체이기
   * 때문이다 (CLAUDE.md "에디터 / 본문 포맷"). toEditorContent 는 도메인 타입
   * PageContent 를 에디터 타입으로 보는 경계일 뿐 변환기가 아니다.
   *
   * editor 가 준비된 뒤에야 넣을 수 있어서 effect 다. 의존성이 editor 와 초기
   * 본문뿐이라 사용자가 편집하는 동안 다시 돌지 않는다.
   */
  const initialContent = initial?.content ?? null

  useEffect(() => {
    if (!editor || !initialContent) return
    editor.commands.setContent(toEditorContent(initialContent))
  }, [editor, initialContent])

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

  /**
   * 툴바·슬래시 커맨드로 고른 파일. 붙여넣기·드롭과 **같은 경로**(uploadImagesInto)로
   * 보낸다 — 여기서만 다르게 처리하면 한 길만 조용히 base64 로 남는다.
   *
   * 고르기 전에 focus 를 준다. 파일 대화상자를 여는 동안 에디터가 포커스를
   * 잃으면 selection 이 문서 맨 앞으로 돌아가 이미지가 엉뚱한 자리에 꽂힌다.
   */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 같은 파일을 연달아 고를 수 있도록 즉시 비운다.
    e.target.value = ''
    if (!file || !editor) return

    setFormError(null)
    editor.commands.focus()
    void uploadImagesInto(
      editor,
      [file],
      editor.state.selection.from,
      reportImageError
    )
  }

  // ---- 마크다운 붙여넣기 ----

  /**
   * 제안을 받아들인다. 변환은 트랜잭션 하나라 Ctrl+Z 로 통째로 되돌아간다 —
   * 잘못 눌러도 붙여넣은 원문이 그대로 남는다.
   */
  const handleMarkdownApply = (offer: MarkdownOffer) => {
    if (!editor) return
    const { notes, remoteImages } = applyMarkdownOffer(editor, offer)
    setMarkdownBanner({ kind: 'result', notes, remoteImages })
  }

  // ---- 액션 핸들러 ----

  /**
   * 지금 폼의 값. 저장·임시저장이 같은 모양을 보낸다 — 초안과 발행글의 차이는
   * 입력의 모양이 아니라 status 하나뿐이다.
   */
  const readInput = (): PageFormInput | null => {
    if (!editor) return null
    return { title, categoryId, content: editor.getJSON(), tags }
  }

  /** 서버가 돌려준 실패를 폼에 옮긴다. 세 저장 경로가 같은 처리를 쓴다. */
  const applyErrorBody = async (response: Response) => {
    const body = await readErrorBody(response)
    setErrors(toFieldErrors(body.fields))
    setFormError(body.message)
  }

  /**
   * 임시저장 — status='DRAFT' 로 **서버에** 저장한다.
   *
   * 예전에는 localStorage 키 하나에 넣어 두었는데, 그건 브라우저를 바꾸면
   * 사라지고 서버는 그런 글이 있는 줄도 모르는 저장이었다. 초안은 이제 pages
   * 행이고 status 축의 한 값이다 (DRAFT → 발행 전 · 공개 노출 없음).
   *
   * 검증은 발행과 **같은 규칙**(validatePageForm)이다. 초안이라고 규칙을 풀면
   * 서버가 같은 함수로 다시 거절하므로 폼만 두 벌이 된다.
   */
  const handleSaveDraft = async () => {
    const input = readInput()
    if (!input || saving) return

    const found = validatePageForm(input)
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    setSaveStatus('saving')

    try {
      // 첫 저장은 만들고(POST), 이후는 그 초안을 고친다(PATCH). 본문 수정은
      // status 를 건드리지 않으므로 초안은 계속 초안으로 남는다.
      const response = await fetch(
        draftId ? `/api/admin/pages/${draftId}` : '/api/admin/pages',
        {
          method: draftId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          // status 는 만들 때만 싣는다. 본문 수정(PATCH)은 상태를 건드리지
          // 않는 요청이고, 상태 전환은 전용 경로(/status)가 따로 있다.
          body: JSON.stringify(
            draftId ? input : { ...input, status: 'DRAFT' satisfies PageStatus }
          ),
        }
      )

      if (!response.ok) {
        await applyErrorBody(response)
        setSaveStatus('idle')
        return
      }

      const { id } = (await response.json()) as PageCreatedBody
      setDraftId(id)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setFormError(NETWORK_ERROR)
      setSaveStatus('idle')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    if (!title.trim()) {
      alert('미리보기를 진행하기 위해서 제목을 입력해주세요.')
      return
    }
    alert('미리보기 기능은 준비 중입니다.')
  }

  /**
   * 저장 — 작성은 POST /api/admin/pages, 수정은 PATCH /api/admin/pages/[id].
   * 둘 다 성공하면 /pages/[id] 로 간다.
   *
   * 클라이언트 검증은 왕복을 아끼는 편의일 뿐이고 진짜 방어선은 service 다.
   * 그래서 서버와 **같은 함수**(validatePageForm)를 쓴다 — 규칙을 여기 적으면
   * 서버에서 다시 쓰게 되고 두 벌이 조용히 어긋난다.
   *
   * 본문은 editor.getJSON() 을 그대로 싣는다. 작성자는 싣지 않는다 — 작성은
   * 서버가 세션에서 정하고, 수정은 작성자를 아예 건드리지 않는다.
   */
  const handleSubmit = async () => {
    const input = readInput()
    if (!input || saving) return

    const found = validatePageForm(input)
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setSaving(true)

    // 고칠 대상이 있으면(수정 화면이거나 임시저장해 둔 초안이 있으면) 새로
    // 만들지 않고 그 글을 고친다. 초안을 저장해 두고 게시하기를 누른 사용자가
    // 같은 글을 두 건 만들어서는 안 된다.
    const targetId = initial?.id ?? draftId

    try {
      const response = await fetch(
        targetId ? `/api/admin/pages/${targetId}` : '/api/admin/pages',
        {
          method: targetId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            targetId ? input : { ...input, status: 'PUBLISHED' satisfies PageStatus }
          ),
        }
      )

      if (!response.ok) {
        // 400 은 필드 문구가, 401/403/404 는 폼 단위 문구만 실려 온다.
        await applyErrorBody(response)
        setSaving(false)
        return
      }

      const { id } = (await response.json()) as PageCreatedBody

      // 초안이었으면 본문을 고치는 것만으로는 아직 공개되지 않는다. 발행은
      // 상태 전환이라 전용 경로로 한 번 더 부른다 (DRAFT → PUBLISHED).
      // 이미 공개된 글을 고친 경우(initial)는 상태가 그대로여야 하므로 부르지
      // 않는다 — 숨김 상태로 고쳤다가 저장했다고 다시 공개되면 안 된다.
      if (!initial && draftId) {
        const published = await fetch(`/api/admin/pages/${draftId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PUBLISHED' satisfies PageStatus }),
        })

        if (!published.ok) {
          await applyErrorBody(published)
          setSaving(false)
          return
        }
      }
      // 이동이 끝날 때까지 버튼을 다시 열지 않는다. 여기서 saving 을 내리면
      // 화면이 바뀌기 전 짧은 틈에 한 번 더 눌린다.
      router.push(`/pages/${id}`)
      // 상세 화면은 서버 컴포넌트다. 라우터 캐시에 남은 이전 렌더를 버려야
      // 방금 고친 내용이 보인다 (서버 쪽 캐시는 route handler 가 턴다).
      router.refresh()
    } catch {
      setFormError(NETWORK_ERROR)
      setSaving(false)
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

      {/* ── 마크다운 붙여넣기 안내 ──
          제안과 결과가 같은 자리에 뜬다. 에디터 위에 두는 이유: 방금 붙여넣은
          내용 바로 곁이라 무엇에 대한 이야기인지 찾을 필요가 없다. */}
      {markdownBanner?.kind === 'offer' && (
        <div className="flex flex-wrap items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-brand-red-white text-[13px] text-black">
          <span className="mr-auto">
            마크다운 문서로 보입니다. 서식을 적용할까요?
          </span>
          <button
            type="button"
            onClick={() => handleMarkdownApply(markdownBanner.offer)}
            className="min-h-11 px-4 rounded-full bg-brand-red text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            서식 적용
          </button>
          <button
            type="button"
            onClick={() => setMarkdownBanner(null)}
            className="min-h-11 px-4 rounded-full border border-gray2 text-[13px] text-gray3 hover:border-brand-red hover:text-brand-red transition-colors"
          >
            그대로 두기
          </button>
        </div>
      )}

      {markdownBanner?.kind === 'result' && (
        <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded-lg bg-gray-50 text-[13px] text-gray3">
          <div className="flex-1 min-w-0">
            <p className="text-black">마크다운 서식을 적용했습니다.</p>
            {/* 조용히 버리지 않는다 — 무엇이 그대로 오지 못했는지 그대로 읽어준다. */}
            {markdownBanner.notes.map((note) => (
              <p key={note} className="mt-1">
                {note}
              </p>
            ))}
            {/* 원격 이미지는 실패가 아니라 알아둘 일이다. 원본이 사라지면
                본문에서도 사라지는 이미지라는 뜻이다. */}
            {markdownBanner.remoteImages > 0 && (
              <p className="mt-1">
                외부 이미지 {markdownBanner.remoteImages}장이 포함됐습니다. 원본
                주소가 바뀌면 본문에서도 보이지 않게 됩니다.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMarkdownBanner(null)}
            className="size-11 -my-2 -mr-2 shrink-0 flex items-center justify-center text-gray3 hover:text-brand-red transition-colors"
            aria-label="안내 닫기"
          >
            ×
          </button>
        </div>
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
          {/* 임시저장·미리보기는 작성 화면에만 둔다. 이미 발행된 글에 "임시저장"이
              붙으면 공개된 글을 초안으로 되돌리는 것처럼 보이는데, 그런 전환은
              허용하지 않는다 (validation/pageStatus 의 전환표).
              미리보기는 아직 stub 이다. */}
          {!initial && (
            <>
              <button
                type="button"
                onClick={() => void handleSaveDraft()}
                disabled={saving || saveStatus === 'saving'}
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
            </>
          )}

          {initial && (
            <button
              type="button"
              onClick={() => router.push(`/pages/${initial.id}`)}
              className="px-5 py-2 rounded-full border border-gray2 text-[14px] text-gray3 hover:border-brand-red hover:text-brand-red transition-colors"
            >
              취소
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 rounded-full bg-brand-red text-white text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {initial
              ? saving
                ? '수정 중...'
                : '수정하기'
              : saving
                ? '게시 중...'
                : '게시하기'}
          </button>
        </div>
      </div>

      {/* 숨겨진 파일 input.
          accept 는 검증 모듈이 가진 목록 그대로다. 여기 문자열을 따로 적으면
          대화상자에서는 고를 수 있는데 업로드는 거절당하는 형식이 생긴다. */}
      <input
        ref={imageInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={handleImageChange}
      />
    </div>
  )
}
