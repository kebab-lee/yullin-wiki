import NewPostEditor from '@/components/admin/editor/NewPostEditor'
import { requireRole } from '@/lib/auth/requireRole'

/**
 * 새 게시물 작성 — /admin 하위이므로 서버 가드를 거친다.
 *
 * 에디터는 ssr: false 라 클라이언트 경계가 필요한데, 그 경계는 NewPostEditor 가
 * 들고 있다. 페이지 자체는 서버 컴포넌트로 남아야 requireRole 을 부를 수 있다.
 */
export default async function NewPostPage() {
  // 화면 접근 차단. 데이터 변경 차단은 service 의 assertRole 이 따로 맡는다.
  // 게시물 작성은 EDITOR 권한이다 — ADMIN 전용이 아니다.
  await requireRole('EDITOR')

  return <NewPostEditor />
}
