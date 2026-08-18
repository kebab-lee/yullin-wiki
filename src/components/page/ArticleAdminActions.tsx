'use client'

import { useState } from 'react'
import Link from 'next/link'

import { hasRole } from '@/lib/auth/roles'
import { useViewerRole } from '@/lib/auth/viewerRoleClient'

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
 * **표시용 판정이다.** 실제 차단은 pageService 의 assertRole 이 한다 — 버튼을
 * 숨기는 것과 API 를 막는 것은 별개 방어선이고, API 는 화면을 거치지 않고
 * 호출된다.
 *
 * ── 역할을 prop 으로 받지 않는 이유 ──────────────────────────
 * 예전에는 상세 페이지가 `getViewerRole()` 로 역할을 읽어 이 컴포넌트를 그릴지
 * 말지 정했다. 그 쿠키 읽기 하나가 페이지 전체를 동적 렌더로 만들고, 정적으로
 * 생성하면 **빌드 시점 역할로 굳어** 모든 사용자가 같은 결과를 본다. 그래서
 * 세션은 헤더와 같은 스토어에 직접 묻는다 (viewerRoleClient — 탭당 요청 한 번).
 *
 * **자리를 미리 잡지 않는다.** 헤더의 세션 조각들과 다른 판단인데, 여기서
 * 감춰야 할 것이 110px 짜리 버튼 줄이라 미리 비워 두면 **대다수인 비로그인
 * 방문자가** 본문과 댓글 사이의 빈 구멍을 계속 보게 된다. EDITOR 이상에게만
 * 아래가 한 번 밀리는 편이 낫다.
 */
export default function ArticleAdminActions({
  pageId,
  title,
}: ArticleAdminActionsProps) {
  const { role, ready } = useViewerRole()
  const [confirming, setConfirming] = useState(false)

  // GUEST 는 저장되는 role 이 아니라 화면 상태라 hasRole 에 넘기지 않는다
  // (types/auth.ts: ROLE_LEVEL 에 GUEST 를 끼우지 않는 이유와 같다).
  // 소유권은 보지 않는다 — EDITOR 이상이면 누가 쓴 글이든 고치고 지운다.
  if (!ready || role === 'GUEST' || !hasRole(role, 'EDITOR')) return null

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
