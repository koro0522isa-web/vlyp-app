-- ============================================================
-- Phase 41: バグ修正マイグレーション
-- Supabase SQL Editor で実行してください
-- ============================================================

-- ============================================================
-- 1. get_chat_partners RPC（DMページが呼び出す）
-- ============================================================
CREATE OR REPLACE FUNCTION get_chat_partners(p_user_id uuid)
RETURNS TABLE (
  partner_id      uuid,
  display_name    text,
  username        text,
  avatar_url      text,
  last_message    text,
  last_message_at timestamptz,
  unread_count    bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  WITH latest AS (
    SELECT
      CASE WHEN sender_id = p_user_id THEN receiver_id ELSE sender_id END AS partner_id,
      content,
      created_at,
      CASE WHEN receiver_id = p_user_id AND is_read = false THEN 1 ELSE 0 END AS is_unread
    FROM messages
    WHERE sender_id = p_user_id OR receiver_id = p_user_id
  ),
  ranked AS (
    SELECT *,
      ROW_NUMBER() OVER (PARTITION BY partner_id ORDER BY created_at DESC) AS rn,
      SUM(is_unread)  OVER (PARTITION BY partner_id)                       AS unread_count
    FROM latest
  )
  SELECT
    r.partner_id,
    p.display_name,
    p.username,
    p.avatar_url,
    r.content          AS last_message,
    r.created_at       AS last_message_at,
    r.unread_count
  FROM ranked r
  JOIN profiles p ON p.id = r.partner_id
  WHERE r.rn = 1
  ORDER BY r.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION get_chat_partners(uuid) TO authenticated;

-- ============================================================
-- 2. increment_wallet_coins RPC
-- ============================================================
CREATE OR REPLACE FUNCTION increment_wallet_coins(p_user_id uuid, p_amount int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO wallets (user_id, coins)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET coins = wallets.coins + EXCLUDED.coins,
                updated_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION increment_wallet_coins(uuid, int) TO service_role;

-- ============================================================
-- 3. profiles カラム追加
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS pro_activated_at        timestamptz,
  ADD COLUMN IF NOT EXISTS monthly_uploads         int DEFAULT 0;

-- ============================================================
-- 4. wallets カラム追加
-- ============================================================
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ============================================================
-- 5. memberships カラム追加 + UNIQUE制約
-- ============================================================
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS started_at             timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at             timestamptz DEFAULT now();

ALTER TABLE memberships
  DROP CONSTRAINT IF EXISTS memberships_user_creator_unique;
ALTER TABLE memberships
  ADD CONSTRAINT memberships_user_creator_unique UNIQUE (user_id, creator_id);

-- ============================================================
-- 6. messages インデックス強化
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
  ON messages (receiver_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages (sender_id, receiver_id, created_at DESC);

-- ============================================================
-- 7. creator_leaderboard VIEW
-- ============================================================
CREATE OR REPLACE VIEW creator_leaderboard AS
SELECT
  p.id           AS user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.is_pro,
  COALESCE(SUM(c.views_count), 0)                                         AS total_views,
  COALESCE(SUM(CASE WHEN c.created_at >= date_trunc('month', now())
                    THEN c.views_count ELSE 0 END), 0)                   AS monthly_views,
  COALESCE(SUM(c.likes_count), 0)                                         AS total_likes,
  COUNT(DISTINCT f.follower_id)                                           AS follower_count
FROM profiles p
LEFT JOIN clips   c ON c.user_id = p.id AND c.status = 'published'
LEFT JOIN follows f ON f.following_id = p.id
WHERE p.username IS NOT NULL
GROUP BY p.id, p.username, p.display_name, p.avatar_url, p.is_pro;

-- ============================================================
-- 完了確認
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 41 migration complete!';
END $$;
