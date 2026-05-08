-- ==========================================
-- Phase 9: 出金申請システム (Payout Infrastructure)
-- ==========================================

-- 1. 出金申請テーブルの作成
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 1000), -- 最低1000円から
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  bank_info TEXT, -- 振込先情報（暗号化推奨だが、初期はテキスト）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RLSの設定
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- 自分の申請のみ閲覧可能
CREATE POLICY "Users can view their own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  USING (auth.uid() = user_id);

-- 申請の作成（自分のみ）
CREATE POLICY "Users can create their own withdrawal requests"
  ON withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. 出金申請時の残高チェックと仮押さえを行うRPC (安全な出金)
CREATE OR REPLACE FUNCTION request_withdrawal(p_user_id UUID, p_amount INTEGER, p_bank_info TEXT)
RETURNS JSON AS $$
DECLARE
  v_current_earnings INTEGER;
BEGIN
  -- 現在の収益残高を取得
  SELECT amount INTO v_current_earnings FROM creator_earnings WHERE user_id = p_user_id;
  
  IF v_current_earnings < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient earnings balance');
  END IF;

  -- 収益から引き去り
  UPDATE creator_earnings 
  SET amount = amount - p_amount 
  WHERE user_id = p_user_id;

  -- 出金申請レコードを作成
  INSERT INTO withdrawal_requests (user_id, amount, bank_info, status)
  VALUES (p_user_id, p_amount, p_bank_info, 'pending');

  RETURN json_build_object('success', true, 'message', 'Withdrawal request submitted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
