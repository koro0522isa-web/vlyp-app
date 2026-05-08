-- ==========================================
-- Phase 14: 最終セキュリティ・ハードニング
-- ==========================================

-- 1. コイン増殖防止：関数の実行権限を剥奪
-- Webhook(service_role)以外からは呼び出せなくする
REVOKE EXECUTE ON FUNCTION increment_wallet_coins(UUID, INTEGER) FROM public;
REVOKE EXECUTE ON FUNCTION increment_wallet_coins(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION increment_wallet_coins(UUID, INTEGER) FROM authenticated;

-- 2. マイナス金額の不正操作防止 (CHECK制約の強化)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS amount_positive;
ALTER TABLE transactions ADD CONSTRAINT amount_positive CHECK (amount > 0);

ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_amount_positive;
ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_amount_positive CHECK (amount > 0);

-- 3. 自作自演の防止
-- 自分に投げ銭できないようにする
CREATE OR REPLACE FUNCTION send_gift(p_sender UUID, p_receiver UUID, p_clip_id BIGINT, p_amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_sender_coins INTEGER;
BEGIN
  -- 不正チェック
  IF p_sender = p_receiver THEN RAISE EXCEPTION 'Cannot gift yourself'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT coins INTO v_sender_coins FROM wallets WHERE user_id = p_sender FOR UPDATE;
  IF v_sender_coins < p_amount THEN RETURN FALSE; END IF;

  UPDATE wallets SET coins = coins - p_amount WHERE user_id = p_sender;

  INSERT INTO creator_earnings (user_id, total_earned, available_balance)
  VALUES (p_receiver, p_amount * 0.7, p_amount * 0.7)
  ON CONFLICT (user_id) DO UPDATE SET
    total_earned = creator_earnings.total_earned + (p_amount * 0.7),
    available_balance = creator_earnings.available_balance + (p_amount * 0.7);

  INSERT INTO transactions (sender_id, receiver_id, clip_id, amount, type, platform_fee)
  VALUES (p_sender, p_receiver, p_clip_id, p_amount, 'gift', p_amount * 0.3);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 重複いいね防止（ランキング操作対策）
-- user_id と clip_id のペアをユニークにする
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_clip_id_key;
ALTER TABLE likes ADD CONSTRAINT likes_user_id_clip_id_key UNIQUE (user_id, clip_id);

-- 5. 出金申請の重複防止
-- 処理中(pending)の申請が1つでもある場合は、新しい申請をできないようにする
CREATE OR REPLACE FUNCTION request_withdrawal(p_user_id UUID, p_amount INTEGER, p_bank_info TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance INTEGER;
  v_pending_count INTEGER;
BEGIN
  -- 不正チェック
  IF p_amount < 1000 THEN RAISE EXCEPTION 'Minimum withdrawal is 1000'; END IF;

  -- 進行中の申請があるかチェック
  SELECT count(*) INTO v_pending_count FROM withdrawal_requests WHERE user_id = p_user_id AND status = 'pending';
  IF v_pending_count > 0 THEN RAISE EXCEPTION 'You already have a pending withdrawal request'; END IF;

  SELECT available_balance INTO v_balance FROM creator_earnings WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_amount THEN RETURN FALSE; END IF;

  UPDATE creator_earnings SET available_balance = available_balance - p_amount WHERE user_id = p_user_id;

  INSERT INTO withdrawal_requests (user_id, amount, bank_info, status)
  VALUES (p_user_id, p_amount, p_bank_info, 'pending');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
