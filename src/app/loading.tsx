import RouteLoading from "@/components/common/RouteLoading";

/**
 * 홈(`/`)의 로딩 표시.
 *
 * 홈은 (site) 그룹 밖이라 이 경계가 가장 가깝다. (site) 아래의 화면들은
 * `src/app/(site)/loading.tsx` 가 따로 받는다 — 거기 두어야 헤더가 로딩 중에
 * 사라지지 않는다 (그쪽 주석 참고).
 */
export default function Loading() {
  return <RouteLoading />;
}
