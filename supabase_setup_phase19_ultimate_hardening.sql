-- ==========================================
-- Phase 19: アルティメット・セキュリティ & 高速化
-- ==========================================

-- 1. プロフィールの所有者制限 (RLS)
-- 他人のプロフィールを更新できないようにします
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. 動画（クリップ）の所有者制限 (RLS)
-- 他人の動画を消したり編集したりできないようにします
DROP POLICY IF EXISTS "Users can update own clips" ON clips;
CREATE POLICY "Users can update own clips" 
  ON clips FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own clips" ON clips;
CREATE POLICY "Users can delete own clips" 
  ON clips FOR DELETE 
  USING (auth.uid() = user_id);

-- 3. ウォレットの金庫化 (厳格な制限)
-- ユーザーは自分の残高を「見る」ことしかできません
-- 直接「増やす（INSERT/UPDATE）」ことは禁止します
DROP POLICY IF EXISTS "Users can see own wallet" ON wallets;
CREATE POLICY "Users can see own wallet" 
  ON wallets FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;
-- ※注意：これにより、SQL Editor以外の全アプリ（フロントエンド）から直接更新が不可になります
-- 今後コインを増やすには、必ず RPC (increment_wallet_coins) を使う必要があります

-- 4. 重複通報の防止
-- 同じユーザーが同じ動画を何度も通報できないようにユニーク制約を追加
ALTER TABLE reports DROP CONSTRAINT IF EXISTS unique_user_report_per_clip;
ALTER TABLE reports ADD CONSTRAINT unique_user_report_per_clip UNIQUE (reporter_id, clip_id);

-- 5. 高速化のためのインデックス (検索の爆速化)
CREATE INDEX IF NOT EXISTS idx_clips_game_title ON clips(game_title);
CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_title_trgm ON clips USING gin (title gin_trgm_ops); -- 要 pg_trgm 拡張
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 6. 自動更新日時 (updated_at) の自動化
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_modtime ON profiles;
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
