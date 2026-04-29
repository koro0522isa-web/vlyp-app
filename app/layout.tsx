import type { Metadata, Viewport } from "next";
import { Oswald, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { PHProvider } from "./providers"; // PostHog用のプロバイダー

// フォント設定
const oswald = Oswald({ 
  subsets: ["latin"], 
  weight: ['700'], 
  variable: '--font-oswald' 
});
const noto = Noto_Sans_JP({ 
  subsets: ["latin"], 
  variable: '--font-noto' 
});

// モバイル表示・テーマカラー設定
export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// SEO & PWA メタデータ
export const metadata: Metadata = {
  // 警告対策: 本番URLかlocalhostかを自動判別
  metadataBase: new URL(
    process.env.NODE_ENV === 'production' 
      ? 'https://your-project.vercel.app' // 自分のVercelドメインが確定したらここを書き換えてください
      : 'http://localhost:3000'
  ),

  title: "VLYP | Gaming Short Clips",
  description: "ゲームの神プレイや爆笑クリップをシェアしよう。VLYPはゲーマーのための次世代ショート動画プラットフォームです。",
  keywords: ["ゲーム", "クリップ", "Apex", "Valorant", "ショート動画", "VLYP", "神プレイ"],
  manifest: "/manifest.json",
  authors: [{ name: "VLYP Team" }],
  
  // ★重要：アイコン設定
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg", 
  },

  openGraph: {
    title: "VLYP | Gaming Short Clips",
    description: "最高の瞬間をシェアしよう。",
    url: "https://vlyp.vercel.app", // 公開URLが決まったら書き換えてください
    siteName: "VLYP",
    // ★重要：OGP画像も一旦icon.pngで代用（404対策）
    images: [
      {
        url: "/icon.png",
        width: 1024,
        height: 1024,
        alt: "VLYP Icon",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary", // 画像が正方形なので summary に変更
    title: "VLYP | Gaming Short Clips",
    description: "最高の瞬間をシェアしよう。",
    images: ["/icon.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* Google AdSense: あなたのパブリッシャーIDが確定したら、以下のコメントアウトを外して src を書き換えてください */}
        {/* <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossOrigin="anonymous"></script> */}
      </head>
      {/* PostHogプロバイダーでアプリ全体を囲む */}
      <body className={`${oswald.variable} ${noto.variable} antialiased font-sans`}>
        <PHProvider>
          {children}
        </PHProvider>
      </body>
    </html>
  );
}