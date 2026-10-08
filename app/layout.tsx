import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Ryugen | Creative Portfolio",
  description:
    "Ryugenのポートフォリオ — ゲーム開発、クリエイティブコーディング、Webプロジェクトの作品集",
  keywords: ["portfolio", "game dev", "creative coding", "Ryugen"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
