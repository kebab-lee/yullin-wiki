-- =============================================================
-- 20260804000000_init.sql — 열린위키 초기 스키마
--
-- 원칙:
--   * 표준 PostgreSQL만 사용. Supabase 전용 기능 없음.
--   * auth.users 참조 없음. 인증 사용자도 우리 users 테이블.
--   * enum은 native ENUM 타입 대신 varchar + CHECK.
--     이유: JPA에서 @Enumerated(EnumType.STRING) 하나로 그대로 매핑된다.
--     native ENUM은 커스텀 타입 핸들러가 필요하고 값 추가 시 ALTER TYPE이 걸린다.
--   * RLS 없음. 권한 판단은 전부 service 레이어.
-- =============================================================

create extension if not exists pg_trgm;

-- -------------------------------------------------------------
-- updated_at 자동 갱신
-- Spring 이관 시 Hibernate @UpdateTimestamp 한 줄로 대체 가능.
-- DB에 넣는 유일한 로직이며 의도적으로 여기서 끝낸다.
-- -------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =============================================================
-- users
-- =============================================================
create table users (
  id                uuid primary key default gen_random_uuid(),
  login_id          varchar(30)  not null unique,
  password_hash     varchar(255) not null,

  -- 탈퇴 시 NULL로 비우기 때문에 nullable.
  -- 회원가입 폼에서는 전부 필수이며, 그 검증은 service 레이어가 담당한다.
  name              varchar(50),
  gender            varchar(10),
  birth_date        date,
  phone             varchar(20),

  is_church_member  boolean      not null default false,
  role              varchar(20)  not null default 'USER',
  status            varchar(20)  not null default 'ACTIVE',

  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now(),

  constraint users_gender_chk check (gender is null or gender in ('MALE', 'FEMALE')),
  constraint users_role_chk   check (role   in ('USER', 'ADMIN')),
  constraint users_status_chk check (status in ('ACTIVE', 'BLOCKED', 'WITHDRAWN'))
);

create index users_status_idx on users (status);

create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();


-- =============================================================
-- categories  (항목: 공간 / 섬김 / 열청 …)
-- =============================================================
create table categories (
  id          uuid         primary key default gen_random_uuid(),

  -- URL(/categories/[slug])과 코드 분기용 불변 식별자. 표시명이 바뀌어도 유지한다.
  slug        varchar(50)  not null unique,

  -- 표시명 2종. 둘 다 Figma 정본이며 한쪽으로 통일하지 않는다.
  --   name      짧은 형 — 홈 버튼 / 게시물 배지 / 사이드캣 / 목록 / 에디터
  --   full_name 긴 형   — Footer 카테고리 목록 전용
  name        varchar(50)  not null,
  full_name   varchar(100) not null,

  icon        varchar(20)  not null,           -- 이모지 문자 그대로
  sort_order  int          not null default 0,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create index categories_sort_order_idx on categories (sort_order);

create trigger categories_set_updated_at
  before update on categories
  for each row execute function set_updated_at();


-- =============================================================
-- pages  (게시물 / 임시저장 포함)
-- =============================================================
create table pages (
  id            uuid         primary key default gen_random_uuid(),
  category_id   uuid         not null references categories (id) on delete restrict,
  author_id     uuid         not null references users (id)      on delete restrict,

  title         varchar(200) not null,

  -- 에디터 블록 배열. [{ type: 'h1', text: '…' }, { type: 'image', … }, …]
  -- 목차(TOC)와 참고문헌은 별도 저장하지 않고 이 안에서 렌더 시점에 뽑는다.
  content       jsonb        not null default '[]'::jsonb,

  -- content에서 텍스트만 추출한 검색용 사본. pageService가 저장 시 채운다.
  -- DB 함수로 만들지 않은 이유: 추출 로직을 TS에 두면 Java 이관 시 그대로 옮겨진다.
  plain_text    text         not null default '',

  search_text   text generated always as (title || ' ' || plain_text) stored,

  status        varchar(20)  not null default 'DRAFT',
  published_at  timestamptz,

  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),
  deleted_at    timestamptz,

  constraint pages_status_chk check (status in ('DRAFT', 'PUBLISHED')),
  constraint pages_published_at_chk
    check (status <> 'PUBLISHED' or published_at is not null)
);

-- FK 컬럼 인덱스. Postgres는 참조하는 쪽 컬럼에 인덱스를 자동 생성하지 않는다.
-- 아래 pages_public_idx가 category_id로 시작하긴 하지만 PUBLISHED 한정 partial이라
-- 카테고리 삭제 시의 on delete restrict 검사나 DRAFT 포함 어드민 조회는 커버하지 못한다.
create index idx_pages_category_id on pages (category_id);

-- 공개 목록/카테고리 조회 (살아있는 게시물만)
create index pages_public_idx
  on pages (category_id, published_at desc)
  where status = 'PUBLISHED' and deleted_at is null;

-- 최근 추가 게시물
create index pages_recent_idx
  on pages (published_at desc)
  where status = 'PUBLISHED' and deleted_at is null;

