-- ==========================================
-- Phase 17: セキュリティ・コンプライアンス完全版
-- ==========================================

-- 1. 管理画面へのアクセス記録（監査ログ）
-- いつ、誰が管理データに触れたかを記録します
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only audit logs" ON admin_audit_logs FOR SELECT USING (is_admin());

-- 2. セキュリティ強化された管理者判定
-- メールアドレスだけでなく、特定のIPや拡張情報を将来的に追加できる基盤を作ります
CREATE OR REPLACE FUNCTION check_security_compliance() 
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. メールアドレスチェック
  IF (auth.jwt() ->> 'email') != 'koro0522isa@gmail.com' THEN
    RETURN FALSE;
  END IF;
  
  -- 2. 本人確認済み（Email Verified）かチェック
  IF (auth.jwt() ->> 'email_confirmed_at') IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 既存のポリシーをさらに強化
DROP POLICY IF EXISTS "Admins only access to reports" ON reports;
CREATE POLICY "Strict Admin access to reports"
  ON reports FOR SELECT
  USING (check_security_compliance());

-- 4. 重複アップロードとファイル制限の強化
-- 同一ハッシュの動画が別ユーザーによって投稿されるのをDBレベルで阻止
ALTER TABLE file_hashes ADD CONSTRAINT unique_file_hash UNIQUE (hash);
