-- ==========================================
-- VLYP Phase 6: エンゲージメント強化（通知・アバター）
-- ==========================================
-- 以下のSQLをSupabaseのSQL Editorで実行してください。

-- 1. プロフィールにアバター画像のカラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. 通知（Notifications）テーブルの作成
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- 通知を受け取る人
  actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- アクションを起こした人
  type TEXT NOT NULL, -- 'like', 'follow', 'gift'
  clip_id BIGINT REFERENCES clips(id) ON DELETE CASCADE, -- 対象のクリップ（任意）
  amount INT, -- giftの場合のコイン量
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. send_gift 関数をアップデートし、投げ銭時に自動で通知を送るようにする
CREATE OR REPLACE FUNCTION send_gift(
  p_sender UUID, p_receiver UUID, p_clip_id BIGINT, p_amount INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_balance INT;
  v_fee INT;
BEGIN
  -- 送信者の残高確認とロック
  SELECT coins INTO v_balance FROM wallets WHERE user_id = p_sender FOR UPDATE;
  
  -- ウォレットが存在しない場合は0コインとする
  IF v_balance IS NULL THEN
    v_balance := 0;
    INSERT INTO wallets (user_id, coins) VALUES (p_sender, 0);
  END IF;

  -- 残高不足
  IF v_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  v_fee := (p_amount * 30) / 100; -- 30% プラットフォーム手数料

  -- 送信者のコインを減らす
  UPDATE wallets SET coins = coins - p_amount, total_spent = total_spent + p_amount WHERE user_id = p_sender;

  -- 受信者の収益を増やす
  INSERT INTO creator_earnings (user_id, total_earned, available_balance)
  VALUES (p_receiver, p_amount - v_fee, p_amount - v_fee)
  ON CONFLICT (user_id) DO UPDATE
    SET total_earned = creator_earnings.total_earned + (p_amount - v_fee),
        available_balance = creator_earnings.available_balance + (p_amount - v_fee);

  -- 取引履歴を記録
  INSERT INTO transactions (sender_id, receiver_id, clip_id, type, amount, platform_fee)
  VALUES (p_sender, p_receiver, p_clip_id, 'gift', p_amount, v_fee);

  -- ★追加: 受信者に通知を送る
  INSERT INTO notifications (user_id, actor_id, type, clip_id, amount)
  VALUES (p_receiver, p_sender, 'gift', p_clip_id, p_amount);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. likes 関数をアップデートし、いいね時に自動で通知を送る（自分へのいいねは除く）
CREATE OR REPLACE FUNCTION toggle_like(
  p_user_id UUID, p_clip_id BIGINT, p_clip_owner_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM likes WHERE user_id = p_user_id AND clip_id = p_clip_id) INTO v_exists;
  
  IF v_exists THEN
    DELETE FROM likes WHERE user_id = p_user_id AND clip_id = p_clip_id;
    UPDATE clips SET likes = GREATEST(0, likes - 1) WHERE id = p_clip_id;
    RETURN FALSE; -- Unlike
  ELSE
    INSERT INTO likes (user_id, clip_id) VALUES (p_user_id, p_clip_id);
    UPDATE clips SET likes = likes + 1 WHERE id = p_clip_id;
    
    -- ★追加: いいねしたのが自分自身でなければ通知を送る
    IF p_user_id != p_clip_owner_id THEN
      -- 重複通知を防ぐ（既に同じ人からいいね通知があれば日時だけ更新）
      INSERT INTO notifications (user_id, actor_id, type, clip_id)
      VALUES (p_clip_owner_id, p_user_id, 'like', p_clip_id);
    END IF;
    
    RETURN TRUE; -- Like
  END IF;
END;
$$ LANGUAGE plpgsql;