-- 어드민 임시저장소
create index pages_draft_idx
  on pages (updated_at desc)
  where status = 'DRAFT' and deleted_at is null;

-- 검색.
-- 한국어는 Postgres 기본 사전이 형태소 분석을 못 해서 to_tsvector가 조사를 못 떼어낸다
-- ("청소년부는"과 "청소년부"가 다른 토큰이 됨). trigram이 부분일치를 잡아주므로
-- 이 규모에서는 FTS보다 실용적이다. pg_trgm은 표준 contrib이라 RDS에서도 그대로 쓸 수 있다.
create index pages_search_idx on pages using gin (search_text gin_trgm_ops);

create trigger pages_set_updated_at
  before update on pages
  for each row execute function set_updated_at();


-- =============================================================
-- page_revisions  (쓰기 전용. 조회 UI는 아직 없음)
-- =============================================================
create table page_revisions (
  id          uuid         primary key default gen_random_uuid(),
  page_id     uuid         not null references pages (id) on delete cascade,
  title       varchar(200) not null,
  content     jsonb        not null,
  edited_by   uuid         references users (id) on delete set null,
  created_at  timestamptz  not null default now()
);

create index page_revisions_page_idx on page_revisions (page_id, created_at desc);


-- =============================================================
-- tags / page_tags
-- =============================================================
create table tags (
  id          uuid        primary key default gen_random_uuid(),
  name        varchar(30) not null unique,
  created_at  timestamptz not null default now()
);

create table page_tags (
  page_id  uuid not null references pages (id) on delete cascade,
  tag_id   uuid not null references tags  (id) on delete cascade,
  primary key (page_id, tag_id)
);

-- 태그로 게시물 역조회
create index page_tags_tag_idx on page_tags (tag_id);


-- =============================================================
-- comments
-- =============================================================
create table comments (
  id            uuid        primary key default gen_random_uuid(),
  page_id       uuid        not null references pages (id) on delete cascade,

  -- 익명 댓글도 작성자를 기록한다. 화면 표시만 is_anonymous로 가린다.
  author_id     uuid        not null references users (id) on delete restrict,

  -- 대댓글. 디자인상 1단계까지만 허용하며, 깊이 제한은 service에서 검증한다
  -- (자기참조 깊이는 CHECK 제약으로 표현할 수 없음).
  parent_id     uuid        references comments (id) on delete cascade,

  content       text        not null,
  is_anonymous  boolean     not null default false,
  status        varchar(20) not null default 'VISIBLE',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint comments_status_chk  check (status in ('VISIBLE', 'DELETED')),
  constraint comments_content_chk check (length(trim(content)) > 0)
);

-- 게시물 상세의 댓글 목록
create index comments_page_idx on comments (page_id, created_at);

-- 마이페이지 "내 댓글 모아보기"
create index comments_author_idx on comments (author_id, created_at desc);

-- 어드민 "최근 달린 댓글"
create index comments_recent_idx
  on comments (created_at desc)
  where status = 'VISIBLE';

create trigger comments_set_updated_at
  before update on comments
  for each row execute function set_updated_at();


-- =============================================================
-- comment_reports
-- =============================================================
create table comment_reports (
  id           uuid        primary key default gen_random_uuid(),
  comment_id   uuid        not null references comments (id) on delete cascade,
  reporter_id  uuid        not null references users (id)    on delete restrict,

  -- ⚠️ Figma 신고 팝업의 사유 6개 항목 텍스트를 아직 확인 못 했다. 확정 후 교체 필요.
  reason       varchar(30) not null,
  status       varchar(30) not null default 'PENDING',

  handled_by   uuid        references users (id) on delete set null,
  handled_at   timestamptz,
  created_at   timestamptz not null default now(),

  constraint comment_reports_reason_chk
    check (reason in ('SPAM', 'ABUSE', 'OBSCENE', 'PRIVACY', 'FALSE_INFO', 'ETC')),
  constraint comment_reports_status_chk
    check (status in ('PENDING', 'RESOLVED_DELETED', 'RESOLVED_IGNORED')),

  -- 같은 사람이 같은 댓글을 중복 신고하지 못하게
  constraint comment_reports_unique unique (comment_id, reporter_id)
);

-- 어드민 신고 관리 (미처리 우선)
create index comment_reports_pending_idx
  on comment_reports (created_at desc)
  where status = 'PENDING';


-- =============================================================
-- seed: categories
-- Figma 정본 확인분. 항목이 더 있으면 sort_order 이어서 추가.
-- 이전 seed의 🤝(섬김) / 🔥(열청)은 Figma 확인 결과 오류라 폐기했다.
-- =============================================================
insert into categories (slug, name, full_name, icon, sort_order) values
  ('space',   '공간', '열린교회 속 공간', '⛪️', 1),
  ('serving', '섬김', '열린교회 내 섬김', '🤲', 2),
  ('youth',   '열청', '열린교회 청년부', '🌱', 3);