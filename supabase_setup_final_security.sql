-- ==========================================
-- VLYP Final: セキュリティ・プロダクション設定 (RLS & 統計関数)
-- ==========================================
-- 世に出す前に、必ずこのSQLを最後に実行してください。
-- これにより、悪意のあるユーザーが他人のデータを操作できなくなります。

-- 1. RLS (Row Level Security) を全テーブルで有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_hashes ENABLE ROW LEVEL SECURITY;

-- 2. profiles: 誰でも閲覧可能、自分のみ更新可能
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 3. clips: BANされていなければ誰でも閲覧可能、自分のみ投稿・編集・削除可能
CREATE POLICY "Clips are viewable by everyone" ON clips FOR SELECT USING (status != 'banned');
CREATE POLICY "Users can insert their own clips" ON clips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clips" ON clips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clips" ON clips FOR DELETE USING (auth.uid() = user_id);

-- 4. wallets & creator_earnings: 自分のみ閲覧可能（更新はWebhook/RPCのみで行うためポリシー設定なし＝クライアントからは不可）
CREATE POLICY "Users can view their own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own earnings" ON creator_earnings FOR SELECT USING (auth.uid() = user_id);

-- 5. notifications: 受信者のみ閲覧・既読更新可能
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- 6. likes: 誰でも閲覧可能、自分のみ追加・削除可能
CREATE POLICY "Likes are viewable by everyone" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own likes" ON likes FOR ALL USING (auth.uid() = user_id);

-- 7. 統計関数 get_user_stats の追加 (Studio用)
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id UUID)
RETURNS TABLE (
  total_views BIGINT,
  total_likes BIGINT,
  clip_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(views), 0)::BIGINT,
    COALESCE(SUM(likes), 0)::BIGINT,
    COUNT(*)::BIGINT
  FROM clips
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 投げ銭時にウォレットが自動作成されるトリガー（安全策）
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, coins) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_wallet_for_new_user();
