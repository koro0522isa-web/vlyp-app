-- ==========================================
-- Phase 31: AI推奨システム (ベクトル検索) の導入
-- ==========================================

-- 1. ベクトル拡張の有効化 (Supabaseでpgvectorを有効にします)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. clips テーブルに「AI埋め込みベクトル(embedding)」カラムを追加
-- Geminiのモデルに合わせて 768次元に設定します
ALTER TABLE clips ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. ベクトル検索用関数 (match_clips)
-- ユーザーの好み（query_embedding）に最も近い動画を高速に検索します
CREATE OR REPLACE FUNCTION match_clips(
  query_embedding vector(768),
  similarity_threshold float,
  match_count int,
  excluded_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  title text,
  video_url text,
  user_id uuid,
  game_title text,
  similarity float
) LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.video_url,
    c.user_id,
    c.game_title,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM clips c
  WHERE c.status = 'published'
  AND (excluded_user_id IS NULL OR c.user_id != excluded_user_id)
  AND 1 - (c.embedding <=> query_embedding) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 4. ユーザーの「視聴履歴」と「好み」を記録するテーブル
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_vector vector(768), -- AIが学習したユーザーの好み
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
