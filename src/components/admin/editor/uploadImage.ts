'use client'

// =============================================================
// 이미지 업로드 호출 (에디터 전용)
//
// **에디터 쪽에만 둔다.** 스키마 확장(@/lib/editor/extensions)은 읽기 전용
// 렌더러와 공유하는 파일이라, 업로드 코드를 그쪽에 얹으면 상세 페이지의 서버
// 번들이 fetch 로직과 검증 모듈을 함께 끌고 간다. 렌더러가 알아야 하는 것은
// "이미지 노드가 있다"는 사실뿐이고 "그 이미지가 어떻게 올라갔는가"가 아니다.
//
// 스토리지가 어디인지 모른다. 아는 것은 자기 프로젝트의 API 하나뿐이다
// (CLAUDE.md "클라이언트는 Supabase 의 존재를 몰라야 한다").
// =============================================================

import { NETWORK_ERROR, readErrorBody } from '@/lib/api/errorBody'
import type { ImageUploadedBody } from '@/lib/api/types'
import { validateImageUpload } from '@/lib/validation/upload'

/** 서버가 아무 문구도 주지 못했을 때의 대체 문구. */
const UPLOAD_FAILED = '⚠ 이미지 업로드에 실패했습니다.'

/**
 * 이미지 한 장을 올리고 URL 을 돌려준다. 실패는 사용자에게 보일 문구를 담은
 * Error 로 던진다 — 호출부는 그 문구를 그대로 그리기만 한다.
 *
 * **올리기 전에 같은 검증 함수를 먼저 돌린다.** 4MB 짜리 파일을 서버까지
 * 보내 놓고 400 을 받는 것은 낭비이고, 무엇보다 Vercel 이 4.5MB 에서 요청을
 * 잘라 버려서 문구 없는 실패가 된다. 규칙은 여기 적지 않고 service 와 **같은
 * 함수**를 부른다 — 여기 적으면 두 벌이 되고 조용히 어긋난다.
 */
export async function uploadEditorImage(file: File): Promise<string> {
  const check = validateImageUpload(file)
  if (!check.valid) throw new Error(check.message)

  const body = new FormData()
  body.append('file', file)

  let response: Response
  try {
    response = await fetch('/api/admin/uploads', { method: 'POST', body })
  } catch {
    throw new Error(NETWORK_ERROR)
  }

  if (!response.ok) {
    // 400 은 file 칸의 문구가, 401/403 은 폼 단위 문구만 실려 온다.
    const error = await readErrorBody(response)
    throw new Error(error.fields?.file ?? error.message ?? UPLOAD_FAILED)
  }

  const { url } = (await response.json()) as ImageUploadedBody
  return url
}
