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
- service는 라우트 경로가 아니라 도메인 기준으로 나눈다.
  `/api/users/*` → `userService`, `/api/auth/*` → `authService`.
- Repository는 DB row를 **도메인 모델로 변환해서** 반환한다. snake_case 컬럼과 row 모양이
  프론트까지 새어나가면 안 된다. (Java가 같은 JSON을 반환하면 프론트 무변경)
- 인증도 `src/lib/auth/` 추상화를 거친다. Supabase Auth SDK를 UI에 흩뿌리지 않는다.

## 디렉터리

```
src/app/api/**/route.ts     Route Handler
src/app/page.tsx            홈 (헤더 없음 — (site) 그룹 밖)
src/app/(site)/**           헤더가 붙는 모든 페이지 (어드민 포함)
src/components/**           UI 컴포넌트
src/lib/repositories/       Supabase 호출 (여기만 — DB · 스토리지)
src/lib/services/           비즈니스 로직 · 권한 체크
src/lib/auth/               인증 추상화
src/lib/types/              도메인 모델 (DB 스키마와 분리)
supabase/migrations/        스키마 SQL (버전 관리)
docs/                       설계 문서
```

`src/` 밖에 `app/`이나 `lib/`를 새로 만들지 않는다.

## 레이아웃

- **헤더는 페이지에서 직접 렌더링하지 않는다.** `src/app/(site)/layout.tsx`가 담당한다.
  `usePathname`으로 분기하지 않는다.
- **홈(`/`)은 예외다.** Figma 시안(Home 1:318)에 `Header`(1:433) 인스턴스가 없고
  히어로 안의 `HeroHeaderBar`(Frame 1304)가 그 역할을 겸한다.
  그래서 홈은 `(site)` 그룹 밖(`src/app/page.tsx`)에 둔다.
  홈 전용 헤더를 `SiteHeader` 안에 조건분기로 넣지 않는다 — route group으로 가른다.
- **푸터는 전 페이지 공통**이므로 루트 `layout.tsx`에 둔다.
- 로그인/로그아웃 버튼처럼 헤더와 히어로가 공유하는 조각은
  `src/components/common/`에 두고 양쪽이 같은 컴포넌트를 쓴다
  (`ViewerAuthActions` → `AuthActionButton`).

### 헤더의 로그인 상태는 서버가 아니라 브라우저가 정한다

- **`SiteHeader` 셸은 한 벌이고 서버 컴포넌트다.** 예전의
  `PublicHeaderView` / `AdminHeaderView` 두 벌은 하나로 합쳤다 — 둘의 차이가
  전부 세션에 달린 값이었고, 그것들이 클라이언트 조각으로 내려가자 남은 것이
  4~5px뿐이었다. 공개 시안(1:433)의 값(lg 높이 131 · 로고↔검색 간격 20)이 정본이다.
- **레이아웃도 페이지도 세션을 읽지 않는다.** `(site)/layout.tsx` 와
  `src/app/page.tsx` 에서 `getViewerRole()` 을 부르지 않는다. 쿠키를 읽는 순간
  그 아래 전부가 동적 렌더가 되고, 정적으로 생성하면 role 이 빌드 시점 값으로
  굳어 모든 사용자가 같은 헤더를 본다.
- 세션이 필요한 조각은 둘뿐이다: `HeaderBrand`(로고 목적지 · "관리자" 라벨)와
  `ViewerAuthActions`(프로필 링크 · 로그인/로그아웃). 둘 다 `"use client"` 이고
  `src/lib/auth/viewerRoleClient.ts` 의 같은 스토어를 구독한다 —
  `/api/auth/session` 요청은 탭당 한 번이다.
- **이건 표시용이다. 권한이 아니다.** 클라이언트가 role 을 위조해도 화면 접근은
  `requireRole` / `requireAuth` 가, 데이터는 service 의 `assertRole` /
  `assertAuthenticated` 가 막는다. 헤더는 애초에 아무것도 막은 적이 없다.
