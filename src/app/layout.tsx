import type { Metadata } from "next";

import SiteFooter from "@/components/layout/SiteFooter";
import { REVALIDATE } from "@/lib/api/baseUrl";
import { fetchApi } from "@/lib/api/serverFetch";
import type { CategoryListBody } from "@/lib/api/types";
import type { Category } from "@/lib/types";

import "./globals.css";

export const metadata: Metadata = {
  title: "열린 위키 - 열린교회에 대한 모든 것",
  description: "예배의 감격이 있는 열린교회의 크고 작은 이야기들을 모은 위키입니다.",
};

/**
 * 푸터에 실을 카테고리.
 *
 * 실패해도 던지지 않는다. 푸터는 전 페이지 공통이라 여기서 throw 하면 카테고리
 * 조회 한 번 실패에 로그인 화면까지 통째로 500 이 된다. 푸터의 카테고리 목록은
 * 없어도 페이지가 성립하는 부가 정보이므로 빈 목록으로 접고 원인은 로그에 남긴다.
 */
async function fetchFooterCategories(): Promise<Category[]> {
  try {
    const body = await fetchApi<CategoryListBody>(
      "/api/categories",
      REVALIDATE.categories,
    );
    return body.categories;
  } catch (error) {
    console.error("[layout] 푸터 카테고리 조회 실패", error);
    return [];
  }
}

/**
 * 루트 레이아웃 — html/body/globals + 전 페이지 공통 푸터만 담당한다.
 *
 * 헤더는 여기 없다. Figma 시안상 홈(/)에는 Header(1:433)가 없고 히어로가
 * 그 역할을 겸하므로, 헤더는 (site) route group 의 layout 이 맡는다.
 * 홈은 (site) 밖에 있어서 자연히 헤더를 받지 않는다.
 *
 * 푸터 데이터를 여기서 받아 props 로 내린다. SiteFooter 가 스스로 fetch 하면
 * 같은 요청이 페이지마다 컴포넌트 안에 숨고, 컴포넌트는 데이터 출처를 모르는
 * 편이 낫다.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await fetchFooterCategories();

  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
          <SiteFooter categories={categories} />
        </div>
      </body>
    </html>
  );
}
