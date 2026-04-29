-- ==========================================
-- Phase 27: コンテンツガード & 連投制限システム (完全版)
-- ==========================================

-- 1. 連投制限（Rate Limiter）
CREATE OR REPLACE FUNCTION check_upload_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM clips
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 hour';

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Upload limit reached. Please wait an hour.';
  END IF;

  -- --- AIオート・モデレーション・ロジック ---
  -- 1. ゲーム関連キーワード（これがあれば自動承認）
  IF NEW.title ~* '(apex|valorant|fortnite|minecraft|splatoon|lol|スマブラ|勝ち|キル|勝利|gaming|clip|play|勝った)' THEN
    NEW.status := 'published';
  -- 2. 禁止キーワード（これがあれば自動削除/BAN）
  ELSIF NEW.title ~* '(広告|稼ぐ|副業|出会い|エロ|死ね|殺す|bitch|f*ck|spam|ad|money)' THEN
    NEW.status := 'banned';
  -- 3. それ以外は「審査待ち」
  ELSE
    NEW.status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_clip_upload_limit ON clips;
CREATE TRIGGER on_clip_upload_limit
  BEFORE INSERT ON clips
  FOR EACH ROW EXECUTE FUNCTION check_upload_rate_limit();

-- 2. 管理者による一括承認（Approve）関数
CREATE OR REPLACE FUNCTION approve_clip(p_clip_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE clips SET status = 'published' WHERE id = p_clip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 審査待ちリストを取得するビュー
CREATE OR REPLACE VIEW pending_clips_queue AS
SELECT id, title, video_url, user_id, created_at, game_title
FROM clips
WHERE status = 'pending'
ORDER BY created_at ASC;

-- 4. 管理者権限の追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- あなたを管理者に設定（最初のユーザーをとりあえず管理者に）
UPDATE profiles SET is_admin = TRUE WHERE id = (SELECT id FROM profiles LIMIT 1);
