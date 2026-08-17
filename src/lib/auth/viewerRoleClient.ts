"use client";

// =============================================================
// 브라우저에서 읽는 화면 권한(ViewerRole)
//
// **이건 "표시"용이다. 권한 판정이 아니다.**
// 여기서 나온 role 이 하는 일은 헤더에 로그인 버튼을 그릴지 로그아웃 버튼을
// 그릴지, "관리자" 라벨을 붙일지뿐이다. 클라이언트가 이 값을 위조해도 얻는 것이
// 없다 — 화면 접근은 서버의 requireRole / requireAuth 가 막고, 데이터 변경은
// service 의 assertRole / assertAuthenticated 가 막는다. 그 둘은 이 파일을
// 거치지 않고 쿠키의 JWT 를 직접 검증한다 (CLAUDE.md "권한": 두 방어선은
// 서로를 대체하지 않는다).
//
// ── 왜 서버가 아니라 브라우저인가 ────────────────────────────
// 예전에는 (site)/layout.tsx 가 getSession() 으로 role 을 읽어 헤더를 서버에서
// 정했다. 그러면 그 아래 모든 페이지가 쿠키를 읽는 동적 렌더가 되고, 정적으로
// 생성하는 순간 role 이 **빌드 시점 값으로 굳어** 모든 사용자가 같은 헤더를 본다.
// 헤더의 세션 의존 조각만 브라우저로 내리면 페이지 본문은 정적으로 남는다.
//
// ── 저장하지 않는다 ──────────────────────────────────────────
// localStorage 에 넣지 않는다. 세션의 정본은 httpOnly 쿠키이고, 사본을 디스크에
// 두면 로그아웃·차단·만료된 뒤에도 남아서 서버가 아는 상태와 갈린다.
// 여기 캐시는 **탭이 살아 있는 동안만**인 모듈 변수라, 새로고침하면 사라지고
// 다시 /api/auth/me 에 묻는다.
// =============================================================

import { useSyncExternalStore } from "react";

import type { ViewerRole } from "@/lib/types";

import { isRole } from "./roles";

/**
 * `ready` 가 별도로 있는 이유: "아직 모른다"와 "물어봤더니 비로그인이다"는
 * 다르다. 둘을 GUEST 하나로 합치면 화면이 로그인 버튼을 먼저 그렸다가
 * 로그아웃 버튼으로 바꿔 다는 깜빡임이 생긴다.
 */
type ViewerRoleState = {
  role: ViewerRole;
  ready: boolean;
};

/**
 * 아직 물어보기 전. **객체 하나를 재사용한다** — useSyncExternalStore 는
 * 스냅샷의 참조가 같아야 리렌더를 멈추므로 매번 새 객체를 만들면 무한 루프다.
 */
const UNRESOLVED: ViewerRoleState = { role: "GUEST", ready: false };

let state: ViewerRoleState = UNRESOLVED;
let inFlight: Promise<void> | null = null;

const listeners = new Set<() => void>();

function setState(next: ViewerRoleState): void {
  state = next;
  for (const listener of listeners) listener();
}

/**
 * 답을 이미 아는 쪽이 알려준다 — 로그인 성공(LoginForm)과 로그아웃
 * (AuthActionButton).
 *
 * 이게 없으면 로그인 직후에도 헤더가 캐시된 GUEST 를 그대로 들고 있다.
 * 굳이 /api/auth/me 를 다시 부르지 않는 것은, 방금 그 요청의 응답으로 role 을
 * 이미 받았기 때문이다(왕복 하나를 아낀다).
 */
export function setViewerRole(role: ViewerRole): void {
  inFlight = null;
  setState({ role, ready: true });
}

/**
 * 실패하면 GUEST 로 접는다. 401(비로그인)과 네트워크 장애를 구분해서 화면에
 * 알리지 않는 이유는, 헤더가 할 수 있는 일이 어느 쪽이든 "로그인 버튼을
 * 그린다" 하나뿐이기 때문이다. 진짜 판정은 서버가 다시 한다.
 */
async function fetchViewerRole(): Promise<ViewerRole> {
  try {
    // no-store 다. 응답이 사용자마다 다르고, 로그인·로그아웃 직후에 낡은 값이
    // 돌아오면 헤더가 서버가 아는 상태와 갈린다.
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) return "GUEST";

    const body: unknown = await response.json();
    const role = (body as { user?: { role?: unknown } })?.user?.role;

    // 서버 응답이라도 모양까지 믿지 않는다 (session.ts 의 verifySession 과 같은 규칙).
    return isRole(role) ? role : "GUEST";
  } catch {
    return "GUEST";
  }
}

function load(): void {
  if (state.ready || inFlight) return;

  inFlight = fetchViewerRole().then((role) => {
    inFlight = null;
    setState({ role, ready: true });
  });
}

/**
 * 구독 시점에 한 번 당겨온다. 헤더의 조각 둘(HeaderBrand · ViewerAuthActions)이
 * 각각 구독해도 `inFlight` 가드가 요청을 하나로 합친다.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  load();

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ViewerRoleState {
  return state;
}

/**
 * 서버(프리렌더·SSR)에서는 언제나 "아직 모른다"다. 쿠키를 읽지 않는 것이
 * 이 파일의 존재 이유이므로, 여기서 세션을 들여다보면 정적 생성이 다시 막힌다.
 */
function getServerSnapshot(): ViewerRoleState {
  return UNRESOLVED;
}

export function useViewerRole(): ViewerRoleState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
