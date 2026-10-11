// =============================================================
// 컬럼 단위 암호화 (AES-256-GCM) — 현재 대상은 users.phone 하나
//
// ── 왜 repository 안에 있는가 ────────────────────────────────
// 암호화는 "어떻게 저장하는가"의 문제다. service 위로는 언제나 평문이 오가고,
// 저장 직전에 잠그고 읽은 직후에 푼다. Java 로 옮길 때 이 파일의 자리는
// JPA `AttributeConverter` 가 그대로 받는다 — 그래서 포맷을 아래처럼 고정해 둔다.
// 이 디렉터리에 두는 덕에 eslint 의 "컴포넌트는 repository 를 import 하지
// 않는다" 규칙이 키가 클라이언트 번들로 새는 경로까지 함께 막는다.
//
// ── 왜 DB(pgcrypto)가 아닌가 ─────────────────────────────────
// DB 함수로 풀면 키가 SQL 문에 실려 로그·pg_stat_statements 에 남고, DB 로직을
// 최소로 둔다는 규칙(CLAUDE.md "DB")에도 어긋난다. 키는 앱 서버에만 있어야 DB
// 덤프나 service role 키가 새어도 번호가 안 보인다.
//
// ── 저장 포맷 (Java 와 공유하는 계약) ────────────────────────
//   v1:<iv base64>:<ciphertext base64>:<auth tag base64>
//   · iv 12바이트(매번 새로 뽑는다) · tag 16바이트 · AAD 없음 · UTF-8
//   · 키: 환경변수 PII_ENCRYPTION_KEY = 32바이트를 base64 로 인코딩한 값
// 접두사 v1 은 키·알고리즘을 바꿀 때 옛 값과 새 값을 가르는 자리다.
// scripts/encrypt-user-phones.mjs 가 같은 포맷을 쓴다 — **한쪽만 바꾸지 마라.**
//
// ⚠️ **키를 잃으면 전화번호를 영영 복구할 수 없다.** 키를 바꾸는 절차는 아직
// 없다(바꾸려면 v2 를 만들고 옛 키로 풀어 새 키로 다시 잠그는 스크립트가 필요하다).
// =============================================================

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

let key: Buffer | null = null;

/** 지연 생성. 모듈 로드 시점에 읽으면 환경변수 없는 빌드 단계에서 터진다 (session.ts 와 같은 규칙). */
function getKey(): Buffer {
  if (key) return key;

  const value = process.env.PII_ENCRYPTION_KEY;
  if (!value) {
    throw new Error("PII_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.");
  }

  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== KEY_BYTES) {
    throw new Error(
      `PII_ENCRYPTION_KEY 는 ${KEY_BYTES}바이트를 base64 로 인코딩한 값이어야 합니다.`,
    );
  }

  key = decoded;
  return key;
}

/** 평문을 저장 포맷으로 잠근다. 같은 값도 매번 다른 암호문이 나온다(iv 가 매번 새롭다). */
export function sealField(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv, ciphertext, tag]
    .map((part) => (typeof part === "string" ? part : part.toString("base64")))
    .join(":");
}

/**
 * 저장된 값을 평문으로 푼다. null(탈퇴 계정)은 그대로 null.
 *
 * 변조됐거나 다른 키로 잠긴 값이면 GCM 태그 검증에서 던진다 — 조용히 빈 값으로
 * 접지 않는다. 그건 데이터가 깨졌거나 키가 바뀌었다는 뜻이라 드러나야 한다.
 *
 * ── 접두사가 없는 값은 평문으로 보고 그대로 돌려준다 (임시) ──
 * 암호화 이전에 저장된 행이다. 이 코드가 배포된 뒤
 * `node scripts/encrypt-user-phones.mjs --apply` 로 전부 잠그는데, 배포와 스크립트
 * 사이에 옛 코드로 가입한 행도 생길 수 있어 읽기 쪽이 견뎌야 한다.
 * **스크립트가 "남은 평문 0건"을 확인하면 이 분기를 지우고 던지게 바꾼다.**
 * 남겨 두면 평문이 섞여 들어와도 아무도 모른다.
 */
export function openField(stored: string | null): string | null {
  if (stored === null) return null;
  if (!stored.startsWith(`${VERSION}:`)) return stored;

  // ciphertext 는 빈 문자열일 수 있다(평문이 "" 였을 때). 개수로만 본다.
  const parts = stored.split(":");
  const [, iv, ciphertext, tag] = parts;
  if (parts.length !== 4 || !iv || ciphertext === undefined || !tag) {
    throw new Error("암호화된 값의 형식이 올바르지 않습니다.");
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, "base64"), {
    authTagLength: TAG_BYTES,
  });
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
