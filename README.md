<div align="center">

# VLYP

**ゲーマー向け縦型ショート動画プラットフォーム + デスクトップ自動クリップ録画ソフト**

[![Website](https://img.shields.io/badge/Website-vlyp--app.vercel.app-blue?style=for-the-badge)](https://vlyp-app.vercel.app/landing)
[![Download for Windows](https://img.shields.io/badge/Download-Windows-violet?style=for-the-badge&logo=windows)](https://vlyp-app.vercel.app/api/download/windows)
[![Discord](https://img.shields.io/badge/Status-Alpha-pink?style=for-the-badge)](#)

</div>

---

## これは何

**VLYP** はゲーマーがプレイ中の "光る瞬間" を逃さず保存し、TikTok/Reels 風に縦型ショートとして即時投稿できるプラットフォームです。

### 構成

| 部位 | 役割 |
|---|---|
| **Web ( vlyp-app.vercel.app )** | 縦型動画フィード / プロフィール / 投稿エディタ / 決済 |
| **VLYP Clips (Windows)** | 裏で常時録画(2分ローリングバッファ) → ゲーム検知 → キル検知 → 自動切り抜き → 縦型変換 → VLYP に投稿 |

### 対応ゲーム(自動キル検知)

- VALORANT
- League of Legends
- Teamfight Tactics
- Apex Legends
- Counter-Strike 2
- Fortnite
- Overwatch

それ以外のゲームでも `Ctrl+F9` で手動クリップ可能。

---

## 技術スタック

```
Web      Next.js 16 (App Router)  +  Supabase (Auth, DB, Edge Functions)
         Stripe  +  Cloudflare R2  +  Vercel Edge

Desktop  Electron 28  +  Vite  +  React 18  +  Tailwind
         FFmpeg (ddagrab DXGI capture, NVENC/AMF/QSV/x264 自動選択)
```

---

## 開発

```bash
# Web
npm install
npm run dev          # http://localhost:3000

# Desktop
cd desktop
npm install
npm run dev          # Vite renderer + tsc main, electron 起動
npm run package      # NSIS installer 生成 (desktop/dist/)
```

リリースは tag push で自動ビルド・公開:

```bash
git tag desktop-v0.3.4
git push origin desktop-v0.3.4
# → GitHub Actions が Windows でビルド → Release 公開
```

---

## ライセンス

All rights reserved. Built by い (2026).
