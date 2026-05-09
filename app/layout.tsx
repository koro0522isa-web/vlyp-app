import type { Metadata, Viewport } from "next";
import { Oswald, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { PHProvider } from "./providers";
import { WebVitals } from "./components/WebVitals";

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
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vlyp.app";

// Apple Web App設定はmetadataのotherフィールドで管理
// グローバル展開: hreflang 相当（同一 URL + アプリ内言語切替）と OG の主ロケールを明示
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "VLYP | ゲームクリップ・縦型動画コミュニティ",
    template: "%s | VLYP",
  },
  description:
    "神プレイをシェアしよう。VLYP はゲーム専用のリール型動画プラットフォームです。Gaming highlights, clips, DMs & creator Pro — play in Japanese, English, Korean, or Chinese in-app.",
  keywords: [
    "VLYP",
    "ゲームクリップ",
    "Gaming Clips",
    "Valorant",
    "Apex",
    "縦型動画",
    "eスポーツ",
    "game highlights",
  ],
  manifest: "/manifest.json",
  authors: [{ name: "VLYP Team" }],

  alternates: {
    canonical: siteUrl,
    languages: {
      "x-default": siteUrl,
      "ja-JP": siteUrl,
      "en-US": siteUrl,
      "ko-KR": siteUrl,
      "zh-CN": siteUrl,
    },
  },

  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },

  openGraph: {
    title: "VLYP | ゲームクリップ・ショート動画",
    description:
      "世界中のゲーマーとハイライトを共有。いいね・コメント・DM・Pro 機能対応。",
    url: "/",
    siteName: "VLYP",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "VLYP - Gaming Short Clips",
      },
    ],
    locale: "ja_JP",
    alternateLocale: ["en_US", "ko_KR", "zh_CN"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VLYP | Gaming Clips",
    description: "Share epic gaming moments worldwide.",
    images: ["/ogp.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
  verification: {
    google: "H5xI-kskMQoEFTd42hmbb4W0xwiGAmQ-kzSiMh_P6a0",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 構造化データ (Google用)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "VLYP",
    "alternateName": ["VLYP Game Clips"],
    "url": process.env.NEXT_PUBLIC_SITE_URL || 'https://vlyp.app',
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vlyp.app'}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="ja">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${oswald.variable} ${noto.variable} antialiased font-sans`}>
        <WebVitals />
        <PHProvider>
          {children}
        </PHProvider>
      </body>
    </html>
  );
}