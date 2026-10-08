import { Inter, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Ryugen — Creative Developer / 3D Artist",
  description:
    "Portfolio of Ryugen — Creative Developer and 3D Artist. Blender, Game Development, and more.",
  keywords: ["Ryugen", "Portfolio", "Blender", "3D Artist", "Game Developer"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
