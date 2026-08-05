"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import TextField from "@/components/common/TextField";
import { NETWORK_ERROR, readErrorBody } from "@/lib/api/errorBody";
import type { User } from "@/lib/types";

/**
 * 로그인 폼 — Figma 로그인 1:1207 / 에러 상태 1:1432.
 *
 * 관리자 로그인(AdLogin 1:1456)도 필드 구성이 동일하므로 폼을 나누지 않는다.
 * 역할 구분은 폼이 아니라 인증 결과(users.role)가 한다 — 로그인 성공 후
 * 응답의 role 로 이동 대상만 갈린다.
 *
 * 에러 문구는 서버가 준 것을 그대로 그린다. 어느 칸이 틀렸는지 폼이 추측하면
 * 서버가 일부러 통일해 둔 문구(계정 열거 방지)가 무너진다.
 */
export default function LoginForm() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });

      if (!response.ok) {
        setError((await readErrorBody(response)).message);
        return;
      }

      const { user }: { user: User } = await response.json();

      // 세션 쿠키가 생겼으니 서버 컴포넌트(헤더)가 다시 그려져야 한다.
      // push 만 하면 클라이언트 라우터 캐시가 GUEST 헤더를 그대로 재사용한다.
      router.replace(user.role === "ADMIN" ? "/admin" : "/");
      router.refresh();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
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
          disabled={submitting}
          className="h-[51px] w-full rounded-badge bg-brand-red text-[16px] font-medium leading-[19px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
