-- ==========================================
-- Phase 26: 支援者 殿堂入り & バッジシステム
-- ==========================================

-- 1. クリエイターごとの支援者ランキングを取得する関数
-- 特定のクリエイター（p_creator_id）へのギフト額が多い順にユーザーを返します
CREATE OR REPLACE FUNCTION get_top_supporters(p_creator_id UUID, p_limit INTEGER DEFAULT 3)
RETURNS TABLE (
  supporter_id UUID,
  display_name TEXT,
  total_amount BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.sender_id as supporter_id,
    COALESCE(p.display_name, p.username, 'Player') as display_name,
    SUM(t.amount) as total_amount
  FROM transactions t
  JOIN profiles p ON t.sender_id = p.id
  WHERE t.receiver_id = p_creator_id AND t.type = 'gift'
  GROUP BY t.sender_id, p.display_name, p.username
  ORDER BY total_amount DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. サポーターバッジ判定用関数
-- あるユーザーが特定のクリエイターを支援したことがあるか（累計額）を返します
CREATE OR REPLACE FUNCTION check_supporter_level(p_user_id UUID, p_creator_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM transactions
  WHERE sender_id = p_user_id AND receiver_id = p_creator_id AND type = 'gift';
  
  -- 累計額に応じてレベル（0:なし, 1:ノーマル, 2:シルバー, 3:ゴールド）を返す例
  IF v_total >= 10000 THEN RETURN 3; -- ゴールド
  ELSIF v_total >= 1000 THEN RETURN 2; -- シルバー
  ELSIF v_total > 0 THEN RETURN 1; -- ブロンズ
  ELSE RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 通知テーブルの拡張 (ギフト時に自動で通知が飛ぶようにするためのフラグや設定)
-- (既存の notifications テーブルがある前提)
