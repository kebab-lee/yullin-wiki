import RouteLoading from "@/components/common/RouteLoading";

/**
 * 헤더가 붙는 모든 화면(목록 · 상세 · 검색 · 어드민)의 로딩 표시.
 *
 * **라우트마다 loading.tsx 를 두지 않고 여기 하나로 받는다.** Next 는 가장
 * 가까운 loading.tsx 를 쓰므로 이 한 장이 (site) 아래 전부를 덮고, 화면이
 * 늘어날 때마다 같은 내용의 파일을 복사할 필요가 없다. 라우트별로 다른 로딩
 * 화면이 필요해지는 날에는 그 라우트에만 loading.tsx 를 두면 여기를 덮는다.
 *
 * **(site) 안에 두는 것이 요점이다.** 루트(`src/app/loading.tsx`)에 몰면 그
 * 경계가 `(site)/layout.tsx` **바깥**이라 로딩 중에 헤더까지 통째로 사라졌다가
 * 다시 나타난다. 여기 두면 경계가 레이아웃 안쪽이라 헤더·푸터는 그대로 있고
 * 본문만 바뀐다.
 *
 * 이게 필요한 이유: 서버 컴포넌트가 자기 Route Handler 를 fetch 하는 구조라
 * 응답이 올 때까지 렌더가 시작되지 않는다. 경계가 없으면 그동안 화면이 이전
 * 페이지에 멈춰 있어 클릭이 안 먹은 것처럼 보인다 — 체감 속도 문제다.
 */
export default function Loading() {
  return <RouteLoading />;
}
