-- ==========================================
-- VLYP Phase 5: 無断転載対策＆独自アカウント強化
-- ==========================================
-- 以下のSQLをSupabaseのSQL Editorで実行してください。

-- 1. 独自アカウント強化: usernameを完全に一意（UNIQUE）にする
ALTER TABLE profiles ADD CONSTRAINT unique_username UNIQUE (username);

-- 2. 無断転載対策: アップロードされた動画のハッシュ（指紋）を保存するテーブル
CREATE TABLE IF NOT EXISTS file_hashes (
  id BIGSERIAL PRIMARY KEY,
  hash VARCHAR(255) UNIQUE NOT NULL,
  clip_id BIGINT REFERENCES clips(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. （オプション）Stripe決済用の履歴保存テーブル（Webhook用）
CREATE TABLE IF NOT EXISTS stripe_purchases (
  id VARCHAR(255) PRIMARY KEY, -- StripeのセッションID
  user_id UUID REFERENCES auth.users(id),
  amount INT NOT NULL,
  coins INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
