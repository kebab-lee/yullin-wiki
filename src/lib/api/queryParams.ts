// =============================================================
// 쿼리 문자열 → service 파라미터
//
// **원래 Route Handler 가 하던 변환이다.** 세션 의존 화면(어드민)은 자기 라우트를
// fetch 하지 않고 service 를 직접 부르므로(CLAUDE.md "서버 컴포넌트의 self-fetch"),
// 라우트가 하던 `?page=1` → `1` 변환을 페이지가 대신 맡게 됐다. 페이지마다 같은
// 네 줄을 복붙하지 않도록 여기 한 벌만 둔다.
//
// **Java 이관 시 이 파일은 사라진다.** 화면이 다시 라우트를 fetch 하면 변환도
// 라우트 쪽으로 돌아가므로, 여기 있는 것은 직접 호출이 사는 동안만 필요한 조각이다.
// =============================================================

/**
 * `?page=3` 같은 값을 숫자로. 없거나 숫자가 아니면 undefined 를 돌려
 * "기본값을 써라"는 뜻을 service 에 그대로 전달한다.
 *
 * 여기서 범위를 다듬지 않는다. 음수·0·상한 초과를 접는 것은 service 의 일이고
 * (positiveInt · boundedSize), 화면이 미리 거르면 같은 규칙이 두 곳에 생긴다.
 */
export function readNumberParam(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;

  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
