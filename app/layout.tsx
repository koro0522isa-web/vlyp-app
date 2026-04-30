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

// Apple Web App設定はmetadataのotherフィールドで管理
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
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "VLYP - Gaming Short Clips",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VLYP | Gaming Short Clips",
    description: "Share your epic gaming moments on VLYP.",
    images: ["/ogp.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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