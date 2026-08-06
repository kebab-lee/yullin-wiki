-- =============================================================
-- role 2단계(USER/ADMIN) → 3단계(USER/EDITOR/ADMIN)
--
-- 값은 대문자를 유지한다. status(ACTIVE/WITHDRAWN)·gender(MALE/FEMALE)와
-- 같은 규칙이고, Java 이관 시 @Enumerated(EnumType.STRING) 이 enum 상수명과
-- 그대로 매칭되어야 한다.
--
-- 기존 데이터 변환은 없다. USER / ADMIN 은 새 CHECK 에서도 그대로 유효하다.
-- =============================================================

alter table users drop constraint users_role_chk;

alter table users add constraint users_role_chk
  check (role in ('USER', 'EDITOR', 'ADMIN'));
