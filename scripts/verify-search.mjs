// =============================================================
// 검색 슬라이스 수동 검증
//
//   node scripts/verify-search.mjs
//
// 시드 4건으로는 "제목 일치가 본문 일치보다 위로 오는가"를 확인할 수 없어서
// 본문이 서로 다른 임시 게시물을 넣고 확인한 뒤 지운다. **끝나면 반드시
// 지운다** (finally). 실패로 중단돼도 남지 않는다.
//
// supabase/migrations/20260807000000_search_pages.sql 를 적용한 뒤에 돌린다.
// 일회성 점검 스크립트이며 애플리케이션 코드가 아니다 — 그래서 레이어 규칙
// (repository 경유)의 대상이 아니고 REST 를 직접 부른다.
// =============================================================

import { readFileSync } from "node:fs";

// .env.local 을 직접 읽는다. Next 밖에서 도는 스크립트라 자동 주입이 없다.
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match) process.env[match[1]] ??= match[2];
}

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP = process.env.APP_URL ?? "http://localhost:3000";

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function rest(path, init = {}) {
  const response = await fetch(`${URL_BASE}/rest/v1${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} → ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const doc = (text) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

/**
 * 검증 말뭉치. 검색어 "수련회" 를 기준으로 세 부류가 다 나오도록 짰다.
 *   both  제목 O · 본문 O  → 점수 3.0
 *   title 제목 O · 본문 X  → 점수 2.0
 *   body  제목 X · 본문 O  → 점수 1.0
 */
const CORPUS = [
  {
    key: "both",
    title: "겨울 수련회 준비 모임",
    body: "겨울 수련회 준비 모임은 매주 목요일 저녁에 모입니다. 수련회 장소와 예산을 함께 정합니다.",
  },
  {
    key: "title",
    title: "여름 수련회 안내",
    body: "장소는 강원도이고 신청은 다음 주까지 받습니다. 자세한 일정은 추후 공지합니다.",
  },
  {
    key: "body",
    title: "청소년부 8월 소식",
    body: "이번 달에는 수련회 준비로 정기 모임을 한 주 쉽니다. 다음 달부터 다시 모입니다.",
  },
  {
    key: "noise",
    title: "주차 봉사팀 안내",
    body: "주일 아침 주차 봉사는 두 명씩 조를 이루어 진행합니다.",
  },
];

async function search(query, { limit = 10, offset = 0 } = {}) {
  return rest("/rpc/search_pages", {
    method: "POST",
    body: JSON.stringify({ p_query: query, p_limit: limit, p_offset: offset }),
  });
}

function show(label, rows, byId) {
  const names = rows.map((r) => `${byId.get(r.id) ?? "(시드)"}:${r.title}`);
  console.log(`\n▶ "${label}" → ${rows.length}건 (total=${rows[0]?.total_count ?? 0})`);
  for (const name of names) console.log(`    ${name}`);
}

async function main() {
  const [{ id: authorId }] = await rest("/users?select=id&role=eq.ADMIN&limit=1");
  const [{ id: categoryId }] = await rest("/categories?select=id&slug=eq.youth");

  const inserted = await rest("/pages?select=id,title", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(
      CORPUS.map((item) => ({
        category_id: categoryId,
        author_id: authorId,
        title: item.title,
        content: doc(item.body),
        plain_text: item.body,
        status: "PUBLISHED",
        published_at: new Date().toISOString(),
      })),
    ),
  });

  const byId = new Map(
    inserted.map((row) => [
      row.id,
      CORPUS.find((c) => c.title === row.title)?.key ?? "?",
    ]),
  );
  const ids = inserted.map((row) => row.id);

  try {
    // ① 정렬: 제목+본문 > 제목만 > 본문만
    const ranked = await search("수련회");
    show("수련회 (정렬)", ranked, byId);
    const order = ranked.map((r) => byId.get(r.id)).filter(Boolean);
    console.log(
      `    판정: ${JSON.stringify(order.slice(0, 3))} === ["both","title","body"] ? ` +
        `${JSON.stringify(order.slice(0, 3)) === '["both","title","body"]' ? "OK" : "FAIL"}`,
    );

    // ② 오타 — 트라이그램의 값어치가 드러나는 지점
    show("수렴회 (오타)", await search("수렴회"), byId);
    show("수련외 (오타)", await search("수련외"), byId);

    // ③ 2글자 질의
    show("모임 (2글자)", await search("모임"), byId);

    // ④ 결과 0건
    show("갈라디아서주석zzz (0건)", await search("갈라디아서주석zzz"), byId);

    // ⑤ LIKE 메타문자가 전체 문서를 긁지 않는지
    show("% (메타문자)", await search("%"), byId);

    // ⑥ 페이지네이션 — total 은 잘라내기 전 건수여야 한다
    const firstPage = await search("모임", { limit: 1, offset: 0 });
    const secondPage = await search("모임", { limit: 1, offset: 1 });
    console.log(
      `\n▶ 페이지네이션: 1쪽=${firstPage[0]?.title} / 2쪽=${secondPage[0]?.title} / ` +
        `total=${firstPage[0]?.total_count} (겹침 ${firstPage[0]?.id === secondPage[0]?.id ? "FAIL" : "OK"})`,
    );

    // ⑦ HTTP 계약 — 빈/짧은 질의는 400, 정상 질의는 200
    console.log("");
    for (const q of ["", " ", "가", "수련회"]) {
      const response = await fetch(
        `${APP}/api/pages/search?q=${encodeURIComponent(q)}`,
      );
      const body = await response.json();
      console.log(
        `▶ GET /api/pages/search?q="${q}" → ${response.status} ` +
          `${response.ok ? `${body.total}건` : JSON.stringify(body.fields ?? body.message)}`,
      );
    }
  } finally {
    await rest(`/pages?id=in.(${ids.join(",")})`, { method: "DELETE" });
    console.log(`\n임시 게시물 ${ids.length}건 삭제 완료.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
