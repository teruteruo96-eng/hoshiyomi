import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HOSHIYOMI 星詠み — 運命を読み解く占いチャット",
  description: "本物の占い師があなたの悩みに寄り添います。タロット・星座・霊視・四柱推命。いつでもメッセージを送れるサブスクリプション制占いチャットサービス。",
  keywords: "占い, タロット, 星座, 霊視, 四柱推命, チャット占い, オンライン占い",
  openGraph: {
    title: "HOSHIYOMI 星詠み",
    description: "本物の占い師があなたの悩みに寄り添います",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-deep text-gold-pale font-noto antialiased">
        {children}
      </body>
    </html>
  );
}
