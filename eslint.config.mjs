// =============================================================
// 레이어 경계 가드레일 (CLAUDE.md "레이어 규칙" 참조)
//
//   클라이언트 컴포넌트 → Route Handler → Service → Repository → Supabase
//
// supabase-js는 src/lib/repositories 안에서만 살아 있어야 나중에 백엔드를
// Java(Spring Boot)로 교체할 때 갈아끼울 표면이 한 곳으로 좁혀진다.
// 사람이 리뷰에서 잡는 대신 lint가 잡도록 여기서 강제한다.
// =============================================================

import tsParser from "@typescript-eslint/parser";

const SUPABASE_SDK = {
  paths: [
    {
      name: "@supabase/supabase-js",
      message: "supabase-js는 src/lib/repositories 에서만 import 가능합니다.",
    },
  ],
  patterns: [
    {
      group: ["@supabase/supabase-js/*", "@supabase/ssr", "@supabase/ssr/*"],
      message: "supabase-js는 src/lib/repositories 에서만 import 가능합니다.",
    },
  ],
};

const REPOSITORY_LAYER = {
  group: [
    "@/lib/repositories",
    "@/lib/repositories/*",
    "**/lib/repositories",
    "**/lib/repositories/*",
  ],
  message:
    "컴포넌트는 repository를 직접 참조할 수 없습니다. Route Handler를 경유하세요.",
};

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
      "*.config.js",
    ],
  },

  // TypeScript / TSX 파서
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },

  // ── 라우트 핸들러 · 페이지 · 서비스: supabase-js 금지 ──
  {
    files: ["src/app/**/*.{ts,tsx}", "src/lib/services/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", SUPABASE_SDK],
    },
  },

  // ── 컴포넌트: supabase-js 금지 + repository 직접 참조 금지 ──
  // (같은 규칙명은 뒤 블록이 앞 블록을 통째로 덮으므로 두 제약을 한 번에 선언한다)
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: SUPABASE_SDK.paths,
          patterns: [...SUPABASE_SDK.patterns, REPOSITORY_LAYER],
        },
      ],
    },
  },
];
