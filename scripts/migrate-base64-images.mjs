// =============================================================
// 본문에 인라인된 base64 이미지 → 스토리지 업로드 전환 (일회성)
//
//   node scripts/migrate-base64-images.mjs            ← 무엇이 바뀌는지만 출력
//   node scripts/migrate-base64-images.mjs --apply    ← 실제로 바꾼다
//
// **인자 없이 돌리면 아무것도 바꾸지 않는다.** 되돌릴 수 있게 만들어 두긴
// 했지만(아래 백업), 되돌릴 일이 없게 하는 편이 낫다. 먼저 그냥 돌려서 대상
// 건수와 이미지 수를 확인하고, 맞으면 --apply 를 붙인다.
//
// ── 순서가 안전장치다 ──
//   ① 대상 조회 → ② **백업 파일 저장** → ③ 업로드 → ④ content PATCH
// 백업이 파일로 떨어지기 전에는 pages 를 단 한 건도 건드리지 않는다. ③ 이
// 중간에 실패해도 DB 는 그대로이고, ④ 가 중간에 실패하면 백업으로 되돌린다.
//
// ── 이 스크립트가 REST 를 직접 부르는 이유 ──
// 일회성 점검·이관 스크립트는 애플리케이션 코드가 아니라서 레이어 규칙
// (repository 경유)의 대상이 아니다. scripts/verify-search.mjs 와 같은 취급이다.
// 대신 버킷 이름·경로 규칙·리사이즈 설정을 src 쪽과 맞춰 둔다 — 어긋나면
// 이관된 이미지만 규격이 다른 상태가 된다.
//   버킷/URL 규칙  src/lib/repositories/storageRepository.ts
//   경로/리사이즈  src/lib/services/uploadService.ts
//
// ── 건드리지 않는 것 ──
// page_revisions 는 그대로 둔다. 이력은 "그때 그 문서가 무엇이었는가"를
// 답해야 하는 기록이라 지금 기준으로 고쳐 쓰면 기록이 아니게 된다. 화면에
// 그려지는 곳도 없다(조회·복원 UI 가 없다).
// =============================================================

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));

// .env.local 을 직접 읽는다. Next 밖에서 도는 스크립트라 자동 주입이 없다.
for (const line of readFileSync(join(HERE, "../.env.local"), "utf8").split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match) process.env[match[1]] ??= match[2];
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다 (.env.local).");
  process.exit(1);
}

/** src 쪽과 같은 값으로 맞춘다. */
const BUCKET = "page-images";
const MAX_EDGE = 1600;
const WEBP_QUALITY = 82;
const CACHE_CONTROL = "31536000";

const APPLY = process.argv.includes("--apply");

const restHeaders = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function rest(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...restHeaders, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} → ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

// ── 스토리지 ──────────────────────────────────────────────────
/**
 * 경로에 원본 파일명을 쓰지 않는다 — uuid 다. src 쪽 buildObjectPath 와 같은
 * 규칙이라 이관된 이미지와 앞으로 올라올 이미지가 같은 모양으로 쌓인다.
 */
function buildObjectPath() {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}/${month}/${randomUUID()}.webp`;
}

async function uploadWebp(bytes, path) {
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "image/webp",
        "Cache-Control": `max-age=${CACHE_CONTROL}`,
        // 덮어쓰기 금지. uuid 경로라 충돌은 사고이지 정상 상황이 아니다.
        "x-upsert": "false",
      },
      body: bytes,
    },
  );

  if (!response.ok) {
    throw new Error(`업로드 실패 (${path}) → ${response.status} ${await response.text()}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// ── 본문 훑기 ─────────────────────────────────────────────────
/**
 * ProseMirror 트리에서 data: URL 을 src 로 가진 노드를 모은다.
 *
 * `type === "image"` 로 좁히지 않는다. 지금은 이미지 노드뿐이지만, 목적은
 * "본문에 남은 base64 를 남김없이 걷어내는 것"이라 src 만 보고 판단한다.
 *
 * 노드 객체를 그대로 담아서 돌려준다 — 나중에 그 자리에서 src 만 바꾸면
 * 되므로 트리를 두 번 훑거나 경로를 기억할 필요가 없다.
 */
function collectDataImages(node, found = []) {
  if (!node || typeof node !== "object") return found;

  if (Array.isArray(node)) {
    for (const child of node) collectDataImages(child, found);
    return found;
  }

  const src = node.attrs?.src;
  if (typeof src === "string" && src.startsWith("data:image")) found.push(node);

  if (Array.isArray(node.content)) collectDataImages(node.content, found);

  return found;
}

