import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans",
  weight: ["400", "500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "데일리 영양제", template: "%s · 데일리 영양제" },
  description: "생활환경과 증상에 맞춘 영양제 조합, 복용 시간표, 구매 링크",
  // 지인 테스트용 — 링크를 받은 사람만 들어오도록 검색엔진 노출 차단
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
