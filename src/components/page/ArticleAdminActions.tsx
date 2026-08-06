'use client'

import { useState } from 'react'
import Link from 'next/link'

import DeletePageDialog from './DeletePageDialog'

type ArticleAdminActionsProps = {
  pageId: string
  /** 삭제 확인 팝업이 입력받을 제목. */
  title: string
}

const BUTTON_CLASS =
  'flex h-[110px] w-[110px] flex-col items-center justify-center gap-[6px] rounded-full border border-brand-red text-[14px] font-bold leading-[18px] text-brand-red transition-colors hover:bg-brand-red hover:text-white'

/**
 * 게시물 상세의 수정·삭제 버튼 (Figma AdContent 1:1905)
 *
 * **표시용 판정이다.** 이 컴포넌트를 그릴지 말지는 상세 페이지가 뷰어 역할로
 * 정하지만, 실제 차단은 pageService 의 assertRole 이 한다 — 버튼을 숨기는 것과
 * API 를 막는 것은 별개 방어선이고, API 는 화면을 거치지 않고 호출된다.
 *
 * 클라이언트 컴포넌트인 이유는 삭제 팝업의 열림 상태 하나 때문이다. 상세
 * 페이지 자체는 서버 컴포넌트로 남는다.
 */
export default function ArticleAdminActions({
  pageId,
  title,
}: ArticleAdminActionsProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <div className="mt-[40px] flex items-center justify-center gap-[25px]">
        <Link href={`/admin/posts/${pageId}/edit`} className={BUTTON_CLASS}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M13.5 2.5l4 4L7 17H3v-4z" />
            <path d="M3 19h14" />
          </svg>
          <span>
            게시물
            <br />
            수정하기
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={BUTTON_CLASS}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 5h14" />
            <path d="M8 2.5h4" />
            <path d="M5 5l1 12h8l1-12" />
          </svg>
          <span>
            게시물
            <br />
            삭제하기
          </span>
        </button>
      </div>

      {confirming && (
        <DeletePageDialog
          pageId={pageId}
          title={title}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  )
}
