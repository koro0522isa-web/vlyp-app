-- ==========================================
-- VLYP Phase 3 & 4: ゼロコスト・モデレーション & マネタイズ基盤用 SQL
-- ==========================================
-- 以下のSQLをSupabaseのSQL Editorで実行してください。（Phase 2のSQLの後に実行してください）

-- ----------------------------------------------------
-- Phase 4: コミュニティモデレーション強化
-- ----------------------------------------------------
-- 1つのクリップに対して一定数（例: 5回）の通報があった場合、
-- 自動的にステータスを 'review' に変更し、フィードに表示されないようにします。

CREATE OR REPLACE FUNCTION submit_report(
  p_clip_id BIGINT,
  p_reporter_id UUID,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_report_count INT;
BEGIN
  -- 通報を追加
  INSERT INTO reports (clip_id, reporter_id, reason)
  VALUES (p_clip_id, p_reporter_id, p_reason);

  -- このクリップの総通報数をカウント
  SELECT COUNT(*) INTO v_report_count FROM reports WHERE clip_id = p_clip_id;

  -- 5回以上通報されたら自動的にレビュー中（非表示）にする
  IF v_report_count >= 5 THEN
    UPDATE clips SET status = 'review' WHERE id = p_clip_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------
-- Phase 3: マネタイズ基盤（UIモック用・将来の布石）
-- ----------------------------------------------------

-- ウォレットテーブル (ユーザーの所持コイン)
CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  coins INT DEFAULT 0,
  total_spent INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- クリエイター収益テーブル
CREATE TABLE IF NOT EXISTS creator_earnings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  total_earned INT DEFAULT 0,
  available_balance INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 取引履歴
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id),
  receiver_id UUID REFERENCES auth.users(id),
  clip_id BIGINT REFERENCES clips(id),
  type TEXT NOT NULL, -- 'purchase', 'gift', 'withdrawal'
  amount INT NOT NULL,
  platform_fee INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 投げ銭（Gift）処理のRPC（モックではなく、データベース上の数値を動かします）
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

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
