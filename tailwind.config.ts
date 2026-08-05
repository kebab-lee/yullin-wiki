import type { Config } from "tailwindcss";

/**
 * 값의 정본은 src/app/globals.css 의 :root 변수다.
 * 여기서는 이름만 붙인다 — 색을 바꿀 일이 생기면 globals.css 한 곳만 고친다.
 * 출처: Figma `yullinwiki-joseph` Home(1:318) / Footer(1:396)
 */
const rgb = (token: string) => `rgb(var(${token}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 열린위키 브랜드 컬러
        brand: {
          red: rgb("--color-brand-red"),               // #B32020 메인 빨강
          "red-white": rgb("--color-brand-red-white"), // #F6F5F4 밝은 배경
          "red-pink": rgb("--color-brand-red-pink"),   // #F8ECEA 연한 핑크
          "red-muted": rgb("--color-brand-red-muted"), // #8B6666 어드민 검색창
        },
        // 카테고리 (초록 계열)
        category: {
          green: rgb("--color-category-green"),               // #C2CDAB 연두 (테두리)
          green2: rgb("--color-category-green2"),             // #9BAE73 항목 버튼 선택/hover 채움
          "green-light": rgb("--color-category-green-light"), // #E8ECD0 연두 배경
          "green-dark": rgb("--color-category-green-dark"),   // #808F44 진한 초록 (텍스트)
        },
        // 그레이 스케일
        gray2: rgb("--color-gray2"), // #DBDDDF
        gray3: rgb("--color-gray3"), // #90969C
        gray4: rgb("--color-gray4"), // #555555
        "redgray-light": rgb("--color-redgray-light"), // #D9B1B1
      },
      fontFamily: {
        pretendard: "var(--font-sans)",
      },
      fontSize: {
        // Figma 텍스트 스타일
        "card-title": ["18px", { lineHeight: "21px", fontWeight: "700" }],
        "card-tag": ["14px", { lineHeight: "22px", fontWeight: "400" }],
        "card-content": ["15px", { lineHeight: "21px", fontWeight: "300" }],
        "footer-title": ["14px", { lineHeight: "16px", fontWeight: "500" }],
        "footer-content": ["14px", { lineHeight: "16px", fontWeight: "300" }],
        "category-icon": ["40px", { lineHeight: "40px", fontWeight: "700" }],
        "category-label": ["18px", { lineHeight: "22px", fontWeight: "700" }],
      },
      maxWidth: {
        page: "var(--layout-page)",
        hero: "var(--layout-hero)",
        content: "var(--layout-content)",
        admin: "var(--layout-admin)",
      },
      width: {
        hero: "var(--layout-hero)",
        "hero-inner": "var(--layout-hero-inner)",
        content: "var(--layout-content)",
      },
      borderRadius: {
        hero: "var(--radius-hero)",
        card: "var(--radius-card)",
        badge: "var(--radius-badge)",
        pill: "var(--radius-pill)",
      },
    },
  },
  plugins: [],
};

export default config;
