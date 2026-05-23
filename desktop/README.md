# VLYP Clips

ゲーマー向け自動クリップ録画・編集・投稿デスクトップアプリ

## 機能

- **バックグラウンド録画**: ローリングバッファ方式で常に直近2分間を記録
- **自動キル検知**: Valorant Client APIでキルを自動検知
- **自動クリップ切り出し**: キル検知時に自動で25秒クリップを生成
- **簡単投稿**: VLYPプラットフォームへワンクリック投稿

## 要件

- Windows 10/11
- ffmpeg は同梱済み (別途インストール不要)
- 自動キル検知対応ゲーム: Valorant / League of Legends / Apex Legends
- 手動クリップ対応ゲーム: Fortnite / CS2 / Overwatch / PUBG / Rocket League (Ctrl+F9)

## 開発者向け

- Node.js 18+ (開発時のみ。一般ユーザーは .exe を実行するだけ)

## インストール

```bash
cd desktop
npm install
```

## 開発

```bash
npm run dev
```

開発サーバーが起動し、以下にアクセス可能:
- メインプロセス: `dist/main/index.js`
- レンダラープロセス: `http://localhost:5173`

## ビルド

```bash
npm run build
npm run package
```

`dist/` フォルダに実行可能ファイルが生成されます。

## ディレクトリ構成

```
desktop/
├── src/
│   ├── main/             # Electronメインプロセス
│   │   ├── index.ts      # アプリケーションエントリ
│   │   ├── preload.ts    # IPC contextBridge
│   │   ├── recorder.ts   # ffmpegローリングバッファ
│   │   ├── detector.ts   # Valorant API検知
│   │   └── clipper.ts    # クリップ生成エンジン
│   └── renderer/         # Reactフロントエンド
│       ├── index.tsx     # Reactエントリ
│       ├── App.tsx       # メインコンポーネント
│       └── components/   # UIコンポーネント
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── electron-builder.yml
```

## アーキテクチャ

### メインプロセス

- **Recorder**: ffmpegで常に12個の10秒セグメント（計2分）をローリングバッファとして保持
- **Detector**: 1秒間隔でValorant Client APIをポーリング、キル増加を検知
- **Clipper**: キル検知時に直近30秒のセグメントを結合し、最後の25秒をクリップとして切り出す

### レンダラープロセス

- React + Tailwind CSS でダークテーマUI
- クリップ一覧表示（サイドバー）
- クリッププレビュー（メインエリア）
- 設定画面

### IPC通信

`contextBridge` で安全にメインプロセスのメソッドを公開:
- `startRecording()`, `stopRecording()`
- `listClips()`, `deleteClip(path)`
- `getSettings()`, `setSettings()`
- イベントリスナ: `onClipCreated`, `onRecordingStatus`

## ライセンス

VLYP Inc. 2026
