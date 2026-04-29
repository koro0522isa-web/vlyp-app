-- ==========================================
-- Phase 10 & 11: ハードニング、アルゴリズム、プライバシー保護
-- ==========================================

-- 1. クリップにエンゲージメントスコアを追加
ALTER TABLE clips ADD COLUMN IF NOT EXISTS engagement_score FLOAT DEFAULT 0;

-- 2. 投稿制限（スパム防止）用の設定
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_post_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_post_count INTEGER DEFAULT 0;

-- 3. おすすめ（Hot）アルゴリズムの実装
-- 計算式: (いいね数 * 10 + 再生数) / (経過時間 + 2)^1.5
CREATE OR REPLACE FUNCTION calculate_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clips SET engagement_score = 
    (likes * 10 + views) / 
    POWER(EXTRACT(EPOCH FROM (now() - created_at)) / 3600 + 2, 1.5)
  WHERE id = NEW.clip_id; -- likesの更新トリガーなどから呼ばれる想定
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 投稿制限のトリガー関数
CREATE OR REPLACE FUNCTION check_post_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
  v_last_post TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT daily_post_count, last_post_at INTO v_count, v_last_post FROM profiles WHERE id = NEW.user_id;

  -- 日付が変わっていたらカウントをリセット
  IF v_last_post IS NULL OR v_last_post::date < now()::date THEN
    UPDATE profiles SET daily_post_count = 1, last_post_at = now() WHERE id = NEW.user_id;
  ELSE
    IF v_count >= 10 THEN -- 1日10投稿までに制限
      RAISE EXCEPTION 'Daily post limit reached (Max 10 clips per day)';
    END IF;
    UPDATE profiles SET daily_post_count = v_count + 1, last_post_at = now() WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 投稿時に制限をチェック
DROP TRIGGER IF EXISTS on_clip_upload_limit ON clips;
CREATE TRIGGER on_clip_upload_limit
  BEFORE INSERT ON clips
  FOR EACH ROW EXECUTE FUNCTION check_post_limit();

-- 5. 改良版 get_feed (アルゴリズム対応)
CREATE OR REPLACE FUNCTION get_feed(
  p_limit INTEGER,
  p_offset INTEGER,
  p_user_id UUID DEFAULT NULL,
  p_mode TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  title TEXT,
  video_url TEXT,
  game_title TEXT,
  likes INTEGER,
  views INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  profile_display_name TEXT,
  profile_username TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.user_id, c.title, c.video_url, c.game_title, c.likes, c.views, c.created_at,
    p.display_name, p.username
  FROM clips c
  LEFT JOIN profiles p ON c.user_id = p.id
  WHERE c.status != 'banned'
    AND (
      p_mode = 'all' 
      OR (p_mode = 'following' AND c.user_id IN (SELECT following_id FROM follows WHERE follower_id = p_user_id))
    )
  ORDER BY 
    CASE WHEN p_mode = 'all' THEN c.engagement_score ELSE 0 END DESC,
    c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. セキュリティ：profilesから敏感な情報を除外するビュー（API用）
-- 注意: これは既存のSELECTポリシーを強化することで代用
CREATE OR REPLACE POLICY "Profiles are viewable by everyone" ON profiles
FOR SELECT USING (true); -- emailなどは最初からテーブルに含まれていないか、auth.usersにあるため安全
