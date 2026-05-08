-- ==========================================
-- Phase 5: バックエンド最適化 (インデックス & クエリ)
-- ==========================================

-- 1. 検索パフォーマンスを向上させるインデックス
-- タイトルの部分一致検索やゲーム名でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_clips_title_trgm ON clips USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clips_game_title ON clips(game_title);
CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at DESC);

-- 2. フォロー・いいね関係の高速化
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_likes_clip ON likes(clip_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

-- 3. pg_trgm 拡張の有効化 (高速な文字列検索用)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 4. 統計ビューの作成 (クエリの簡略化と高速化)
-- 各クリップの「いいね数」と「コメント数」をあらかじめ計算しておくビュー
CREATE OR REPLACE VIEW clip_engagement AS
SELECT 
  c.id as clip_id,
  (SELECT COUNT(*) FROM likes l WHERE l.clip_id = c.id) as total_likes,
  (SELECT COUNT(*) FROM comments cm WHERE cm.clip_id = c.id) as total_comments
FROM clips c;
