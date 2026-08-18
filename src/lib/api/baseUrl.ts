// =============================================================
// 자기 API 의 주소 · 캐시 수명
//
// 서버 컴포넌트는 service 를 직접 부르지 않고 자기 Route Handler 를 fetch 한다
// (CLAUDE.md "레이어 규칙"). 서버에서 도는 fetch 는 상대 경로를 못 쓰므로
// 절대 URL 이 필요한데, 그 조립 규칙이 페이지마다 흩어지면 백엔드를 Java 로
// 옮길 때 손댈 곳이 페이지 수만큼 늘어난다. **이 파일 한 곳만 바꾸면 되게 둔다.**
//
// revalidate 값도 여기 모은다. 같은 리소스인데 홈은 60초, 푸터는 3600초처럼
// 컴포넌트마다 다른 수를 적으면 어느 쪽이 정본인지 알 수 없게 된다.
// =============================================================

/**
 * 자기 자신의 origin.
 *
 *   NEXT_PUBLIC_SITE_URL  명시 설정이 있으면 최우선 (커스텀 도메인)
 *   VERCEL_URL            Vercel 프리뷰/프로덕션 배포가 주입
 *   localhost             로컬 개발
 *
 * Java 백엔드로 옮겨 API 가 다른 호스트로 나가면 이 함수만 그쪽을 가리키면 된다.
 */
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/** `/api/pages?limit=3` 같은 경로를 절대 URL 로. */
export function apiUrl(path: string): string {
  return `${getBaseUrl()}${path}`;
}

/**
 * Next fetch 캐시 수명(초).
 *
 *   categories  시드로 고정된 값이라 거의 안 바뀐다. 길게 잡는다.
 *   pages       목록·상세의 공개 조회.
 *
 * **pages 의 수명이 "발행이 보이기까지의 지연"이 아니다.** 게시물을 만들거나
 * 고치거나 상태를 바꾸는 네 경로(POST /api/admin/pages · PATCH·DELETE
 * /api/admin/pages/[id] · PATCH .../status)가 전부 `revalidatePath("/", "layout")`
 * 으로 캐시를 턴다. 편집 직후 반영은 이 값과 무관하게 즉시다.
 *
 * 그래서 이 값이 정하는 것은 **아무도 아무것도 고치지 않았을 때 함수를 얼마나
 * 자주 깨우는가**뿐이다. 60초는 그 상황에서 시간당 60번을 헛되이 깨웠다.
 * 300 으로 늘리면 캐시 히트가 늘어 서버리스 함수가 아예 안 뜨고, 잃는 것은
 * revalidate 를 빠뜨린 경로가 생겼을 때의 안전망 폭뿐이다 — 그 경로를 만들지
 * 않는 것이 옳은 방어이지 수명을 짧게 두는 것이 방어가 아니다.
 *
 * **이 값은 페이지의 ISR 수명이기도 하다.** 정적으로 생성되는 라우트(홈,
 * `/pages/[id]`)의 revalidate 는 그 페이지가 부른 fetch 들의 최소값으로 정해진다
 * — 빌드 표의 `Revalidate 5m` 이 여기 적힌 `pages: 300` 이다. 그래서 이 수를
 * 건드리면 캐시 미스 빈도만이 아니라 **정적 HTML 이 얼마나 오래 살아 있는가**도
 * 함께 바뀐다. 편집 직후 반영이 즉시인 것은 위와 같은 이유로 그대로다.
 */
export const REVALIDATE = {
  categories: 3600,
  pages: 300,
} as const;