- **세션을 `localStorage` 에 저장하지 않는다.** 정본은 httpOnly 쿠키이고,
  사본을 디스크에 두면 로그아웃·차단·만료 뒤에도 남아 서버와 갈린다.
  캐시는 탭이 살아 있는 동안만 유지되는 모듈 변수다.
- 로그인·로그아웃처럼 **답을 이미 아는 쪽은 `setViewerRole()` 로 알려준다.**
  빠뜨리면 헤더가 낡은 상태로 남는다 (`LoginForm` / `AuthActionButton`).
- 세션 의존 조각을 새로 만들 때는 **로딩 중 자리를 미리 잡는다.**
  `ViewerAuthActions` 는 가장 넓은 상태(로그인 모양)를 `invisible` 로 깔고
  `justify-end` + `ml-auto` 로 오른쪽 끝을 고정한다 — 그래서 상태가 정해질 때
  헤더 높이도 로고·검색창 위치도 움직이지 않는다. `opacity-0` 을 쓰지 마라
  (안 보이는 로그아웃 버튼이 눌린다).

### 읽기 페이지는 정적으로 생성된다

- **정적: 홈(`/`) · 게시물 상세(`/pages/[id]`).** 둘 다 빌드 시점에 HTML 로
  만들어지고 `REVALIDATE` 수명이 지나거나 `revalidatePath` 가 털면 다시 만들어진다.
  `/pages/[id]` 는 `generateStaticParams` 로 공개 문서를 미리 만들고
  `dynamicParams = true` 라 그 뒤에 발행된 글은 첫 요청 때 만들어진다.
- **동적: 검색 · 항목별 목록(`/categories/[slug]`) · 전체 목록(`/pages`) ·
  어드민 · 마이페이지.** 앞의 셋은 `searchParams`(`?q=` · `?page=`) 때문이고
  뒤의 둘은 세션 때문이다. **`searchParams` 를 읽는 페이지는 정적이 될 수 없다** —
  `generateStaticParams` 를 붙이면 빌드 표에 `●` 로 찍히지만 HTML 은 생기지 않는다
  (그 측정 기록은 `categories/[slug]/page.tsx` 주석에 있다).
- **정적 페이지에서 `getViewerRole()`·`cookies()` 를 부르지 마라.** 부르는 순간
  그 라우트는 동적으로 돌아간다. 세션이 필요한 조각은 헤더와 같은 방식으로
  브라우저에서 스스로 묻는다 (`viewerRoleClient`) — 게시물 상세에서는
  `ArticleAdminActions`(수정·삭제 버튼)와 `CommentSection`(역할)이 그렇다.
- **사용자마다 다른 데이터도 서버에서 읽지 마라.** 댓글이 그 경우다 — 목록에
  `isMine` 이 실려서 빌드 시점에 굳으면 남의 댓글에 삭제 버튼이 붙는다.
  댓글은 `CommentsProvider` 가 마운트 후 한 번 읽고, 이 화면이 무언가를 바꿨을
  때만 다시 읽는다. **폴링·웹소켓을 붙이지 않는다.**
- **`revalidatePath("/", "layout")` 하나면 충분하다** — 정적 페이지의 HTML 과
  그 페이지가 쓴 fetch 캐시를 함께 턴다(측정으로 확인). 경로를 잘게 나누거나
  캐시 태그 체계를 도입하지 마라.

## 반응형 / 모바일 규칙

- 공개 위키는 모바일 퍼스트로 작성한다.
  기본 스타일이 모바일이고, sm/md/lg에서 확장한다.
- 어드민(/admin)은 데스크톱 우선. 모바일에서는 목록 열람과
  승인/삭제만 지원하며, 에디터 진입 시 안내 문구를 표시한다.
