'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { NETWORK_ERROR, readErrorBody } from '@/lib/api/errorBody'

type DeletePageDialogProps = {
  pageId: string
  /** 확인 문구로 입력받을 제목. 화면에도 그대로 보여준다. */
  title: string
  onClose: () => void
}

const CONFIRM_HINT = '삭제하려면 게시물 제목을 정확히 입력해주세요.'

/**
 * 게시물 삭제 확인 팝업 (Figma 1:1759)
 *
 * **confirm() 을 쓰지 않는다.** 브라우저 확인창은 엔터 한 번이면 지나가서
 * 손이 먼저 움직이는 실수를 전혀 막지 못한다. 제목을 직접 옮겨 적게 하면
 * "무엇을" 지우는지 읽지 않고는 통과할 수 없다 — 위키는 EDITOR 이상이면 남의
 * 글도 지울 수 있으므로(소유권을 보지 않으므로) 이 한 겹이 더 필요하다.
 *
 * 여기서 막는 것은 실수이지 권한이 아니다. 권한은 pageService.deletePage 가
 * 판정하고, 이 팝업을 건너뛰고 API 를 직접 불러도 그쪽에서 막힌다.
 */
export default function DeletePageDialog({
  pageId,
  title,
  onClose,
}: DeletePageDialogProps) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmed = confirmText.trim() === title.trim()

  const handleDelete = async () => {
    if (!confirmed || deleting) return

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/pages/${pageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const body = await readErrorBody(response)
        setError(body.message)
        setDeleting(false)
        return
      }

      // 삭제된 글의 상세로 돌아갈 수는 없다. 홈으로 나간다.
      router.push('/')
      // 목록에서도 사라져야 한다. 서버 쪽 캐시는 route handler 가 털었고,
      // 여기서는 라우터 캐시에 남은 이전 렌더를 버린다.
      router.refresh()
    } catch {
      setError(NETWORK_ERROR)
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-page-dialog-title"
    >
      <div className="w-full max-w-[420px] rounded-[16px] bg-white p-[28px]">
        <h2
          id="delete-page-dialog-title"
          className="text-[20px] font-bold text-black"
        >
          게시물 삭제
        </h2>

        <p className="mt-[12px] text-[14px] leading-[22px] text-gray4">
          이 게시물을 삭제하면 목록과 상세 화면에서 더 이상 보이지 않습니다.
          <br />
          {CONFIRM_HINT}
        </p>

        <p className="mt-[16px] break-words rounded-[8px] bg-gray-50 px-[12px] py-[10px] text-[14px] font-bold text-black">
          {title}
        </p>

        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="게시물 제목 입력"
          aria-label="삭제 확인용 게시물 제목"
          autoFocus
          className="mt-[12px] w-full rounded-[8px] border border-gray2 px-[12px] py-[10px] text-[14px] outline-none focus:border-brand-red"
        />

        {error && (
          <p className="mt-[10px] text-[13px] text-brand-red">{error}</p>
        )}

        <div className="mt-[20px] flex justify-end gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-full border border-gray2 px-[20px] py-[8px] text-[14px] text-gray3 transition-colors hover:border-brand-red hover:text-brand-red disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDelete}
            // 제목이 일치하기 전에는 누를 수 없다. 확인 절차를 화면 문구로만
            // 두면 절차가 아니라 안내가 된다.
            disabled={!confirmed || deleting}
            className="rounded-full bg-brand-red px-[24px] py-[8px] text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {deleting ? '삭제 중...' : '삭제하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
