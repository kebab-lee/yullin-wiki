"use client";

import Link from "next/link";
import { useState } from "react";

import TextField from "@/components/common/TextField";

/**
 * 로그인 폼 — Figma 로그인 1:1207 / 에러 상태 1:1432.
 *
 * 관리자 로그인(AdLogin 1:1456)도 필드 구성이 동일하므로 폼을 나누지 않는다.
 * 역할 구분은 폼이 아니라 인증 결과(users.role)가 한다.
 *
 * 지금은 퍼블리싱 단계라 제출이 서버로 나가지 않는다. 에러는 화면이 실제로
 * 동작하도록 로컬 검증으로만 채워 두고, API 가 붙으면 setError 의 인자만
 * 응답 메시지로 바뀐다 — 에러 표시 경로는 그대로 재사용된다.
 */
export default function LoginForm() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!loginId.trim() || !password) {
      setError("아이디 혹은 비밀번호가 잘못되었습니다.");
      return;
    }

    setError(null);
    // TODO: POST /api/auth/login
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-[300px] flex-col">
      <h1 className="h-[40px] text-[30px] font-bold leading-[40px] text-black">
        로그인
      </h1>

      {/* Figma Frame 1359 — 제목 아래 40px, 인풋 사이 20px */}
      <div className="mt-[40px] flex flex-col gap-[20px]">
        <TextField
          label="아이디"
          name="loginId"
          value={loginId}
          onChange={setLoginId}
          autoComplete="username"
        />
        {/* 에러는 아이디·비밀번호를 함께 가리키는 폼 단위 메시지지만,
            시안상 위치가 비밀번호 인풋 바로 아래라 여기에 붙인다. */}
        <TextField
          label="비밀번호"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={error ?? undefined}
        />
      </div>

      {/* Figma Frame 1562 — 위 블록에서 40px 아래. 에러가 생기면 그만큼 밀린다. */}
      <div className="mt-[40px] flex flex-col">
        <button
          type="submit"
          className="h-[51px] w-full rounded-badge bg-brand-red text-[16px] font-medium leading-[19px] text-white transition-opacity hover:opacity-90"
        >
          로그인
        </button>

        <p className="mt-[15px] flex items-center justify-center gap-[6px] text-[13px] leading-[16px]">
          <span className="text-gray3">아직 계정이 없으신가요?</span>
          <Link href="/signup" className="font-medium text-brand-red underline underline-offset-2">
            회원가입
          </Link>
        </p>
      </div>
    </form>
  );
}
