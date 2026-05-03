-- VLYPプラットフォーム完全データベースセットアップ
-- このSQLファイルを順番に実行してください

-- ============================================
-- 1. ユーザー管理と認証関連
-- ============================================

-- プロフィール拡張テーブル
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_pro BOOLEAN DEFAULT FALSE,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- OBS連携用
    obs_host TEXT,
    obs_port INTEGER DEFAULT 4456,
    obs_password TEXT,
    obs_connected BOOLEAN DEFAULT FALSE,
    obs_last_connected TIMESTAMP WITH TIME ZONE,
    
    -- 配信プラットフォーム連携
    youtube_connected BOOLEAN DEFAULT FALSE,
    twitch_connected BOOLEAN DEFAULT FALSE,
    kick_connected BOOLEAN DEFAULT FALSE,
    youtube_channel_id TEXT,
    twitch_channel_id TEXT,
    kick_channel_id TEXT,
    
    -- 収益化設定
    payout_method TEXT DEFAULT 'paypal',
    payout_email TEXT,
    payout_address TEXT,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    pending_payouts DECIMAL(10,2) DEFAULT 0,
    
    -- ストリーミング設定
    streaming_enabled BOOLEAN DEFAULT FALSE,
    stream_key TEXT,
    stream_settings JSONB
);

-- ============================================
-- 2. コンテンツ管理
-- ============================================

-- クリップ動画テーブル（拡張）
ALTER TABLE clips ADD COLUMN IF NOT EXISTS vlyp_scores DECIMAL[];
ALTER TABLE clips ADD COLUMN IF NOT EXISTS vlyp_avg_score DECIMAL DEFAULT 0;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS vlyp_max_score DECIMAL DEFAULT 0;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS vlyp_highlight_count INTEGER DEFAULT 0;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS is_desktop_recording BOOLEAN DEFAULT FALSE;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE clips ADD COLUMN IF NOT EXISTS auto_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS bgm_track_id INTEGER REFERENCES bgm_library(id);
ALTER TABLE clips ADD COLUMN IF NOT EXISTS edit_settings JSONB;

-- ============================================
-- 3. 音楽ライブラリ
-- ============================================

