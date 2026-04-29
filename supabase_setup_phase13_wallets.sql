-- ==========================================
-- Phase 13: 決済セキュリティとコイン付与システム
-- ==========================================

-- 1. ウォレットテーブルの作成
CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER DEFAULT 0 NOT NULL CHECK (coins >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

-- 2. 新規ユーザー作成時に自動でウォレットを作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, coins)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- 3. 投げ銭時にウォレットから引く機能
CREATE OR REPLACE FUNCTION send_gift(p_sender UUID, p_receiver UUID, p_clip_id BIGINT, p_amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_sender_coins INTEGER;
BEGIN
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

-- 4. ウォレット残高を加算する関数（Webhook用）
CREATE OR REPLACE FUNCTION increment_wallet_coins(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE wallets 
  SET coins = coins + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
