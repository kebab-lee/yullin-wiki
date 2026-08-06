'use client'

import dynamic from 'next/dynamic'

import type { PageEditorFormProps } from './PageEditorForm'

/**
 * 에디터를 클라이언트 전용으로 불러오는 껍데기.
 *
 * ssr: false 를 쓰려면 클라이언트 경계가 필요한데, 그 경계를 page.tsx 에 두면
 * 페이지가 통째로 클라이언트 컴포넌트가 되어 서버 가드(requireRole)를 부를 수
 * 없다. 그래서 경계를 이 파일로 내리고 page.tsx 는 서버 컴포넌트로 남긴다.
 *
 * **작성·수정 두 화면이 이 껍데기 하나를 같이 쓴다.** 화면마다 껍데기를 따로
 * 만들면 ssr:false 설정과 스켈레톤이 복사되고 로딩 모양이 조용히 갈라진다.
 * 무엇을 그릴지는 props 로 넘어가 PageEditorForm 이 정한다.
 */
const PageEditorForm = dynamic(() => import('./PageEditorForm'), {
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
})

export default function PageEditorShell(props: PageEditorFormProps) {
  return <PageEditorForm {...props} />
}
