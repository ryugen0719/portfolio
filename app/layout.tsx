import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Ryugen | About Me & Creative Work",
  description:
    "Ryugenの自己紹介ページ。Scratchでのゲーム制作、Blender作品、AIを活用したWebアプリ開発など、興味や制作物を紹介します。",
  keywords: ["自己紹介", "プロフィール", "ゲーム制作", "Blender", "Webアプリ", "Ryugen"],
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
