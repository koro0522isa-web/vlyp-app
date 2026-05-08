# VLYPプラットフォーム APIエンドポイント有効化ガイド

## 📋 完成したAPIエンドポイント一覧

### 1. デスクトップ録画関連
- `POST /api/desktop-upload` - デスクトップ録画動画のアップロード
- `POST /api/vlyp-score` - VLYPスコア計算

### 2. OBS連携
- `POST /api/obs/connect` - OBS接続設定
- `GET /api/obs/connect` - OBS接続状況確認

### 3. 配信関連
- `POST /api/streaming/start` - 配信開始
- `POST /api/streaming/stop` - 配信停止

### 4. 自動編集
- `POST /api/auto-edit` - VLYPベースの自動編集設定

### 5. 音楽ライブラリ
- `GET /api/music/library` - 音楽ライブラリ取得
- `POST /api/music/library` - 音楽トラックアップロード

### 6. 収益化
- `GET /api/monetization/revenue` - 収益データ取得
- `POST /api/monetization/revenue` - 収益記録作成

---

## 🚀 APIエンドポイント有効化手順

### ステップ1: 環境変数の設定

まず、`.env.local`ファイルに必要なAPIキーを設定します：

```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe設定（収益化用）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google AI設定
NEXT_PUBLIC_GOOGLE_AI_API_KEY=your_google_ai_api_key

# 配信プラットフォームAPIキー
YOUTUBE_API_KEY=your_youtube_api_key
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
KICK_API_KEY=your_kick_api_key

# AWS設定（任意）
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=vlyp-videos
```

### ステップ2: データベースのセットアップ

1. **Supabaseプロジェクトにアクセス**
   - [Supabase Dashboard](https://supabase.com/dashboard) にログイン

2. **SQLエディタで実行**
   ```sql
   -- 作成した database_setup_complete.sql の内容をコピーして実行
   ```

3. **実行確認**
   - すべてのテーブルが作成されたことを確認
   - RLSポリシーが有効になっていることを確認

### ステップ3: APIルートの確認

Next.jsのApp Routerでは、`app/api/` ディレクトリ内のファイルが自動的にAPIエンドポイントとして有効化されます。

現在のファイル構造：
```
app/
├── api/
│   ├── desktop-upload/
│   │   └── route.ts          ✅ 自動有効化
│   ├── vlyp-score/
│   │   └── route.ts          ✅ 自動有効化
│   ├── obs/
│   │   └── connect/
│   │       └── route.ts      ✅ 自動有効化
│   ├── streaming/
│   │   ├── start/
│   │   │   └── route.ts      ✅ 自動有効化
│   │   └── stop/
│   │       └── route.ts      ✅ 自動有効化
│   ├── auto-edit/
│   │   └── route.ts          ✅ 自動有効化
│   ├── music/
│   │   └── library/
│   │       └── route.ts      ✅ 自動有効化
│   └── monetization/
│       └── revenue/
│           └── route.ts      ✅ 自動有効化
```

### ステップ4: 開発サーバーの起動とテスト

```bash
# 開発サーバー起動
npm run dev

# 別のターミナルでAPIテスト
curl -X GET http://localhost:3000/api/music/library
```

### ステップ5: CORS設定の確認

APIが外部からアクセスできるようにCORS設定を確認：

```typescript
// app/api/[...]/route.ts の先頭に追加
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

---

## 🔧 各APIエンドポイントの詳細設定

### 1. デスクトップアップロードAPI

**エンドポイント**: `POST /api/desktop-upload`

**設定が必要な項目**:
- Supabaseストレージバケットの作成
- ファイルアップロードサイズ制限の設定

```bash
# Supabaseでストレージバケット作成
CREATE STORAGE BUCKET videos;
CREATE POLICY "Users can upload own videos" ON storage.objects FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. VLYPスコアリングAPI

**エンドポイント**: `POST /api/vlyp-score`

**設定が必要な項目**:
- Google AI APIキーの設定
- スコアリングアルゴリズムの調整

### 3. OBS連携API

**エンドポイント**: `POST /api/obs/connect`

**設定が必要な項目**:
- WebSocketポートの開放（4456）
- OBSプラグインのインストール

### 4. 配信API

**エンドポイント**: `POST /api/streaming/start`

**設定が必要な項目**:
- 各プラットフォームのAPIキー
- RTMPサーバーの設定

### 5. 音楽ライブラリAPI

**エンドポイント**: `GET/POST /api/music/library`

**設定が必要な項目**:
- 音楽ファイルのストレージ設定
- 著作権管理システム

### 6. 収益化API

**エンドポイント**: `GET/POST /api/monetization/revenue`

**設定が必要な項目**:
- Stripe Webhookエンドポイントの設定
- 支払い処理システム

---

## 🧪 APIテスト手順

### 1. 基本的なテスト

```bash
# 音楽ライブラリ取得テスト
curl -X GET http://localhost:3000/api/music/library

# VLYPスコア計算テスト
curl -X POST http://localhost:3000/api/vlyp-score \
  -H "Content-Type: application/json" \
  -d '{"videoFrame": "test", "audioData": {}}'
```

### 2. 認証が必要なAPIテスト

```bash
# ユーザー認証後のテスト
curl -X GET http://localhost:3000/api/monetization/revenue \
  -H "Authorization: Bearer your_jwt_token"
```

### 3. ファイルアップロードテスト

```bash
# デスクトップ録画アップロードテスト
curl -X POST http://localhost:3000/api/desktop-upload \
  -F "video=@test_video.mp4" \
  -F "title=Test Video" \
  -F "game_title=Test Game"
```

---

## 🚨 よくある問題と解決策

### 1. CORSエラー
**問題**: `Access-Control-Allow-Origin` エラー
**解決策**: APIルートにCORSヘッダーを追加

### 2. 認証エラー
**問題**: `Unauthorized` エラー
**解決策**: Supabase認証設定を確認

### 3. データベース接続エラー
**問題**: データベース接続失敗
**解決策**: 環境変数の確認、SQL実行の確認

### 4. ファイルアップロードエラー
**問題**: ファイルサイズ制限エラー
**解決策**: Next.js設定でファイルサイズ制限を調整

---

## 📱 フロントエンドとの連携

APIエンドポイントが有効化されたら、以下のコンポーネントを既存ページに統合：

1. **MusicLibrary.tsx** → `/music` ページ
2. **StreamingDashboard.tsx** → `/studio` ページに統合
3. **MonetizationDashboard.tsx** → `/revenue` ページ

これでVLYPプラットフォームの全機能が利用可能になります！
