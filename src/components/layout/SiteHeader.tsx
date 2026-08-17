import SearchInput from "@/components/common/SearchInput";
import ViewerAuthActions from "@/components/common/ViewerAuthActions";

import HeaderBrand from "./HeaderBrand";

/**
 * 모든 페이지가 공유하는 헤더 — Figma `Header` 1:433 / `AdHeader` 1:1680.
 *
 * ── 셸은 한 벌이다 (예전에는 PublicHeaderView / AdminHeaderView 두 벌이었다) ──
 * 두 시안의 차이는 넷뿐이었다: 로고 목적지, "관리자" 라벨, 프로필 아이콘이 늘
 * 있는가, 그리고 lg 높이 131/135 와 로고↔검색 간격 20/15 라는 4~5px 차이.
 * 앞의 셋은 전부 **세션에 달린 값**이라 클라이언트 조각(HeaderBrand ·
 * ViewerAuthActions)으로 내려갔고, 남은 것은 픽셀 몇 개였다.
 *
 * 그래서 셸을 나눌 이유가 사라졌다. 나눠 두면 role 을 서버에서 알아야 셸을
 * 고를 수 있는데, 그 순간 이 헤더를 쓰는 모든 페이지가 쿠키를 읽는 동적 렌더가
 * 되어 정적 생성이 막힌다 — 이 구조를 바꾸는 목적 자체가 그것이었다.
 * 덤으로 "반응형 수정을 두 파일에 같이 적용해야 한다"는 위험도 사라진다.
 *
 * **남은 값은 공개 시안(1:433)을 정본으로 삼는다** — 절대다수가 보는 화면이고,
 * 높이를 role 로 갈랐다가는 EDITOR 가 로그인할 때 헤더가 4px 튄다.
 * 관리자 헤더는 시안 대비 높이 -4px · 간격 +5px 로 그려진다.
 *
 * ── 이 파일은 서버 컴포넌트다 ──────────────────────────────
 * 세션을 읽지 않는다. 읽는 순간 아래 모든 페이지가 동적이 된다. 세션이 필요한
 * 조각만 클라이언트이고, 그 둘이 각자 /api/auth/me 를 묻는 것이 아니라 같은
 * 스토어를 구독해 요청 하나를 나눠 쓴다 (viewerRoleClient).
 *
 * 홈(/)에는 이 헤더가 붙지 않는다 — (site) route group 밖이고 히어로의
 * HeroHeaderBar 가 그 역할을 겸한다 (CLAUDE.md "레이아웃").
 */
export function SiteHeader() {
  return (
    // 모바일에서는 높이를 내용에 맡긴다. `h-[131px] overflow-hidden` 이 걸린 채
    // 두 줄이 되면 검색 줄이 잘려 나간다.
    <header className="w-full bg-white lg:h-[131px] lg:overflow-hidden">
      {/*
        한 벌의 마크업으로 두 배치를 만든다 (모바일 전용 헤더를 따로 만들지 않는다).

        - lg 미만: 줄바꿈으로 2행 — [로고 | 프로필·로그인] / [검색창 전폭].
          검색이 위키의 주 진입점이라 좁은 화면에서 전폭을 준다.
        - lg 이상: 한 행 — 시안(1512 프레임 좌우 209px 여백 → 1094px, 상단 71px) 그대로.
          order 로 검색창을 로고 옆으로 되돌리고 우측 묶음을 끝으로 보낸다.
      */}
      <div className="mx-auto flex w-full max-w-[1094px] flex-wrap items-center gap-x-5 gap-y-[14px] px-4 py-[14px] lg:flex-nowrap lg:px-0 lg:py-0 lg:pt-[71px]">
        <div className="order-1 shrink-0">
          <HeaderBrand />
        </div>

        {/* 검색 — 모바일에서는 자기 줄을 통째로 쓴다 */}
        <div className="order-3 w-full min-w-0 lg:order-2 lg:w-auto">
          <SearchInput variant="header" />
        </div>

        {/* 우: 로그인 여부에 따라 교체. `ml-auto` 가 이 묶음을 오른쪽 끝에
            붙여 두므로, 안에서 폭이 변해도 로고·검색창은 움직이지 않는다. */}
        <div className="order-2 ml-auto lg:order-3">
          <ViewerAuthActions />
        </div>
      </div>
    </header>
  );
}
