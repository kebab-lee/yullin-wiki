-- =============================================================
-- users.phone 을 암호문 저장용으로 넓힌다
--
-- 전화번호는 앱 서버에서 AES-256-GCM 으로 잠근 뒤 저장한다
-- (src/lib/repositories/fieldCipher.ts). 저장 모양은
--   v1:<iv base64>:<ciphertext base64>:<tag base64>
-- 이고 010-0000-0000(13자)이 65자가 된다. varchar(20) 에는 들어가지 않는다.
--
-- 128 은 여유분이다. 평문 길이는 validation/user.ts 의 PHONE_PATTERN 이
-- 묶고 있으므로 이 길이가 정말로 필요해지는 일은 키·알고리즘을 바꿀 때뿐이다.
--
-- 암호화는 DB 에서 하지 않는다(pgcrypto 를 쓰지 않는다) — 키가 SQL 에 실리고
-- DB 로직을 최소로 둔다는 원칙에도 어긋난다. 기존 평문 행은
-- scripts/encrypt-user-phones.mjs 가 앱과 같은 포맷으로 잠근다.
-- =============================================================

alter table users alter column phone type varchar(128);

comment on column users.phone is
  'AES-256-GCM 암호문 (v1:iv:ciphertext:tag, base64). 평문을 직접 넣지 않는다.';
