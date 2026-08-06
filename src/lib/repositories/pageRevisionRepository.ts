// =============================================================
// page_revisions 테이블 접근 — **쓰기 전용**
//
// 함수가 create 하나뿐인 것이 이 파일의 계약이다. 조회·복원 함수를 만들지
// 않는다 (CLAUDE.md "확정된 도메인 결정": page_revisions 에는 쓰기만 한다).
// "언젠가 쓸지도 모르니 findByPageId 를 하나 두자"가 시작되면 화면이 없는
// 조회 API 가 따라 붙고, 조회가 생기면 복원 요구가 따라온다.
//
// 조회가 아예 불가능해지는 것은 아니다 — 감사(audit)가 필요하면 SQL 로 직접
// 본다. 애플리케이션 코드에 경로를 내지 않을 뿐이다.
// =============================================================

import type { CreatePageRevisionData } from "@/lib/types";

import { getSupabase } from "./supabaseClient";

const TABLE = "page_revisions";

/**
 * 수정 직전 스냅샷을 남긴다.
 *
 * 돌려주는 것이 없다(void). 만들어진 리비전 id 를 쓸 곳이 없기 때문이다 —
 * 아무도 이 행을 다시 찾아오지 않는다. id 를 돌려주면 그것을 들고 뭔가 할 수
 * 있다는 신호가 된다.
 *
 * **실패를 삼키지 않고 그대로 던진다.** 호출부(pageService)가 "기록 없이 수정을
 * 진행할 것인가"를 판단해야 하는데, 여기서 console.error 로 끝내면 그 판단이
 * 사라지고 추적성이 조용히 비어 간다.
 */
export async function create(data: CreatePageRevisionData): Promise<void> {
  const { error } = await getSupabase().from(TABLE).insert({
    page_id: data.pageId,
    title: data.title,
    content: data.content,
    edited_by: data.editedBy,
  });

  if (error) throw new Error(`수정 이력 저장 실패: ${error.message}`);
}
