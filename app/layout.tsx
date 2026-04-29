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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ),

  title: {
    default: "VLYP | Next-Gen Gaming Clips",
    template: "%s | VLYP"
  },
  description: "Share your epic gaming moments. VLYP is the ultimate platform for high-quality game clips, tips, and highlights.",
  keywords: ["VLYP", "Game Clip", "Gaming Clips", "Game Highlights", "Apex Legends", "Valorant", "Video Platform", "Gaming Community"],
  manifest: "/manifest.json",
  authors: [{ name: "VLYP Team" }],
  
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg", 
  },

  openGraph: {
    title: "VLYP | Next-Gen Gaming Clips Platform",
    description: "The best place to share and discover epic gaming moments. High-quality game clips from across the world.",
    url: "/",
    siteName: "VLYP",
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
    card: "summary_large_image",
    title: "VLYP | Gaming Short Clips",
    description: "Share your epic gaming moments on VLYP.",
    images: ["/icon.png"],
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
    "url": process.env.NEXT_PUBLIC_SITE_URL || 'https://vlyp.vercel.app',
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vlyp.vercel.app'}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="ja">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {/* ============================================================
            GOOGLE ADSENSE (広告) 設定エリア
            1. 以下の script のコメントアウトを外してください。
            2. client=ca-pub-XXXXXXXXXXXXXXXX の部分をあなたのIDに書き換えてください。
           ============================================================ */}
        {/* <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" 
          crossOrigin="anonymous"
        ></script> */}
        
      </head>
      <body className={`${oswald.variable} ${noto.variable} antialiased font-sans`}>
        <PHProvider>
          {children}
        </PHProvider>
      </body>
    </html>
  );
}