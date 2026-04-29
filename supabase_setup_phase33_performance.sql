-- ==========================================
-- Phase 33: パフォーマンス最適化 (サムネイル & 高速化)
-- ==========================================

-- 1. clips テーブルにサムネイルURLカラムを追加
ALTER TABLE clips ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2. 動画の「視聴維持率」を計測するためのテーブル (将来のアルゴリズム用)
CREATE TABLE IF NOT EXISTS video_stats (
  clip_id BIGINT REFERENCES clips(id) ON DELETE CASCADE,
  average_watch_time FLOAT DEFAULT 0,
  completion_rate FLOAT DEFAULT 0, -- 完走率
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (clip_id)
);
