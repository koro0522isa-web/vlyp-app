-- ==========================================
-- VLYP Phase 2: 無限スクロール & レコメンド用 SQL
-- ==========================================
-- 以下のSQLをSupabaseのSQL Editorで実行してください。

-- 1. 必要なカラムの追加（既存の場合はスキップされます）
ALTER TABLE clips ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready';
CREATE INDEX IF NOT EXISTS idx_clips_status ON clips(status);

-- 2. 視聴履歴テーブルの作成（将来のレコメンド精度の向上用）
CREATE TABLE IF NOT EXISTS watch_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_id BIGINT REFERENCES clips(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, clip_id)
);
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);

-- 3. インテリジェント・フィード取得用RPC（無限スクロール対応）
-- カーソルベースのページネーションと、再生数・いいね数を加味したスコアリングを行います。
CREATE OR REPLACE FUNCTION get_feed(
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_user_id UUID DEFAULT NULL,
  p_mode TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id BIGINT, 
  title TEXT, 
  url TEXT, 
  video_url TEXT,
  game_title TEXT, 
  user_id UUID, 
  user_name TEXT,
  views INT, 
  likes INT,
  status TEXT, 
  created_at TIMESTAMPTZ,
  profile_display_name TEXT, 
  profile_username TEXT, 
  score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.title, c.url, c.video_url,
    c.game_title, c.user_id, c.user_name, c.views, c.likes,
    c.status, c.created_at,
    p.display_name AS profile_display_name, 
    p.username AS profile_username,
    -- スコアリング計算式: (views * 0.3) + (likes * 0.5)
    -- 新しい投稿が極端に不利にならないように、最新のものほどスコアが少し高くなるようにしています
    (COALESCE(c.views,0) * 0.3 + COALESCE(c.likes,0) * 0.5 + 
     GREATEST(0, 100 - EXTRACT(EPOCH FROM NOW() - c.created_at) / 3600) * 0.2
    )::REAL AS score
  FROM clips c
  LEFT JOIN profiles p ON c.user_id = p.id
  WHERE c.status != 'banned'
    AND (
      p_mode != 'following'
      OR c.user_id IN (
        SELECT following_id FROM follows WHERE follower_id = p_user_id
      )
    )
  ORDER BY
    CASE WHEN p_mode = 'all' THEN
      (COALESCE(c.views,0)*0.3 + COALESCE(c.likes,0)*0.5 + GREATEST(0,100-EXTRACT(EPOCH FROM NOW()-c.created_at)/3600)*0.2)
    END DESC NULLS LAST,
    c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
