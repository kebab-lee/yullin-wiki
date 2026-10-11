// =============================================================
// users.phone 평문 → 암호문 전환 (일회성)
//
//   node scripts/encrypt-user-phones.mjs            ← 대상 건수만 출력
//   node scripts/encrypt-user-phones.mjs --apply    ← 실제로 잠근다
//
// **인자 없이 돌리면 아무것도 바꾸지 않는다** (migrate-base64-images.mjs 와
// 같은 규칙). 먼저 그냥 돌려서 대상 건수를 확인하고, 맞으면 --apply 를 붙인다.
//
// ── 순서 ──
//   ① 마이그레이션 20261011000000_users_phone_encrypted.sql (컬럼 길이)
//   ② 암호화 코드 배포 (PII_ENCRYPTION_KEY 가 설정된 상태로)
//   ③ 이 스크립트 --apply
//   ④ 다시 인자 없이 돌려 "남은 평문 0건" 확인
// ② 보다 먼저 돌리면 옛 코드가 암호문을 평문인 줄 알고 마이페이지에 그대로
// 그린다. 반대로 ② 와 ③ 사이에 옛 코드로 가입한 행이 생길 수 있어서 ④ 가 있다.
// ④ 가 0건이면 fieldCipher.openField 의 "평문 그대로 통과" 분기를 지운다.
//
// **몇 번을 돌려도 안전하다.** 이미 `v1:` 로 시작하는 값은 건드리지 않는다.
//
// ── 키 ──
// .env.local 의 PII_ENCRYPTION_KEY 를 쓴다. **배포 환경(Vercel)과 같은 값이어야
// 한다** — 다른 키로 잠그면 앱이 그 행을 풀지 못하고, 그 키를 잃으면 복구할 수 없다.
//
// ── 포맷 ──
// src/lib/repositories/fieldCipher.ts 의 sealField 와 같아야 한다.
//   v1:<iv 12B base64>:<ciphertext base64>:<tag 16B base64>, AES-256-GCM, AAD 없음
// 레이어 규칙의 대상이 아닌 일회성 스크립트라 REST 를 직접 부른다
// (scripts/verify-search.mjs 와 같은 취급). TS 모듈을 import 할 수 없어서
// 포맷을 여기 한 번 더 적는다 — **한쪽만 바꾸지 마라.**
// =============================================================

import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// .env.local 을 직접 읽는다. Next 밖에서 도는 스크립트라 자동 주입이 없다.
for (const line of readFileSync(join(HERE, "../.env.local"), "utf8").split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match) process.env[match[1]] ??= match[2];
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAW_KEY = process.env.PII_ENCRYPTION_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !RAW_KEY) {
  console.error(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / PII_ENCRYPTION_KEY 가 없습니다 (.env.local).",
  );
  process.exit(1);
}

/** src 쪽과 같은 값으로 맞춘다. */
const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

const KEY = Buffer.from(RAW_KEY, "base64");
if (KEY.length !== KEY_BYTES) {
  console.error(`PII_ENCRYPTION_KEY 는 ${KEY_BYTES}바이트를 base64 로 인코딩한 값이어야 합니다.`);
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

const restHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
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

function seal(plain) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), ciphertext.toString("base64"), tag.toString("base64")].join(":");
}

// ── 대상 조회 ─────────────────────────────────────────────────
// phone 이 있고 v1: 로 시작하지 않는 행. 탈퇴 계정은 phone 이 NULL 이라 빠진다.
const targets = await rest(
  `/users?select=id,phone&phone=not.is.null&phone=not.like.${encodeURIComponent(`${VERSION}:*`)}`,
);

console.log(`남은 평문: ${targets.length}건`);

if (!APPLY) {
  if (targets.length > 0) console.log("--apply 를 붙이면 잠급니다.");
  process.exit(0);
}

// ── 잠그기 ────────────────────────────────────────────────────
// 한 건씩 PATCH 한다. 조건에 "아직 평문인가"를 다시 걸어서, 그 사이 사용자가
// 새 코드로 번호를 고쳤다면(이미 암호문) 덮어쓰지 않는다.
let done = 0;
for (const row of targets) {
  await rest(
    `/users?id=eq.${row.id}&phone=eq.${encodeURIComponent(row.phone)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ phone: seal(row.phone) }),
    },
  );
  done += 1;
}

console.log(`잠금 완료: ${done}건. 인자 없이 다시 돌려 0건인지 확인하세요.`);