- 브레이크포인트는 Tailwind 기본값(sm/md/lg)만 사용한다. 커스텀 금지.
- API 응답은 디바이스에 따라 달라지지 않는다. 렌더링만 분기한다.
- 페이지네이션은 offset(?page=) 기반을 유지한다. 무한 스크롤을 쓰지 않는다.
  URL로 페이지 상태가 표현되어야 뒤로가기·공유·서버 컴포넌트가 유지되고,
  검색은 유사도 정렬이라 cursor를 쓸 수 없어 목록과 갈라진다.
- 뷰포트 높이는 dvh를 사용한다. vh 금지.
- 가로로 넘칠 수 있는 본문 노드는 overflow-x 래퍼로 감싼다.
  현재 `pre` 는 `globals.css` 의 `.wiki-article pre { overflow-x: auto }` 가 맡고 있고,
  **Table 확장은 아직 스키마에 없어서(`src/lib/editor/extensions.ts`) `table` 노드가
  존재할 수 없으므로 래퍼를 미리 만들지 않는다.**
  Table 확장을 도입하면 `renderContent.ts` 에 `overflow-x` 래퍼를 함께 넣어야 한다.
  안 넣으면 표 하나가 페이지 전체를 가로 스크롤시킨다.
- 터치 인터랙션 요소의 최소 크기는 44x44px.
- next/image 로 폭이 가변인 이미지를 렌더링할 때는 sizes 를 명시한다.
  고정 크기 로고·아이콘에는 효과가 없으므로 붙이지 않는다.
- 모바일 전용 컴포넌트를 새로 만들지 않는다.
  role 분기 안에서 CSS로 처리한다 (role × device 조합 폭발 방지).
- **헤더 셸은 `SiteHeader` 한 벌이므로 반응형 수정도 한 곳이다.** 예전에는
  `PublicHeaderView` / `AdminHeaderView` 두 파일에 같은 수정을 나란히 넣어야
  했는데, 셸을 합치면서 그 위험이 사라졌다 (→ `## 레이아웃`). 관리자용이라고
  헤더를 다시 나누지 마라 — EDITOR 이상은 **공개 위키를 볼 때도** 같은 헤더를
  쓰고, 갈리는 것은 세션 조각(`HeaderBrand` · `ViewerAuthActions`)뿐이다.

## 권한

- **RLS는 최후 방어선일 뿐, 의존하지 않는다.** RLS는 Supabase 전용이라 Java로 옮길 때 사라진다.
- 권한 체크는 service 레이어에 명시적 코드로 작성한다 ("이 사용자가 admin인가",
  "이 페이지를 수정할 권한이 있는가"). 그래야 Spring Security로 그대로 이식된다.
- **`/admin` 하위 페이지는 반드시 `requireRole()`을 호출한다** (`src/lib/auth/requireRole.ts`).
  요구 권한은 화면마다 다르다 — 위키·댓글 관리는 EDITOR, 사용자·신고·카테고리 관리는 ADMIN.
  **선을 가르는 기준은 "계정을 다루는가"다.** 신고 관리가 ADMIN 인 것은 그 화면에 사용자
  차단이 붙어 있어서이고, 댓글 관리가 EDITOR 인 것은 읽고 해당 글로 건너가는 것이 전부라서다.
  (댓글 **삭제**는 그 안에서도 ADMIN 만 된다 — EDITOR 는 글을 다루는 권한이지 남의 발언을
  내리는 권한이 아니다. 화면이 버튼을 감추는 것은 안내이고 차단은 service 가 한다.)
- 이건 **화면 접근 차단**이며, **데이터 변경 차단은 별도로 service의 `assertAdmin`이 담당한다.
  둘 다 필요하다. 하나로 대체하지 마라.** API는 페이지를 거치지 않고 직접 호출되므로
  페이지 가드만으로는 막히지 않고, 반대로 service 가드만으로는 화면이 그려지는 것을 못 막는다.
