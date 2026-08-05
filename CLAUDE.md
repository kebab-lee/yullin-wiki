# 열린위키 (yullin-wiki)

위키 형태의 공개 홈페이지 + 어드민. Next.js 15 (App Router) + TypeScript + Supabase(Postgres).
에디터는 Tiptap. 스타일은 Tailwind. Vercel 배포.

## 최우선 제약

나중에 백엔드를 Supabase에서 **Java(Spring Boot)로 교체**한다. **DB는 Postgres 유지**
(Supabase Postgres → RDS Postgres). 따라서 격리 대상은 Postgres가 아니라 Supabase의
**플랫폼 기능**이다: supabase-js SDK, Supabase Auth, RLS, Edge Function.

단순함과 교체 가능성이 충돌하면 교체 가능성을 택한다. 단, 쓰지도 않을 인터페이스를
미리 만드는 과도한 추상화는 하지 않는다.

## 레이어 규칙 (협상 불가)

```
클라이언트 컴포넌트
  ↓ 자기 도메인의 fetch만 (GET /api/pages …)
Route Handler (src/app/api/**/route.ts)   HTTP 변환만
  ↓
Service (src/lib/services/*.ts)           비즈니스 규칙 · 권한 · 검증
  ↓
Repository (src/lib/repositories/*.ts)    ★ supabase-js는 여기에만
  ↓
Supabase (Postgres)
```

- `supabase-js` import가 `src/lib/repositories/` 밖에 등장하면 안 된다. 예외 없음.
- 클라이언트는 Supabase의 존재를 몰라야 한다. 자기 프로젝트 API만 호출한다.
- Route Handler에 비즈니스 로직 금지. service 호출 후 JSON 반환만.
- Repository는 DB row를 **도메인 모델로 변환해서** 반환한다. snake_case 컬럼과 row 모양이
  프론트까지 새어나가면 안 된다. (Java가 같은 JSON을 반환하면 프론트 무변경)
- 인증도 `src/lib/auth/` 추상화를 거친다. Supabase Auth SDK를 UI에 흩뿌리지 않는다.

## 디렉터리

```
src/app/api/**/route.ts     Route Handler
src/app/page.tsx            홈 (헤더 없음 — (site) 그룹 밖)
src/app/(site)/**           헤더가 붙는 모든 페이지 (어드민 포함)
src/components/**           UI 컴포넌트
src/lib/repositories/       Supabase 호출 (여기만)
src/lib/services/           비즈니스 로직 · 권한 체크
src/lib/auth/               인증 추상화
src/lib/types/              도메인 모델 (DB 스키마와 분리)
supabase/migrations/        스키마 SQL (버전 관리)
docs/                       설계 문서
```

`src/` 밖에 `app/`이나 `lib/`를 새로 만들지 않는다.

## 레이아웃

- **헤더는 페이지에서 직접 렌더링하지 않는다.** `src/app/(site)/layout.tsx`가 담당한다.
  `usePathname`으로 분기하거나 `SiteHeader`를 클라이언트 컴포넌트로 만들지 않는다.
- **홈(`/`)은 예외다.** Figma 시안(Home 1:318)에 `Header`(1:433) 인스턴스가 없고
  히어로 안의 `HeroHeaderBar`(Frame 1304)가 그 역할을 겸한다.
  그래서 홈은 `(site)` 그룹 밖(`src/app/page.tsx`)에 둔다.
  홈 전용 헤더를 `SiteHeader` 안에 조건분기로 넣지 않는다 — route group으로 가른다.
- **푸터는 전 페이지 공통**이므로 루트 `layout.tsx`에 둔다.
- 로그인/로그아웃 버튼처럼 헤더와 히어로가 공유하는 조각은
  `src/components/common/`에 두고 양쪽이 같은 컴포넌트를 쓴다 (`AuthActionButton`).

## 권한

- **RLS는 최후 방어선일 뿐, 의존하지 않는다.** RLS는 Supabase 전용이라 Java로 옮길 때 사라진다.
- 권한 체크는 service 레이어에 명시적 코드로 작성한다 ("이 사용자가 admin인가",
  "이 페이지를 수정할 권한이 있는가"). 그래야 Spring Security로 그대로 이식된다.

## 인증

- **로그인 페이지는 `/login` 하나다. `/admin/login` 을 만들지 않는다.**
  관리자 로그인 시안(AdLogin 1:1456)은 유저 로그인(1:1207)과 필드 구성이 완전히 같다.
  화면을 복제하면 같은 폼을 두 벌 유지해야 하고 인증 로직도 갈라진다.
- **역할 구분은 폼이 아니라 인증 결과(`users.role`)로 한다.**
  "관리자로 로그인" 같은 선택 UI를 만들지 않는다. 로그인 성공 후 role 에 따라
  헤더·리다이렉트 대상이 갈린다 (화면 중복을 만들지 않는 기존 원칙과 같은 결).
- **관리자 계정은 공개 가입 대상이 아니다.** DB 에서 `users.role` 을 수동으로
  ADMIN 으로 승격한다. 관리자 승격 UI 는 만들지 않는다.

## DB

- 표준 PostgreSQL만. Supabase 전용 확장 금지 (pg_trgm 같은 표준 contrib은 허용).
- `auth.users`를 FK로 참조하지 않는다. 우리 `users` 테이블이 인증 사용자다.
- enum은 native ENUM 타입이 아니라 `varchar` + CHECK. JPA `@Enumerated(EnumType.STRING)`으로
  그대로 매핑되고 값 추가 시 ALTER TYPE이 안 걸린다.