CREATE TABLE IF NOT EXISTS bgm_library (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    url TEXT NOT NULL,
    duration INTEGER NOT NULL,
    genres TEXT[] DEFAULT '{}',
    mood TEXT DEFAULT 'neutral',
    tags TEXT[] DEFAULT '{}',
    bpm INTEGER,
    key TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    active BOOLEAN DEFAULT TRUE,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 音楽ライクテーブル
CREATE TABLE IF NOT EXISTS bgm_likes (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    track_id INTEGER REFERENCES bgm_library(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, track_id)
);

-- ============================================
-- 4. 配信関連
-- ============================================

-- 配信セッションテーブル
CREATE TABLE IF NOT EXISTS streams (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    category TEXT DEFAULT 'Gaming',
    language TEXT DEFAULT 'en',
    is_mature BOOLEAN DEFAULT FALSE,
    platforms TEXT[] NOT NULL,
    status TEXT DEFAULT 'starting', -- starting, live, partial, ended, failed
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    viewer_count INTEGER DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    vlyp_score DECIMAL DEFAULT 0,
    stream_url TEXT,
    recording_url TEXT,
    active_platforms TEXT[] DEFAULT '{}',
    failed_platforms TEXT[] DEFAULT '{}',
    settings JSONB
);

-- 配信分析テーブル
CREATE TABLE IF NOT EXISTS stream_analytics (
    id SERIAL PRIMARY KEY,
    stream_id INTEGER REFERENCES streams(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewer_count INTEGER DEFAULT 0,
    chat_messages INTEGER DEFAULT 0,
    vlyp_score DECIMAL DEFAULT 0,
    platform TEXT
);

-- ============================================
-- 5. 収益化関連
-- ============================================

-- 広告収益テーブル
CREATE TABLE IF NOT EXISTS ad_revenue (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    clip_id INTEGER REFERENCES clips(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    impressions INTEGER DEFAULT 0,
    cpm DECIMAL(10,2) DEFAULT 0,
    date DATE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, paid, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- サブスクリプション収益テーブル
CREATE TABLE IF NOT EXISTS subscription_revenue (
    id SERIAL PRIMARY KEY,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subscriber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    plan_type TEXT NOT NULL, -- pro, premium
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ギフト取引テーブル
CREATE TABLE IF NOT EXISTS gift_transactions (
    id SERIAL PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    gift_type TEXT NOT NULL,
    clip_id INTEGER REFERENCES clips(id),
    stream_id INTEGER REFERENCES streams(id),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- クリップ販売テーブル
CREATE TABLE IF NOT EXISTS clip_sales (
    id SERIAL PRIMARY KEY,
    clip_id INTEGER REFERENCES clips(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 配信収益テーブル
CREATE TABLE IF NOT EXISTS stream_revenue (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    stream_id INTEGER REFERENCES streams(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    avg_viewers INTEGER DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    platform TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- 支払い記録テーブル
CREATE TABLE IF NOT EXISTS payouts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    method TEXT NOT NULL, -- paypal, bank, crypto
    status TEXT DEFAULT 'pending', -- pending, processing, paid, failed
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- 収益記録テーブル
CREATE TABLE IF NOT EXISTS revenue_records (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- ad, subscription, gift, clip, stream
    amount DECIMAL(10,2) NOT NULL,
    metadata JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. パフォーマンス分析
-- ============================================

-- パフォーマンス分析テーブル
CREATE TABLE IF NOT EXISTS performance_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clip_views INTEGER DEFAULT 0,
    clip_likes INTEGER DEFAULT 0,
    clip_comments INTEGER DEFAULT 0,
    stream_minutes INTEGER DEFAULT 0,
    stream_viewers INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    vlyp_avg_score DECIMAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- ============================================
-- 7. インデックス作成
-- ============================================

-- クリップ関連インデックス
CREATE INDEX IF NOT EXISTS idx_clips_vlyp_avg_score ON clips(vlyp_avg_score DESC);
CREATE INDEX IF NOT EXISTS idx_clips_vlyp_max_score ON clips(vlyp_max_score DESC);
CREATE INDEX IF NOT EXISTS idx_clips_is_desktop_recording ON clips(is_desktop_recording);
CREATE INDEX IF NOT EXISTS idx_clips_processing_status ON clips(processing_status);

-- 音楽ライブラリインデックス
CREATE INDEX IF NOT EXISTS idx_bgm_library_genres ON clips USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_bgm_library_mood ON bgm_library(mood);
CREATE INDEX IF NOT EXISTS idx_bgm_library_active ON bgm_library(active);
CREATE INDEX IF NOT EXISTS idx_bgm_library_play_count ON bgm_library(play_count DESC);

-- 配信関連インデックス
CREATE INDEX IF NOT EXISTS idx_streams_user_id ON streams(user_id);
CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status);
CREATE INDEX IF NOT EXISTS idx_streams_started_at ON streams(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_analytics_stream_id ON stream_analytics(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_analytics_timestamp ON stream_analytics(timestamp);

-- 収益化関連インデックス
CREATE INDEX IF NOT EXISTS idx_ad_revenue_user_id ON ad_revenue(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_revenue_date ON ad_revenue(date);
CREATE INDEX IF NOT EXISTS idx_subscription_revenue_creator_id ON subscription_revenue(creator_id);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_receiver_id ON gift_transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- ============================================
-- 8. RLS (Row Level Security) 設定
-- ============================================

-- プロフィールテーブルのRLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

-- 音楽ライブラリのRLS
ALTER TABLE bgm_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active music" ON bgm_library FOR SELECT USING (active = true);
CREATE POLICY "Pro users can upload music" ON bgm_library FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- 配信関連のRLS
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own streams" ON streams FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view live streams" ON streams FOR SELECT USING (status = 'live');

-- 収益化関連のRLS
ALTER TABLE ad_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ad revenue" ON ad_revenue FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payouts" ON payouts FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 9. トリガーと関数
-- ============================================

-- プロフィール更新時刻トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- クリップ再生回数更新関数
CREATE OR REPLACE FUNCTION increment_clip_play_count(clip_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE clips SET play_count = play_count + 1 WHERE id = clip_id_param;
END;
$$ LANGUAGE plpgsql;

-- 音楽再生回数更新関数
CREATE OR REPLACE FUNCTION increment_bgm_play_count(track_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE bgm_library SET play_count = play_count + 1 WHERE id = track_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. 初期データ
-- ============================================

-- BGMライブラリ初期データ
INSERT INTO bgm_library (title, artist, url, duration, genres, mood, tags, bpm) VALUES
('Epic Gaming Moment', 'VLYP Studio', 'https://example.com/music/epic.mp3', 180, ARRAY['Electronic', 'Phonk'], 'epic', ARRAY['gaming', 'intense'], 140),
('Chill Gaming Session', 'Lo-Fi Master', 'https://example.com/music/chill.mp3', 240, ARRAY['Lo-Fi', 'Electronic'], 'chill', ARRAY['relaxed', 'focus'], 85),
('Victory Fanfare', 'GameSound Pro', 'https://example.com/music/victory.mp3', 60, ARRAY['Classical', 'Electronic'], 'happy', ARRAY['win', 'celebration'], 120),
('Dark Underground', 'Phonk Creator', 'https://example.com/music/dark.mp3', 200, ARRAY['Phonk', 'Trap'], 'dark', ARRAY['intense', 'underground'], 150),
('Energy Boost', 'EDM Artist', 'https://example.com/music/energy.mp3', 180, ARRAY['EDM', 'Electronic'], 'energetic', ARRAY['upbeat', 'motivation'], 128)
ON CONFLICT DO NOTHING;

-- ============================================
-- 完了メッセージ
-- ============================================

-- このSQLファイルの実行が完了すると、VLYPプラットフォームの全機能が利用可能になります
-- 次のステップ：APIエンドポイントの有効化とフロントエンドの統合
