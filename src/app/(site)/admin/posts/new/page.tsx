'use client'

import dynamic from 'next/dynamic'

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

export default function NewPostPage() {
  return <WikiEditor />
}
