-- ==========================================
-- Phase 25: ゲーミフィケーション & 収益分配システム
-- ==========================================

-- 1. デイリー視聴統計テーブル
-- 誰が今日何本動画を見たかをカウントします
CREATE TABLE IF NOT EXISTS daily_user_missions (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_date DATE DEFAULT CURRENT_DATE,
  views_count INTEGER DEFAULT 0,
  is_rewarded BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, target_date)
);

-- 2. 還元率の設定 (80/20) を反映したギフト処理
-- 既存の get_revenue_stats 関数などを調整、またはギフト時に分配を計算します。
-- ここではシンプルに clips テーブルに「プラットフォーム収益」を蓄積するカラムを追加検討（オプション）

-- 3. デイリー報酬受け取り用 RPC 関数
-- 10本以上見ていたら、1コインをウォレットに追加します
CREATE OR REPLACE FUNCTION claim_daily_reward()
RETURNS JSON AS $$
DECLARE
  v_count INTEGER;
  v_rewarded BOOLEAN;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'Unauthorized'); END IF;

  -- 今日の視聴数を確認
  SELECT views_count, is_rewarded INTO v_count, v_rewarded
  FROM daily_user_missions
  WHERE user_id = v_user_id AND target_date = CURRENT_DATE;

  IF v_count < 10 THEN
    RETURN json_build_object('success', false, 'message', 'Not enough views (Required: 10)');
  END IF;

  IF v_rewarded THEN
    RETURN json_build_object('success', false, 'message', 'Already rewarded today');
  END IF;

  -- 報酬配布（1コイン）
  UPDATE wallets SET coins = coins + 1 WHERE user_id = v_user_id;
  
  -- フラグ更新
  UPDATE daily_user_missions SET is_rewarded = TRUE 
  WHERE user_id = v_user_id AND target_date = CURRENT_DATE;

  RETURN json_build_object('success', true, 'message', '1 Coin rewarded!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 動画を見たらカウントアップする RPC
CREATE OR REPLACE FUNCTION increment_daily_views()
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  
  INSERT INTO daily_user_missions (user_id, target_date, views_count)
  VALUES (auth.uid(), CURRENT_DATE, 1)
  ON CONFLICT (user_id, target_date)
  DO UPDATE SET views_count = daily_user_missions.views_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 投げ銭機能の更新 (80%還元、20%プラットフォーム手数料)
CREATE OR REPLACE FUNCTION send_gift(p_sender UUID, p_receiver UUID, p_clip_id BIGINT, p_amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_sender_coins INTEGER;
BEGIN
  SELECT coins INTO v_sender_coins FROM wallets WHERE user_id = p_sender FOR UPDATE;
  IF v_sender_coins < p_amount THEN RETURN FALSE; END IF;

  UPDATE wallets SET coins = coins - p_amount WHERE user_id = p_sender;

  -- クリエイターには 80% を付与
  INSERT INTO creator_earnings (user_id, total_earned, available_balance)
  VALUES (p_receiver, p_amount * 0.8, p_amount * 0.8)
  ON CONFLICT (user_id) DO UPDATE SET
    total_earned = creator_earnings.total_earned + (p_amount * 0.8),
    available_balance = creator_earnings.available_balance + (p_amount * 0.8);

  -- 20% はプラットフォーム手数料として記録
  INSERT INTO transactions (sender_id, receiver_id, clip_id, amount, type, platform_fee)
  VALUES (p_sender, p_receiver, p_clip_id, p_amount, 'gift', p_amount * 0.2);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. インデックス
CREATE INDEX IF NOT EXISTS idx_missions_date ON daily_user_missions(target_date);