- 스키마 변경은 반드시 `supabase/migrations/` 아래 SQL 파일로. 대시보드에서 손으로 컬럼 추가 금지.
- **DB 안에 넣는 로직(View / RPC)은 최소로 유지한다.** 새로 만들기 전에 "service 레이어
  TS 코드로 충분한가"를 먼저 묻는다. 현재 DB 로직은 `set_updated_at()` 트리거 하나뿐이다.

## 에디터 / 본문 포맷

- 에디터는 **Tiptap**. `pages.content`에는 Tiptap이 내보내는 **ProseMirror 문서 JSON을
  그대로** 저장한다 (`{ type: 'doc', content: [...] }`).
- 커스텀 블록 포맷으로 변환하지 않는다. 변환기는 저장·렌더 양쪽에서 영구 유지보수
  부채가 되는데, DB는 어차피 jsonb 한 덩어리이고 Java 백엔드는 이 JSON을 파싱할 일이
  없어서(렌더링은 프론트) 에디터 종속이 백엔드로 새지 않는다.
- 도메인 타입에서는 `PageContent`라는 불투명 타입으로 감싸 둔다. UI 렌더러와
  plain_text 추출기 외에는 내부 구조를 들여다보지 않는다.
- **`plain_text` 추출은 service 레이어(TS)의 순수 함수**가 한다. ProseMirror JSON 트리를
  훑어 `type: 'text'` 노드의 `text`만 모은다. Tiptap 의존성 없이 구현하고, DB 함수로
  만들지 않는다 (Java 이관 시 그대로 옮기기 위해).
- 목차(TOC)와 참고문헌은 별도 저장하지 않는다. 렌더 시점에 heading 노드에서 뽑는다.

## 코딩 컨벤션

- TypeScript. `any` 금지. 도메인 타입을 명시한다.
- 검증은 공통 규칙과 엔터티별 특수 규칙을 구조적으로 분리한다. 공통은 한곳에 모은다. (→ `## 검증`)
- 상태 플래그가 필요하면 **기존 플래그를 재사용**한다. 비슷한 새 변수를 난립시키지 않는다.
  (예: `is_blocked` + `is_deleted` + `is_active` 대신 단일 `status` enum)
- 에러는 service에서 의미 있는 형태로 처리하고, Route Handler가 HTTP 상태 코드로 변환한다.
- 함수·모듈은 한 가지 책임만.

## 검증

- 검증 규칙은 `src/lib/validation/` 에 **순수 함수**로 둔다. UI 와 분리한다.
  React·DOM 을 import 하지 않는다 (`useState`, `event`, `document` 금지).
- `common.ts` — 엔터티와 무관한 공통 규칙(`required` / `minLength` / `pattern` /
  `oneOf` …). `user.ts` / `page.ts` … — 그 규칙을 조합한 엔터티별 필드 검증.
- **같은 함수를 클라이언트 폼과 서버 service 레이어가 함께 쓴다.** 클라이언트 검증은
  편의고 진짜 방어선은 service 다. 규칙을 컴포넌트 안에 적으면 서버에서 다시 써야 하고
  두 벌이 어긋난다. Java 이관 시에도 이 파일들이 이식 단위가 된다.
- 에러 문구도 검증 모듈이 소유한다. 컴포넌트는 문구를 만들지 않고 받아서 그리기만 한다.

## 확정된 도메인 결정

- **익명 댓글**: `comments.author_id`는 NOT NULL. `is_anonymous`는 화면 표시만 제어한다.
  (차단·내 댓글 모아보기 기능이 작성자를 요구함)
- **유저 북마크**: 만들지 않는다.
- **수정 이력**: `page_revisions`에 쓰기만 한다. `pageService.update()`에서 이전 버전 insert.
  조회·복원 UI는 없다.
- **계정 삭제**: soft delete. `status = 'WITHDRAWN'` + PII 컬럼 NULL 처리. hard delete 금지.
- **검색**: pg_trgm trigram 인덱스. `to_tsvector` FTS는 한국어 형태소 분석이 안 돼서 안 쓴다.
- **화면 중복**: 어드민용으로 따로 그려진 Home / 항목별 게시물 / 검색 결과는 라우트를
  복제하지 않는다. 같은 public 라우트에서 헤더 컴포넌트만 role에 따라 교체한다.
- **카테고리 표시명**: `categories`는 표시명을 두 벌 가진다. 둘 다 Figma 정본이며
  **한쪽으로 통일하지 않는다.**
  - `name` (짧은 형: `공간` / `섬김` / `열청`) — 홈 카테고리 버튼, 게시물 태그 배지,
    사이드 카테고리, 목록, 에디터 카테고리 선택
  - `full_name` (긴 형: `열린교회 속 공간` …) — **Footer 카테고리 목록에서만** 사용
  - `slug` (`space` / `serving` / `youth`) — URL(`/categories/[slug]`)과 코드 분기용
    **불변 식별자**. 표시명이 바뀌어도 유지한다. 분기 조건에 표시명을 쓰지 않는다.

## 새 기능을 추가할 때

1. repository → service → route handler → UI 순서로 레이어를 갖춰서 제안한다.
   컴포넌트 안에 DB 호출을 박지 않는다.
2. "이 코드가 Java 백엔드로 바뀌어도 프론트가 안 바뀌는가?"를 스스로 점검한다.
   어긋나면 구조를 바로잡아 제안한다.
3. 설계 트레이드오프가 있으면 짧게 근거를 같이 설명한다.

## 참고 문서

- 사이트맵 · ERD · 설계 근거: `docs/sitemap-erd.md`
- 초기 스키마: `supabase/migrations/20260804000000_init.sql`
- 디자인: Figma `yullinwiki-joseph` (fileKey `zgimD0nr4SebHWiMLn4itq`)
