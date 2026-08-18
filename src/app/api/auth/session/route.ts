// GET /api/auth/session — 헤더가 로그인 상태를 그리기 위해 묻는 최소 응답
//
// ── /api/auth/me 와 왜 따로 두는가 ──────────────────────────
// 둘은 답하는 질문이 다르다.
//   /api/auth/me       "내가 누구인가" — 이름·연락처까지 실린 User 전체.
//                      세션의 userId 로 DB 를 다시 조회한다(차단·탈퇴가 토큰
//                      만료를 기다리지 않고 반영되어야 하므로). 지금 이걸 쓰는
//                      곳은 새 게시물 에디터 하나다(작성자 이름 표시).
//   /api/auth/session  "화면을 어떤 모양으로 그릴까" — role 한 칸.
//
// 헤더는 **모든 페이지 로드마다** 이걸 부른다. 거기에 /api/auth/me 를 쓰면
// 페이지뷰마다 DB 쿼리가 하나 붙고, 헤더에 쓰지도 않는 PII 가 네트워크를 오간다.
// 그래서 이 라우트는 **JWT payload 만 읽는다.** getSession() 이 서명·만료를
// 검증하고 { sub, role } 을 돌려주므로 role 은 이미 손에 있다 — DB 를 다녀올
// 이유가 없다.
//
// ── 비로그인이 401 이 아니라 200 인 이유 ────────────────────
// "로그인하지 않았다"는 이 질문에 대한 **정상적인 답**이지 실패가 아니다.
// 401 로 답하면 부르는 쪽이 매번 에러 분기로 정상 상태를 복원해야 하고,
// 브라우저 콘솔에도 실패로 찍혀 진짜 장애와 섞인다. /api/auth/me 가 401 인 것은
// 저쪽이 "User 를 달라"는 요청이라 줄 것이 없을 때 줄 수 없기 때문이고,
// 여기는 언제나 줄 것(GUEST)이 있다.
//
// ── 이건 표시용이다. 권한이 아니다 ──────────────────────────
// 이 응답으로 무엇이 열리지 않는다. 화면 접근은 requireRole / requireAuth 가,
// 데이터는 service 의 assertRole / assertAuthenticated 가 막는다. 셋 다 이
// 라우트를 거치지 않고 쿠키의 JWT 를 직접 검증한다 (CLAUDE.md "권한").

import { NextResponse } from "next/server";

import type { ViewerSessionBody } from "@/lib/api/types";
import { getViewerRole } from "@/lib/auth/viewer";

export async function GET() {
  // "세션 없음 = GUEST" 매핑을 여기에 다시 적지 않는다. 정본은 viewer.ts 이고
  // 서버 컴포넌트(/pages/[id])도 같은 함수를 쓴다 — 두 곳에 적으면 한쪽만
  // 고쳐질 때 화면마다 답이 갈린다.
  //
  // try/catch 가 없다. getSession() 은 위조·만료·모양 불일치를 전부 null 로
  // 접어서 돌려주므로 던질 것이 없다 (session.ts 의 verifySession).
  const role = await getViewerRole();

  return NextResponse.json<ViewerSessionBody>({ role });
}
