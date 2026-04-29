-- ==========================================
-- Phase 12: クリップ管理（編集・削除）権限の追加
-- ==========================================

-- 1. クリップの編集権限（自分の動画のみ）
DROP POLICY IF EXISTS "Users can update their own clips" ON clips;
CREATE POLICY "Users can update their own clips"
  ON clips FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. クリップの削除権限（自分の動画のみ）
DROP POLICY IF EXISTS "Users can delete their own clips" ON clips;
CREATE POLICY "Users can delete their own clips"
  ON clips FOR DELETE
  USING (auth.uid() = user_id);

-- 3. ストレージの削除権限（自分の動画のみ）
-- すでに設定されている場合が多いですが、念のため強化
-- ※バケット名が 'videos' の場合
CREATE POLICY "Users can delete their own video files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos' AND auth.uid() = owner);
