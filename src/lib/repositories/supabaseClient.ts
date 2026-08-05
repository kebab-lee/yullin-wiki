// =============================================================
// Supabase 클라이언트 (repository 전용)
//
// supabase-js 를 실제로 붙잡고 있는 유일한 파일이다. 백엔드를 Java 로 옮길 때
// 지워질 표면이 여기와 userRepository 같은 repository 구현체뿐이도록 좁혀 둔다.
//
// service_role 키를 쓴다. RLS 에 의존하지 않고 권한 판단을 전부 service 레이어
// 코드로 하기 때문이며(CLAUDE.md "권한"), 그래서 이 모듈은 절대 클라이언트
// 번들에 들어가면 안 된다 — eslint 가 컴포넌트의 repository import 를 막는다.
// =============================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * 지연 생성한다. 모듈 로드 시점에 환경변수를 읽으면 빌드 단계에서 터진다.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.",
    );
  }

  client = createClient(url, serviceRoleKey, {
    // 서버에서만 쓰는 클라이언트라 세션을 들고 있을 이유가 없다.
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