/** `data:image/png;base64,...` → { buffer, mime }. 모양이 어긋나면 null. */
function decodeDataUrl(dataUrl) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is.exec(dataUrl);
  if (!match) return null;

  return { mime: match[1].toLowerCase(), buffer: Buffer.from(match[2], "base64") };
}

/**
 * 업로드 API 와 같은 규격으로 줄인다 (긴 변 1600px · webp).
 * JPEG 에만 rotate 를 거는 것도 uploadService.toWebp 와 같은 이유다.
 */
async function toWebp(buffer, mime) {
  const pipeline = sharp(buffer, { animated: true });
  if (mime === "image/jpeg") pipeline.rotate();

  return pipeline
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;

// ── 본체 ──────────────────────────────────────────────────────
async function main() {
  // 대상이 적어(전체 게시물 수십 건 규모) 전부 받아 JS 로 거른다. jsonb 안의
  // 문자열을 PostgREST 로 찾으려면 DB 쪽에 함수를 새로 만들어야 하는데,
  // 일회성 스크립트를 위해 DB 로직을 늘리지 않는다 (CLAUDE.md "DB").
  const pages = await rest("/pages?select=id,title,content&order=created_at");

  const targets = pages
    .map((page) => ({ page, images: collectDataImages(page.content) }))
    .filter(({ images }) => images.length > 0);

  if (targets.length === 0) {
    console.log("base64 이미지가 들어있는 게시물이 없습니다. 할 일 없음.");
    return;
  }

  console.log(`대상 게시물 ${targets.length}건:`);
  for (const { page, images } of targets) {
    const inlineBytes = images.reduce((sum, node) => sum + node.attrs.src.length, 0);
    console.log(`  · ${page.title} (${page.id}) — 이미지 ${images.length}장 / 인라인 ${kb(inlineBytes)}`);
  }

  if (!APPLY) {
    console.log("\n(미리보기입니다. 실제로 바꾸려면 --apply 를 붙이세요.)");
    return;
  }

  // ── 백업 — DB 를 건드리기 전에 파일로 떨어뜨린다 ──
  const backupDir = join(HERE, "backups");
  mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `base64-images-${stamp}.json`);

  writeFileSync(
    backupPath,
    // 되돌릴 때 필요한 것은 id 와 **변환 전 content** 다. title 은 사람이
    // 파일을 열었을 때 어느 글인지 알아보기 위해 같이 넣는다.
    JSON.stringify(
      targets.map(({ page }) => ({ id: page.id, title: page.title, content: page.content })),
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\n백업 저장: ${backupPath}`);
  console.log("되돌리려면 이 파일의 content 를 그대로 pages 에 PATCH 하면 됩니다.\n");

  let uploaded = 0;
  let beforeBytes = 0;
  let afterBytes = 0;

  for (const { page, images } of targets) {
    for (const node of images) {
      const decoded = decodeDataUrl(node.attrs.src);
      if (!decoded) {
        console.warn(`  ! ${page.id}: data URL 을 해석하지 못해 건너뜁니다.`);
        continue;
      }

      const webp = await toWebp(decoded.buffer, decoded.mime);
      const url = await uploadWebp(webp, buildObjectPath());

      beforeBytes += decoded.buffer.length;
      afterBytes += webp.length;
      uploaded += 1;

      // 노드 참조를 그대로 들고 있으므로 여기서 바꾸면 page.content 가 바뀐다.
      node.attrs.src = url;
      console.log(`  ✓ ${kb(decoded.buffer.length)} → ${kb(webp.length)}  ${url}`);
    }

    // 이미지가 전부 URL 로 바뀐 뒤에 한 번만 쓴다. 장마다 PATCH 하면
    // 중간 실패 시 절반만 바뀐 문서가 남는다.
    await rest(`/pages?id=eq.${page.id}`, {
      method: "PATCH",
      body: JSON.stringify({ content: page.content }),
    });
    console.log(`  → ${page.title} 저장 완료`);
  }

  console.log(
    `\n완료: 이미지 ${uploaded}장 / ${kb(beforeBytes)} → ${kb(afterBytes)} ` +
      `(게시물 ${targets.length}건)`,
  );
  console.log("상세 페이지에서 이미지가 보이는지 확인한 뒤 백업 파일을 지우세요.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
