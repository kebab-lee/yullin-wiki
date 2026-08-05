'use client'

import dynamic from 'next/dynamic'

/**
 * 에디터를 클라이언트 전용으로 불러오는 껍데기.
 *
 * ssr: false 를 쓰려면 클라이언트 경계가 필요한데, 그 경계를 page.tsx 에 두면
 * 페이지가 통째로 클라이언트 컴포넌트가 되어 서버 가드(requireAdmin)를 부를 수
 * 없다. 그래서 경계를 이 파일로 내리고 page.tsx 는 서버 컴포넌트로 남긴다.
 */
const WikiEditor = dynamic(
  () => import('@/components/admin/editor/WikiEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-[832px] py-5 px-4 animate-pulse">
        <div className="flex gap-4 mb-6">
          <div className="h-8 w-44 bg-gray-100 rounded-full" />
          <div className="h-8 w-32 bg-gray-100 rounded-full" />
        </div>
        <div className="h-10 w-3/4 bg-gray-100 rounded mb-3" />
        <div className="h-px bg-gray-200 mb-0" />
        <div className="h-11 bg-gray-50 rounded mb-0" />
        <div className="h-[500px] bg-gray-50 rounded" />
      </div>
    ),
  }
)

export default function NewPostEditor() {
  return <WikiEditor />
}
