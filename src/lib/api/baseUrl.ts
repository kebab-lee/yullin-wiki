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
 *   pages       발행하면 곧 보여야 한다. 짧게 잡는다.
 */
export const REVALIDATE = {
  categories: 3600,
  pages: 60,
} as const;
