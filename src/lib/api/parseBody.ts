// =============================================================
// JSON 바디 → 문자열 필드 맵
//
// Route Handler 의 책임은 "HTTP 를 service 가 아는 모양으로 옮기는 것"까지다.
// 값이 규칙에 맞는지는 여기서 판단하지 않는다 (그건 validation 모듈의 몫).
//
// 문자열이 아닌 값·누락된 값은 빈 문자열로 떨어뜨린다. 그러면 service 의
// 검증이 "형식을 확인해주세요" 같은 정본 문구로 걸러준다 —
// 여기에 별도 문구를 만들면 검증 규칙이 두 벌이 된다.
// =============================================================

/** 폼 입력처럼 전부 문자열인 바디를 안전하게 꺼낸다. */
export function asStringMap<K extends string>(
  body: unknown,
  keys: readonly K[],
): Record<K, string> {
  const source: Record<string, unknown> =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const result = {} as Record<K, string>;
  for (const key of keys) {
    const value = source[key];
    result[key] = typeof value === "string" ? value : "";
  }
  return result;
}
