-- ==========================================
-- Phase 18: ストレージ設定（アバター & 動画）
-- ==========================================

-- 1. アバター保存用のバケット（箱）を作成
-- ※SQL Editorから実行する場合、一部の環境ではダッシュボードからの手動作成が必要な場合があります
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. アバター用のアクセス許可 (RLS)
-- 全員：閲覧可能
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- 認証済みユーザー：自分の画像をアップロード可能
CREATE POLICY "Users can upload avatars" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 認証済みユーザー：自分の画像を削除・更新可能
CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. 動画保存用バケットの公開設定（念のため再確認）
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- 動画も誰でも見れるようにする
CREATE POLICY "Public Video Access" ON storage.objects FOR SELECT USING (bucket_id = 'videos');

-- 投稿者本人のみが自分の動画を管理できる
CREATE POLICY "Uploaders can manage their videos" ON storage.objects
  FOR ALL USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
