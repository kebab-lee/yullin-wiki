import type { Metadata } from "next";

import SiteFooter from "@/components/layout/SiteFooter";

import "./globals.css";

export const metadata: Metadata = {
  title: "열린 위키 - 열린교회에 대한 모든 것",
  description: "예배의 감격이 있는 열린교회의 크고 작은 이야기들을 모은 위키입니다.",
};

/**
 * 루트 레이아웃 — html/body/globals + 전 페이지 공통 푸터만 담당한다.
 *
 * 헤더는 여기 없다. Figma 시안상 홈(/)에는 Header(1:433)가 없고 히어로가
 * 그 역할을 겸하므로, 헤더는 (site) route group 의 layout 이 맡는다.
 * 홈은 (site) 밖에 있어서 자연히 헤더를 받지 않는다.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
