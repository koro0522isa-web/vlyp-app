"use client";

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Crown, ChevronLeft, ChevronRight, Send, Eye } from 'lucide-react';
import Link from 'next/link';

interface StoryItem {
  id: number;
  user_id: string;
  media_url: string;
  thumbnail_url?: string;
  type: 'image' | 'video';
  caption?: string;
  game_tag?: string;
  views: number;
  view_count?: number;
  created_at: string;
  expires_at: string;
}

interface StoryCreator {
  user_id: string;
  profile: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
    is_pro?: boolean;
    is_verified?: boolean;
  };
  stories: StoryItem[];
  latest_at: string;
}

export default function StoriesBar() {
  const [creators, setCreators] = useState<StoryCreator[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewingCreatorIdx, setViewingCreatorIdx] = useState<number | null>(null);
  const [viewingStoryIdx, setViewingStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });
    fetchStories();
  }, []);

  const fetchStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select(`
        id, user_id, media_url, thumbnail_url, type, caption, game_tag, views, created_at, expires_at,
        profiles:user_id (display_name, username, avatar_url, is_pro, is_verified)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(200);

    if (!data) return;

    const grouped: Record<string, StoryCreator> = {};
    for (const s of data) {
      const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
      if (!grouped[s.user_id]) {
        grouped[s.user_id] = { user_id: s.user_id, profile: profile ?? {}, stories: [], latest_at: s.created_at };
      }
      grouped[s.user_id].stories.push({
        id: s.id,
        user_id: s.user_id,
        media_url: s.media_url,
        thumbnail_url: s.thumbnail_url,
        type: s.type,
        caption: s.caption,
        game_tag: s.game_tag,
        views: s.views,
        created_at: s.created_at,
        expires_at: s.expires_at,
      });
    }

    // 自分のストーリーを先頭に
    const list = Object.values(grouped).sort((a, b) => {
      if (currentUser && a.user_id === currentUser.id) return -1;
      if (currentUser && b.user_id === currentUser.id) return 1;
      return 0;
    });
    setCreators(list);
  };

  // ストーリー閲覧開始
  const openStory = (creatorIdx: number, storyIdx = 0) => {
    setViewingCreatorIdx(creatorIdx);
    setViewingStoryIdx(storyIdx);
    setProgress(0);
    startProgress(creatorIdx, storyIdx);
    // 閲覧記録
    const story = creators[creatorIdx]?.stories[storyIdx];
    if (story && currentUser) {
      supabase.rpc('view_story', { p_story_id: story.id }).then(() => {});
    }
  };

  const closeStory = () => {
    setViewingCreatorIdx(null);
    if (progressTimer.current) clearInterval(progressTimer.current);
  };

  const startProgress = (creatorIdx: number, storyIdx: number) => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgress(0);
    const story = creators[creatorIdx]?.stories[storyIdx];
    const duration = story?.type === 'video' ? 15000 : 5000; // 動画15秒、画像5秒
    const step = 100 / (duration / 100);
    progressTimer.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          goNextStory(creatorIdx, storyIdx);
          return 0;
        }
        return p + step;
      });
    }, 100);
  };

  const goNextStory = (creatorIdx: number, storyIdx: number) => {
    const creator = creators[creatorIdx];
    if (!creator) return;
    if (storyIdx < creator.stories.length - 1) {
      openStory(creatorIdx, storyIdx + 1);
    } else if (creatorIdx < creators.length - 1) {
      openStory(creatorIdx + 1, 0);
    } else {
      closeStory();
    }
  };

  const goPrevStory = () => {
    if (viewingCreatorIdx === null) return;
    if (viewingStoryIdx > 0) {
      openStory(viewingCreatorIdx, viewingStoryIdx - 1);
    } else if (viewingCreatorIdx > 0) {
      const prev = viewingCreatorIdx - 1;
      openStory(prev, creators[prev].stories.length - 1);
    }
  };

  // ストーリー投稿
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setIsUploading(true);
    try {
      const mediaType = file.type.startsWith('video') ? 'video' : 'image';
      // Get presigned URL from R2 upload API
      const session = (await supabase.auth.getSession()).data.session;
      const authToken = session?.access_token ?? '';
      const { uploadUrl, publicUrl } = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ filename: file.name, contentType: file.type, type: 'story' }),
      }).then(r => r.json());
      if (!uploadUrl) throw new Error('Failed to get upload URL');
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      await supabase.from('stories').insert({
        user_id: currentUser.id,
        media_url: publicUrl,
        type: mediaType,
      });
      fetchStories();
    } catch (err) {
      console.error(err);
      alert('投稿に失敗しました');
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const viewing = viewingCreatorIdx !== null ? creators[viewingCreatorIdx] : null;
  const viewingStory = viewing?.stories[viewingStoryIdx];
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}分前`;
    return `${h}時間前`;
  };

  return (
    <>
      {/* ストーリーズバー */}
      <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto no-scrollbar">
        {/* 自分のストーリー追加ボタン */}
        {currentUser && (
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-dashed border-zinc-600 hover:border-zinc-400 flex items-center justify-center transition-all relative"
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-6 h-6 text-zinc-400" />
              )}
            </button>
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wide">追加</span>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {/* クリエイターのストーリー */}
        {creators.map((creator, idx) => {
          const isMe = currentUser?.id === creator.user_id;
          const name = creator.profile?.display_name || creator.profile?.username || 'User';
          return (
            <div key={creator.user_id} className="flex-shrink-0 flex flex-col items-center gap-1.5">
              <button
                onClick={() => openStory(idx)}
                className="relative"
              >
                <div className={`w-16 h-16 rounded-full p-[2px] ${creator.profile?.is_pro ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500' : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500'}`}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900">
                    {creator.profile?.avatar_url ? (
                      <img src={creator.profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-black text-white">
                        {name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                {creator.profile?.is_pro && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Crown className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
                <span className="absolute top-0 right-0 bg-blue-500 text-white text-[8px] font-black px-1 rounded-full">
                  {creator.stories.length}
                </span>
              </button>
              <span className="text-[9px] font-bold text-zinc-400 max-w-[64px] truncate text-center">
                {isMe ? '自分' : name}
              </span>
            </div>
          );
        })}

        {creators.length === 0 && !currentUser && (
          <p className="text-[10px] text-zinc-600 px-2">ログインしてストーリーを投稿しよう</p>
        )}
      </div>

      {/* ストーリー閲覧モーダル */}
      <AnimatePresence>
        {viewingCreatorIdx !== null && viewing && viewingStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
          >
            {/* プログレスバー */}
            <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
              {viewing.stories.map((s, i) => (
                <div key={s.id} className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-none"
                    style={{ width: i < viewingStoryIdx ? '100%' : i === viewingStoryIdx ? `${progress}%` : '0%' }}
                  />
                </div>
              ))}
            </div>

            {/* ヘッダー */}
            <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-white/20">
                  {viewing.profile?.avatar_url ? (
                    <img src={viewing.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-black text-white">
                      {(viewing.profile?.display_name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    {viewing.profile?.display_name || viewing.profile?.username}
                    {viewing.profile?.is_pro && <Crown className="inline w-3 h-3 text-yellow-400 ml-1" />}
                  </p>
                  <p className="text-[10px] text-white/50">{timeAgo(viewingStory.created_at)}</p>
                </div>
              </div>
              <button onClick={closeStory} className="p-2 text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* メディア */}
            <div className="w-full max-w-sm aspect-[9/16] relative overflow-hidden rounded-2xl bg-zinc-900">
              {viewingStory.type === 'video' ? (
                <video
                  ref={videoRef}
                  src={viewingStory.media_url}
                  autoPlay
                  playsInline
                  muted
                  loop={false}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src={viewingStory.media_url} alt="" className="w-full h-full object-cover" />
              )}
              {viewingStory.caption && (
                <div className="absolute bottom-16 left-0 right-0 px-4">
                  <p className="text-white font-bold text-sm text-center drop-shadow-lg bg-black/40 rounded-xl px-3 py-2">
                    {viewingStory.caption}
                  </p>
                </div>
              )}
              {viewingStory.game_tag && (
                <div className="absolute top-16 left-4">
                  <span className="text-[10px] font-black bg-black/50 text-white px-3 py-1 rounded-full border border-white/20">
                    🎮 {viewingStory.game_tag}
                  </span>
                </div>
              )}
            </div>

            {/* 左右クリックで前後へ */}
            <button
              onClick={goPrevStory}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-24 flex items-center justify-center text-white/40 hover:text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => goNextStory(viewingCreatorIdx, viewingStoryIdx)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-24 flex items-center justify-center text-white/40 hover:text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* 視聴数（自分のストーリーのみ） */}
            {currentUser?.id === viewing?.stories[viewingStoryIdx]?.user_id && (
              <div className="absolute bottom-16 left-0 right-0 flex justify-center">
                <span className="text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full">
                  <Eye className="w-3 h-3 inline mr-1" />
                  {viewing?.stories[viewingStoryIdx]?.view_count ?? 0}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
