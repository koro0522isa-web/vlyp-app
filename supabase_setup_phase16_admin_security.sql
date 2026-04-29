-- ==========================================
-- Phase 16: 管理者権限の物理セキュリティ（RLS強化）
-- ==========================================

-- 1. 管理者かどうかを判定する関数の作成
-- あなたのメールアドレスをシステムに「唯一の管理者」として刻みます
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  -- ログイン中のユーザーのメールアドレスがあなたのものであるかチェック
  RETURN (auth.jwt() ->> 'email') = 'koro0522isa@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 出金リクエストの閲覧制限
-- クリエイターは「自分の申請」だけ見れる。管理者は「全員の申請」を見れる。
DROP POLICY IF EXISTS "Users can view their own requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON withdrawal_requests;

CREATE POLICY "Withdrawal requests access policy"
  ON withdrawal_requests FOR SELECT
  USING (
    auth.uid() = user_id OR is_admin()
  );

-- 管理者のみステータスを更新できる（支払完了ボタンなど）
CREATE POLICY "Admins can update requests"
  ON withdrawal_requests FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- 3. 通報データの閲覧制限
-- 管理者以外は通報データを1行も見ることができない
DROP POLICY IF EXISTS "Reports are viewable by everyone" ON reports;
CREATE POLICY "Admins only access to reports"
  ON reports FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins only delete reports"
  ON reports FOR DELETE
  USING (is_admin());

-- 4. 収益化設定の保護
-- 収益化の条件（フォロワー数など）を勝手に変えられないようにする
ALTER TABLE monetization_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Monetization config is viewable by everyone" ON monetization_config;
CREATE POLICY "Everyone can see monetization config" ON monetization_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update monetization config" ON monetization_config;
CREATE POLICY "Admins can update monetization config"
  ON monetization_config FOR UPDATE
  USING (is_admin());