- 페이지 가드를 `layout.tsx`에 몰아넣지 않는다. 같은 layout을 공유하는 형제 라우트 간
  클라이언트 사이드 이동에서는 layout이 다시 실행되지 않아 가드가 건너뛰어진다.

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

## 파일 스토리지

- **S3(또는 다른 오브젝트 스토리지)로 교체할 때 바꾸는 파일은
  `src/lib/repositories/storageRepository.ts` 하나다.** 스토리지 SDK 를 붙잡는
  코드가 그 파일 밖에 나오면 안 된다. 버킷 이름과 공개 URL 규칙도 거기에만 있다.
- 인터페이스는 스토리지 중립적으로 유지한다. `upload(file, path) → { url }` /
  `delete(path) → void`. 반환값에 Supabase 고유 타입(`StorageError`,
  `FileObject`, `{ data, error }` 봉투)이 새어나가면 안 된다 — 실패는 평범한
  Error 로 던지고 성공은 문자열 URL 하나로 답한다.
- **버킷은 `page-images` 하나** (public, 5MB, png/jpeg/webp/gif). 코드가 버킷을
  만들지 않는다.
- **public 버킷을 쓴다. signed URL 로 바꾸지 마라.** 저장된 본문 JSON 안에
  이미지 URL 이 영구히 박히는데 signed URL 은 만료되므로, 쓰려면 렌더할 때마다
  본문을 훑어 URL 을 다시 서명해야 한다. 게시물은 어차피 누구나 보는 공개
  콘텐츠라 숨길 것도 없고, public URL 이라야 CDN 캐싱이 걸린다.
- **업로드는 반드시 서버(`POST /api/admin/uploads`)를 거친다.** 클라이언트에서
  버킷으로 직접 쏘면 형식·용량 검증과 리사이즈가 통째로 건너뛰어진다.
- **저장 파일명은 uuid 다.** 클라이언트가 보낸 이름을 경로에 쓰지 않는다
  (경로 조작·덮어쓰기·한글 인코딩). 경로는 `연/월/uuid.webp`.
- 업로드 시점에 긴 변 1600px webp 로 변환한다 (`sharp`). 이 규격은
  `uploadService` 와 `scripts/migrate-base64-images.mjs` 두 곳이 공유하므로
  한쪽만 바꾸지 마라.
- sharp 는 네이티브 바이너리라 **Edge 런타임에서 돌지 않는다.** 업로드 라우트는
  `export const runtime = "nodejs"` 를 명시한다.
- **게시물에서 이미지를 빼도 스토리지 파일은 지우지 않는다.** 고아 파일 정리는
  별도 과제다 (되돌리기·이력 때문에 즉시 삭제가 오히려 위험하다).

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
- **본문에 base64 이미지를 넣지 않는다.** 이미지 노드의 `src` 는 언제나 스토리지
  URL 이다 (→ `## 파일 스토리지`). 이미지가 본문에 들어오는 길은 넷인데
  (붙여넣기 · 드래그앤드롭 · 툴바 · 슬래시 커맨드) 넷 다
  `src/components/admin/editor/imageUpload.ts` 의 `uploadImagesInto` 로 모인다.
  길을 새로 만들 때 그 함수를 거치지 않으면 그 길만 base64 로 남는다.
- **업로드 코드를 `src/lib/editor/extensions.ts` 에 두지 마라.** 그 파일은 읽기
  전용 렌더러와 공유하는 스키마 정본이라, 업로드를 얹으면 상세 페이지의 서버
  번들이 fetch 로직까지 끌고 간다. 편집 중 동작(플레이스홀더 등)은 저장되는
  JSON 에 흔적을 남기지 않으므로 렌더러가 알 필요가 없다.
- `Image.configure({ allowBase64: true })` 는 **끄지 마라.** 새 이미지는 더
  이상 base64 로 들어오지 않지만, 이 옵션을 끄면 아직 이관되지 않은 옛 문서의
  이미지 노드가 렌더러에서 통째로 사라진다.

