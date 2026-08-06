import { notFound } from 'next/navigation'

import PageEditorShell from '@/components/admin/editor/PageEditorShell'
import { ApiResponseError, fetchApi } from '@/lib/api/serverFetch'
import type { PageDetailBody } from '@/lib/api/types'
import { requireRole } from '@/lib/auth/requireRole'

/**
 * **프리렌더 금지.** 자기 Route Handler 를 fetch 하는데 빌드 시점에는 그 서버가
 * 떠 있지 않다. 상세 화면(/pages/[id])과 같은 이유다.
 */
export const dynamic = 'force-dynamic'

/**
 * 게시물 수정 — `/admin/posts/[id]/edit`
 *
 * **가드를 이 페이지에서 직접 부른다.** layout 에 두면 같은 layout 을 공유하는
 * 형제 라우트 사이의 클라이언트 사이드 이동에서 재실행되지 않아 건너뛰어진다
 * (CLAUDE.md "권한"). 그리고 이건 화면 접근 차단일 뿐이고, 실제 수정을 막는
 * 것은 pageService.updatePage 의 assertRole 이다 — 둘 다 필요하다.
 *
 * **소유권은 보지 않는다.** EDITOR 이상이면 누가 쓴 글이든 이 화면에 들어온다.
 * 위키는 공동 편집이 전제라 "내 글"이라는 개념을 두지 않는다.
 *
 * 데이터는 service 가 아니라 자기 Route Handler 를 거친다 (레이어 규칙).
 * 캐시 수명은 0 이다 — 목록 카드와 달리 여기서는 60초 낡은 값이 그대로
 * 저장되어 남의 최신 수정을 덮어쓴다.
 */
export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('EDITOR')

  const { id } = await params

  const detail = await fetchApi<PageDetailBody>(`/api/pages/${id}`, 0).catch(
    (error: unknown) => {
      // 404 만 not-found 로 옮기고 나머지 실패(DB 장애 등)는 그대로 터뜨린다.
      if (error instanceof ApiResponseError && error.status === 404) return null
      throw error
    }
  )

  if (!detail) notFound()

  // content 는 PageContent 그대로 넘긴다. 변환하지 않는다.
  return <PageEditorShell mode="edit" page={detail.page} />
}
