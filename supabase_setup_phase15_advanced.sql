-- ==========================================
-- Phase 15: 不正防止再生カウント & 収益化条件システム
-- ==========================================

-- 1. 再生ログテーブル（不正カウント防止）
CREATE TABLE IF NOT EXISTS view_logs (
  id BIGSERIAL PRIMARY KEY,
  clip_id BIGINT REFERENCES clips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT, -- ログインしていないユーザー用（オプション）
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成（検索高速化）
CREATE INDEX IF NOT EXISTS idx_view_logs_lookup ON view_logs(clip_id, user_id, viewed_at);

-- 2. 収益化設定テーブル（運営者が変更可能）
CREATE TABLE IF NOT EXISTS monetization_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  min_followers INTEGER DEFAULT 100,
  min_views INTEGER DEFAULT 1000,
  ad_revenue_per_view FLOAT DEFAULT 0.1, -- 1再生あたりの分配額（円）
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 初期値の投入
INSERT INTO monetization_config (id, min_followers, min_views)
VALUES (1, 100, 1000)
ON CONFLICT (id) DO NOTHING;

-- 3. プロフィールに収益化フラグを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_monetized BOOLEAN DEFAULT false;

-- 4. 改良版：再生数カウント関数（不正防止ロジック付き）
CREATE OR REPLACE FUNCTION increment_view_count(p_clip_id BIGINT, p_user_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  v_last_view TIMESTAMP WITH TIME ZONE;
  v_ad_share FLOAT;
  v_creator_id UUID;
  v_is_monetized BOOLEAN;
BEGIN
  -- 24時間以内に同じユーザーがこの動画を見ていないかチェック
  IF p_user_id IS NOT NULL THEN
    SELECT viewed_at INTO v_last_view 
    FROM view_logs 
    WHERE clip_id = p_clip_id AND user_id = p_user_id 
    ORDER BY viewed_at DESC LIMIT 1;

    -- 24時間以内ならカウントしない
    IF v_last_view IS NOT NULL AND v_last_view > now() - interval '24 hours' THEN
      RETURN;
    END IF;

    -- ログを記録
    INSERT INTO view_logs (clip_id, user_id) VALUES (p_clip_id, p_user_id);
  END IF;

  -- 再生数をアップ
  UPDATE clips SET views = views + 1 WHERE id = p_clip_id;

  -- 広告収益の分配（クリエイターが収益化済みの場合）
  SELECT user_id INTO v_creator_id FROM clips WHERE id = p_clip_id;
  SELECT is_monetized INTO v_is_monetized FROM profiles WHERE id = v_creator_id;
  SELECT ad_revenue_per_view INTO v_ad_share FROM monetization_config WHERE id = 1;

  IF v_is_monetized THEN
    INSERT INTO creator_earnings (user_id, total_earned, available_balance)
    VALUES (v_creator_id, v_ad_share, v_ad_share)
    ON CONFLICT (user_id) DO UPDATE SET
      total_earned = creator_earnings.total_earned + v_ad_share,
      available_balance = creator_earnings.available_balance + v_ad_share;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 収益化資格チェック関数
CREATE OR REPLACE FUNCTION check_monetization_eligibility(p_user_id UUID)
RETURNS TABLE (
  eligible BOOLEAN,
  current_followers INTEGER,
  needed_followers INTEGER,
  current_views INTEGER,
  needed_views INTEGER
) AS $$
DECLARE
  v_followers INTEGER;
  v_views INTEGER;
  v_min_f INTEGER;
  v_min_v INTEGER;
BEGIN
  -- 必要条件を取得
  SELECT min_followers, min_views INTO v_min_f, v_min_v FROM monetization_config WHERE id = 1;
  
  -- 現在の数値を計算
  SELECT count(*) INTO v_followers FROM follows WHERE following_id = p_user_id;
  SELECT COALESCE(sum(views), 0) INTO v_views FROM clips WHERE user_id = p_user_id;

  RETURN QUERY SELECT 
    (v_followers >= v_min_f AND v_views >= v_min_v),
    v_followers, v_min_f, v_views, v_min_v;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