## 코딩 컨벤션

- TypeScript. `any` 금지. 도메인 타입을 명시한다.
- 검증은 공통 규칙과 엔터티별 특수 규칙을 구조적으로 분리한다. 공통은 한곳에 모은다. (→ `## 검증`)
- 상태 플래그가 필요하면 **기존 플래그를 재사용**한다. 비슷한 새 변수를 난립시키지 않는다.
  (예: `is_blocked` + `is_deleted` + `is_active` 대신 단일 `status` enum)
- 에러는 service에서 의미 있는 형태로 처리하고, Route Handler가 HTTP 상태 코드로 변환한다.
- 함수·모듈은 한 가지 책임만.
- **작업은 `main` 에 직접 커밋한다. 기능 브랜치를 만들지 않는다.**
  1인 개발이고 PR 리뷰 과정이 없어 브랜치는 관리 비용만 늘린다.

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
- **익명 댓글의 작성자를 누가 보는가**: **어드민 관리 화면은 실명을 본다.**
  신고 처리의 세 액션 중 하나가 "작성자 차단"이라 누구를 차단하는지 모르고 누를 수 없다.
  범위는 `/admin/reports` · `/admin/comments` 두 화면이며, 실명 옆에 "익명" 꼬리표를
  함께 그려서 익명으로 썼다는 사실도 남긴다(그것도 처리 판단의 재료다).
  **공개 계약(`CommentView`)과 대시보드 카드(`CommentPreview`)는 그대로 가린다** —
  대시보드는 조작이 없는 미리보기라 볼 이유가 없다. repository 는 언제나 실명을 올리고
  가리는 판단은 service 가 한다.
- **댓글 신고**: 만든다. (초기 설계에서 미뤄 두었던 항목이며 `docs/sitemap-erd.md` 의
  사이트맵·ERD 에 처음부터 들어 있었다.) 사유는 **선택지 6개뿐이고 자유 텍스트를 받지
  않는다** — 받으면 신뢰 경계 밖 문자열이 어드민 화면에 그려지는 경로가 하나 더 생긴다.
  중복 신고는 `unique (comment_id, reporter_id)` 로 DB 가 막는다(service 가 세지 않는다 —
  TOCTOU). **신고 사실은 신고자 본인과 관리자 외에 아무에게도 보이면 안 된다** — 접수
  응답이 204 인 것과 댓글 목록 응답에 신고 여부가 없는 것이 그 장치다.
- **자동 처리 없음**: 신고 N건이 쌓여도 자동 차단·자동 삭제를 하지 않는다.
  신고자에게 처리 결과를 알리지도 않는다.
- **사용자 차단**: `users.status = 'BLOCKED'`. **효과는 "댓글 작성 불가" 하나뿐이다**
  (Figma 1:2516 문구). 로그인·조회·자기 정보 수정은 그대로 된다 — 판정은
  `src/lib/auth/accountStatus.ts` 의 `canSignIn`(탈퇴만 막음) / `canWriteComment`
  (차단을 막음) 두 함수가 나눠 갖는다. **차단 기간은 없다**(영구 차단만, 해제는 수동).
  **차단해도 이미 쓴 댓글은 지우지 않는다** — 지울 것은 건별로 지운다.
  관리자는 차단 대상이 될 수 없다(자기 자신도 불가). "마지막 관리자인가"를 세지 않는
  것은 역할 변경·탈퇴와 같은 판단이다(TOCTOU).
- **유저 북마크**: 만들지 않는다.
- **수정 이력**: `page_revisions`에 쓰기만 한다. `pageService.update()`에서 이전 버전 insert.
  조회·복원 UI는 없다.
