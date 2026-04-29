-- ==========================================
-- Phase 32: コミュニティ機能強化 (リプライ & フォロー)
-- ==========================================

-- 1. コメントテーブルに親子関係を追加
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE;

-- 2. フォロー機能を実行するRPC関数
CREATE OR REPLACE FUNCTION toggle_follow(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_following BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = p_follower_id AND following_id = p_following_id) INTO is_following;
  
  IF is_following THEN
    DELETE FROM follows WHERE follower_id = p_follower_id AND following_id = p_following_id;
    RETURN FALSE;
  ELSE
    INSERT INTO follows (follower_id, following_id) VALUES (p_follower_id, p_following_id);
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