- **계정 삭제**: soft delete. `status = 'WITHDRAWN'` + PII 컬럼 NULL 처리. hard delete 금지.
- **검색**: pg_trgm trigram 인덱스. `to_tsvector` FTS는 한국어 형태소 분석이 안 돼서 안 쓴다.
  오타 보정은 어절 앞/뒤 오타에는 동작하지만 **가운데 오타에는 약하다** (한국어 3음절
  단어에서 가운데가 틀리면 트라이그램이 거의 남지 않는다). 임계값 조정으로 해결되지 않는
  구조적 한계이므로 **임계값을 낮추지 마라.** 개선이 필요해지면 형태소 분석기나 외부
  검색엔진 도입이 별도 과제다.
- **화면 중복**: 어드민용으로 따로 그려진 Home / 항목별 게시물 / 검색 결과는 라우트를
  복제하지 않는다. 같은 public 라우트에서 헤더 컴포넌트만 role에 따라 교체한다.
- **카테고리 표시명**: `categories`는 표시명을 두 벌 가진다. 둘 다 Figma 정본이며
  **한쪽으로 통일하지 않는다.**
  - `name` (짧은 형: `공간` / `섬김` / `열청`) — 홈 카테고리 버튼, 게시물 태그 배지,
    사이드 카테고리, 목록, 에디터 카테고리 선택
  - `full_name` (긴 형: `열린교회 속 공간` …) — **Footer 카테고리 목록에서만** 사용
  - `slug` (`space` / `serving` / `youth`) — URL(`/categories/[slug]`)과 코드 분기용
    **불변 식별자**. 표시명이 바뀌어도 유지한다. 분기 조건에 표시명을 쓰지 않는다.
- **마크다운 붙여넣기**: **단방향(md → ProseMirror JSON)만 지원한다.**
  양방향 변환과 md 편집 모드("마크다운으로 보기" 토글 포함)를 만들지 않는다.
  이미지 크기·정렬 등 md 로 표현되지 않는 정보가 왕복에서 조용히 사라지는데,
  사용자는 무엇을 잃었는지 알 수 없다.
  - **미지원 문법(표·각주 등)을 만나도 새 tiptap 확장을 추가하지 않는다.**
    평문으로 남기고 무엇이 변환되지 않았는지 사용자에게 알린다. 조용히 버리지 않는다.
  - **붙여넣기 경로에서 raw HTML 은 차단한다.** "EDITOR 만 작성한다"는 신뢰 경계에
    기대지 않는다 — EDITOR 는 보안 담당자가 아니고, 출처를 모르는 md 를 붙여넣을 수 있다.
  - **StarterKit 의 paste rule 이 인라인 서식(굵게·기울임·취소선·코드·링크)을 이미
    변환한다.** 이 기능이 얹는 것은 블록 구조(제목·목록·인용·코드블록·수평선·이미지)뿐이다.

## 새 기능을 추가할 때

1. repository → service → route handler → UI 순서로 레이어를 갖춰서 제안한다.
   컴포넌트 안에 DB 호출을 박지 않는다.
2. "이 코드가 Java 백엔드로 바뀌어도 프론트가 안 바뀌는가?"를 스스로 점검한다.
   어긋나면 구조를 바로잡아 제안한다.
3. 설계 트레이드오프가 있으면 짧게 근거를 같이 설명한다.

## 미완료 항목

- **게시물 삭제 확인 UX 가 Figma 1:1759 와 대조되지 않았다.** 현재는 "제목 입력 확인"
  방식으로만 구현돼 있고 세부 배치가 시안과 다를 수 있다.
- **삭제 성공 알림(Figma 1:1803)이 미구현이다.**
- Figma MCP 호출 한도(Starter plan)가 풀리면 위 두 노드를 읽어 대조·수정한다.

## 참고 문서

- 사이트맵 · ERD · 설계 근거: `docs/sitemap-erd.md`
- 초기 스키마: `supabase/migrations/20260804000000_init.sql`
- 디자인: Figma `yullinwiki-joseph` (fileKey `zgimD0nr4SebHWiMLn4itq`)
