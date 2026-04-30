"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import { MessageCircle, Heart, Share2, Play, Flame, Trophy, Check, Loader2, Search, X, Link as LinkIcon, Lock, MapPin, ExternalLink, Calendar, Plus, Crown, Star, ChevronLeft, ChevronRight, Video, Send, Gamepad2, AlertTriangle, Gift } from 'lucide-react';
import AdSlot from './components/AdSlot';
import { useLanguage } from './contexts/LanguageContext';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import TikTokPlayer from './components/TikTokPlayer';

export default function Home() {
  const [clips, setClips] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [vlypId, setVlypId] = useState<string>('Player');
  
  // デイリーミッションの状態
  const [dailyViews, setDailyViews] = useState(0);
  const [isRewarded, setIsRewarded] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageOffset, setPageOffset] = useState(0);
  const LIMIT = 5;

  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const [userLikes, setUserLikes] = useState<number[]>([]);
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [currentClipComments, setCurrentClipComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentClipId, setCommentClipId] = useState<number | null>(null);
  const [commentClipOwnerId, setCommentClipOwnerId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null); // { id: number, vlyp_id: string }
  const { t } = useLanguage();

  const [likeAnimation, setLikeAnimation] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // 支援者ランキング
  const [topSupporters, setTopSupporters] = useState<any[]>([]);

  const viewedVideos = useRef<Set<number>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);

  const getYouTubeId = (url: any) => {
    if (!url || typeof url !== 'string') return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    setPageOffset(0);
    setClips([]);
    setHasMore(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
        setVlypId(profile?.display_name || profile?.username || profile?.vlyp_id || 'Player');
        const { data: likes } = await supabase.from('likes').select('clip_id').eq('user_id', currentUser.id);
        if (likes) setUserLikes(likes.map(l => l.clip_id));

        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id);
        if (following) setFollowingIds(following.map(f => f.following_id));
      }

      await fetchClips(0, currentUser?.id);
      
      if (currentUser) {
        // Use JST date for daily missions
        const jstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { data: m } = await supabase.from('daily_user_missions').select('*').eq('user_id', currentUser.id).eq('target_date', jstDate).maybeSingle();
        if (m) {
          setDailyViews(m.views_count);
          setIsRewarded(m.is_rewarded);
        }
      }

      const { data: topClips } = await supabase
        .from('clips')
        .select('*')
        .neq('status', 'banned')
        .order('views', { ascending: false })
        .limit(5);
      if (topClips) setRanking(topClips);

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClips = async (offset: number, userId: string | null = user?.id) => {
    if (!hasMore && offset !== 0) return;
    setIsFetchingMore(true);

    try {
      let finalClips = [];
      
      // Phase 3: AIパーソナライズド・フィード
      if (userId && feedMode === 'all' && offset === 0) {
        const { data: pref } = await supabase.from('user_preferences').select('preference_vector').eq('user_id', userId).maybeSingle();
        if (pref?.preference_vector) {
          const { data: aiClips } = await supabase.rpc('match_clips', {
            query_embedding: pref.preference_vector,
            similarity_threshold: 0.2,
            match_count: LIMIT,
            excluded_user_id: userId
          });
          if (aiClips && aiClips.length > 0) {
            finalClips = aiClips.map((c: any) => ({
              ...c,
              profiles: { 
                display_name: c.profile_display_name || 'Player',
                is_pro: c.is_pro || false
              }
            }));
          }
        }
      }

      // 通常の取得 (AIが足りない場合や2ページ目以降)
      if (finalClips.length < LIMIT) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_feed', {
          p_limit: LIMIT,
          p_offset: offset,
          p_user_id: userId || null,
          p_mode: feedMode
        });

        if (!rpcError && rpcData) {
          const rpcClips = rpcData.map((clip: any) => ({
            ...clip,
            profiles: {
              display_name: clip.profile_display_name || clip.user_name || 'Player',
              username: clip.profile_username,
              is_pro: clip.is_pro || false
            }
          }));
          const existingIds = new Set(finalClips.map((c: any) => c.id));
          finalClips = [...finalClips, ...rpcClips.filter((c: any) => !existingIds.has(c.id))];
        }
      }

      if (finalClips.length === 0) setHasMore(false);
      const newBatch = finalClips.slice(0, LIMIT);
      if (offset === 0) setClips(newBatch);
      else setClips(prev => [...prev, ...newBatch]);
      setPageOffset(offset + LIMIT);
    } catch (e) {
      console.error("Error fetching clips:", e);
    } finally {
      setIsFetchingMore(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchInitialData(); }, [feedMode]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isFetchingMore && !isLoading) {
        fetchClips(pageOffset);
      }
    }, { threshold: 0.1 });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, isLoading, pageOffset]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          const id = Number(entry.target.getAttribute('data-clip-id'));
          setActiveVideoId(id);
          if (!viewedVideos.current.has(id)) {
            viewedVideos.current.add(id);
            // 通常の再生数カウント
            supabase.rpc('increment_view_count', { p_clip_id: id, p_user_id: user?.id || null });
            // デイリーミッション用の視聴カウント
            if (user) {
              supabase.rpc('increment_daily_views').then(() => {
                setDailyViews(prev => prev + 1);
              });
            }
          }
        }
      });
    }, { threshold: [0.6] });
    document.querySelectorAll('.video-section').forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [clips, user]);

  // アクティブなクリップの所有者のトップサポーターを取得
  useEffect(() => {
    if (activeVideoId) {
      const clip = clips.find(c => c.id === activeVideoId);
      if (clip) {
        supabase.rpc('get_top_supporters', { p_creator_id: clip.user_id, p_limit: 3 })
          .then(({ data }) => {
            if (data) setTopSupporters(data);
          });
      }
    }
  }, [activeVideoId, clips]);

  const claimReward = async () => {
    if (!user || isRewarded || dailyViews < 10) return;
    const { data } = await supabase.rpc('claim_daily_reward');
    if (data?.success) {
      setIsRewarded(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22d3ee', '#818cf8', '#fbbf24']
      });
      alert(t('mission.rewarded') || data.message);
    }
  };

  const handleLike = async (clipId: number, clipOwnerId: string) => {
    if (!user) return alert(t('auth.loginRequired') || 'Please log in');
    const isLiked = userLikes.includes(clipId);
    if (!isLiked) {
      setLikeAnimation(clipId);
      setTimeout(() => setLikeAnimation(null), 800);
    }
    setUserLikes(prev => isLiked ? prev.filter(id => id !== clipId) : [...prev, clipId]);
    setClips(prev => prev.map(c => c.id === clipId ? { ...c, likes: Math.max(0, (c.likes || 0) + (isLiked ? -1 : 1)) } : c));
    await supabase.rpc('toggle_like', { p_user_id: user.id, p_clip_id: clipId, p_clip_owner_id: clipOwnerId });
    
    // AI推奨エンジンの学習: 好みを更新
    if (!isLiked) {
      updateUserPreference(clipId);
    }
  };

  const updateUserPreference = async (clipId: number) => {
    if (!user) return;
    
    // 1. クリップのベクトルを取得
    const { data: clip } = await supabase.from('clips').select('embedding').eq('id', clipId).single();
    if (!clip?.embedding) return;

    // 2. 現在のユーザーの好みベクトルを取得
    const { data: pref } = await supabase.from('user_preferences').select('preference_vector').eq('user_id', user.id).maybeSingle();
    
    let newVector;
    if (!pref?.preference_vector) {
      // 初めての場合はそのまま保存
      newVector = clip.embedding;
    } else {
      // 既存のベクトルと混ぜる (移動平均: 既存 0.8 / 新規 0.2)
      // シンプルな数値計算として実装
      const current = JSON.parse(pref.preference_vector as any);
      const target = JSON.parse(clip.embedding as any);
      newVector = current.map((val: number, i: number) => (val * 0.8) + (target[i] * 0.2));
    }

    // 3. 更新
    await supabase.from('user_preferences').upsert({
      user_id: user.id,
      preference_vector: newVector,
      updated_at: new Date().toISOString()
    });
  };

  const renderTitle = (title: string) => {
    if (!title) return null;
    const parts = title.split(/(#[^\s#]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) return <Link key={i} href={`/search?q=${encodeURIComponent(part)}`} className="text-blue-400 hover:text-blue-300 transition-colors pointer-events-auto">{part}</Link>;
      return <span key={i}>{part}</span>;
    });
  };

  const handleReport = async (clipId: number) => {
    if (!user) return alert(t('auth.loginRequired') || 'Please log in');
    const reason = window.prompt(t('action.reportReason') || 'Enter the reason for this report:');
    if (!reason) return;
    await supabase.rpc('submit_report', { p_clip_id: clipId, p_reporter_id: user.id, p_reason: reason });
    alert(t('action.reportSubmitted') || 'Report submitted.');
  };

  const handleFollow = async (targetId: string) => {
    if (!user) return alert(t('auth.loginRequired') || 'Please log in');
    if (user.id === targetId) return;
    
    const isFollowing = followingIds.includes(targetId);
    setFollowingIds(prev => isFollowing ? prev.filter(id => id !== targetId) : [...prev, targetId]);
    await supabase.rpc('toggle_follow', { p_follower_id: user.id, p_following_id: targetId });
  };

  const handleGift = async (clip: any) => {
    if (!user) return alert(t('auth.loginRequired') || 'Please log in');
    if (user.id === clip.user_id) return alert(t('gift.cantSelf') || 'Cannot gift your own clip');
    const amountStr = window.prompt(t('gift.howMany') || 'How many VLYP coins to gift?');
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return alert(t('gift.invalidAmount') || 'Invalid amount');
    const { data, error } = await supabase.rpc('send_gift', { p_sender: user.id, p_receiver: clip.user_id, p_clip_id: clip.id, p_amount: amount });
    if (error || !data) {
      if (window.confirm(t('gift.insufficientCoins') || 'Insufficient coins. Go to coin shop?')) window.location.href = '/coins';
    } else {
      confetti({
        particleCount: 200,
        spread: 160,
        origin: { y: 0.7 },
        colors: ['#facc15', '#fde047', '#ffffff'],
        shapes: ['star'],
      });
      alert(`${amount} ${t('gift.sent') || 'coins gifted!'} 🎉`);
    }
  };

  const handleShare = async (clip: any) => {
    const url = `${window.location.origin}/clip/${clip.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(clip.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(clip.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const openComments = async (clipId: number, clipOwnerId: string) => {
    setIsCommentOpen(true);
    setCommentClipId(clipId);
    setCommentClipOwnerId(clipOwnerId);
    const { data } = await supabase.from('comments').select('*').eq('clip_id', clipId).order('created_at', { ascending: false });
    if (data) setCurrentClipComments(data);
  };

  const postComment = async () => {
    if (!user || !newComment.trim() || !commentClipId || !commentClipOwnerId) return;
    setIsCommenting(true);
    const { data } = await supabase.from('comments').insert({ 
      clip_id: commentClipId, 
      user_id: user.id, 
      vlyp_id: vlypId, 
      content: newComment,
      parent_id: replyingTo?.id || null 
    }).select().single();
    if (data) {
      setCurrentClipComments(prev => [data, ...prev]);
      setNewComment('');
      setReplyingTo(null);
    }
    setIsCommenting(false);
  };

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black relative">
        <div className="sticky top-0 z-30 flex items-center justify-center gap-1 py-3 bg-black/80 backdrop-blur-xl">
          <button onClick={() => setFeedMode('all')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${feedMode === 'all' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>FOR YOU</button>
          <button onClick={() => setFeedMode('following')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${feedMode === 'following' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>FOLLOWING</button>
        </div>
        <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar">
          {clips.map((clip, index) => {
            const isNearActive = Math.abs(index - clips.findIndex(c => c.id === activeVideoId)) <= 2;
            return (
              <motion.div 
                key={clip.id} 
                id={`clip-${clip.id}`}
                data-clip-id={clip.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="video-section h-full w-full snap-start relative"
              >
                {/* 
                   パフォーマンス最適化: 
                   現在のアクティブ動画、およびその前後2つまでの動画のみをレンダリング対象にし、
                   それ以外はメモリ節約のために非表示にします。
                */}
                {isNearActive ? (
                  <TikTokPlayer 
                    clip={clip}
                    isActive={activeVideoId === clip.id}
                    userLikes={userLikes}
                    onLike={handleLike}
                    onComment={openComments}
                    onShare={handleShare}
                    onGift={handleGift}
                    onFollow={handleFollow}
                    renderTitle={renderTitle}
                    isCopied={copiedId === clip.id}
                    isFollowing={followingIds.includes(clip.user_id)}
                  />
                ) : (
                  <div className="h-full w-full bg-black flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
                  </div>
                )}
                {(index + 1) % 5 === 0 && <AdSlot />}
              </motion.div>
            );
          })}

          {/* Empty State */}
          {!isLoading && clips.length === 0 && (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-black">
              <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                <Video className="w-10 h-10 text-zinc-600" />
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">No Clips Yet</h2>
              <p className="text-sm font-bold text-zinc-500 mb-8 max-w-xs">Be the first to share your epic gaming moments with the world.</p>
              <Link href="/post" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                Upload Video
              </Link>
            </div>
          )}

          {hasMore && !isLoading && clips.length > 0 && <div ref={observerTarget} className="w-full h-32 flex items-center justify-center snap-start"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}
        </div>
        {isLoading && <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10" /></div>}
      </main>
      <aside className="w-80 lg:w-96 border-l border-white/5 bg-[#09090B] p-10 hidden xl:flex flex-col flex-shrink-0">
        {/* Daily Mission */}
        {user && (
          <div className="mb-12 bg-gradient-to-br from-blue-600/20 to-purple-600/10 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{t('mission.title')}</h2>
            </div>
            <p className="text-sm font-bold text-zinc-300 mb-4">{t('mission.goal')}</p>
            <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden mb-4">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000 rounded-full" 
                style={{ width: `${Math.min(100, (dailyViews / 10) * 100)}%` }}
              />
              {dailyViews > 0 && dailyViews < 10 && (
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg pulse-glow transition-all duration-1000"
                  style={{ left: `calc(${Math.min(100, (dailyViews / 10) * 100)}% - 6px)` }}
                />
              )}
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase">{dailyViews} / 10</span>
                {dailyViews >= 3 && <span className="text-[10px] font-black text-orange-400 fire-text">🔥 {dailyViews} streak</span>}
              </div>
              {dailyViews >= 10 && !isRewarded ? (
                <button 
                  onClick={claimReward}
                  className="bg-yellow-400 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter hover:scale-105 transition-all shadow-[0_0_15px_rgba(250,204,21,0.3)] pulse-glow"
                >
                  {t('mission.claim')}
                </button>
              ) : isRewarded ? (
                <span className="text-[10px] font-black text-emerald-400 uppercase flex items-center gap-1">
                  <Check className="w-3 h-3" /> {t('mission.completed')}
                </span>
              ) : null}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-10"><Flame className="w-5 h-5 text-orange-500" /><h2 className="text-xs font-black uppercase tracking-widest text-zinc-100">Trending</h2></div>
        <div className="space-y-8 mb-12">
          {ranking.map((item, index) => (
            <Link key={item.id} href={`/profile/${item.user_id}`} className="flex gap-5 items-center group cursor-pointer">
              <span className="text-3xl font-black italic text-zinc-800 group-hover:text-blue-500">{index + 1}</span>
              <div className="min-w-0"><p className="text-xs font-black text-zinc-200 truncate group-hover:text-blue-400 uppercase mb-1">{item.title}</p><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">{item.views || 0} Views</p></div>
            </Link>
          ))}
        </div>

        {/* Top Supporters of Current Creator */}
        {topSupporters.length > 0 && (
          <div className="mt-auto pt-10 border-t border-white/5">
            <div className="flex items-center gap-3 mb-8">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{t('studio.topSupporters')}</h2>
            </div>
            <div className="space-y-6">
              {topSupporters.map((s, i) => (
                <div key={s.supporter_id} className="flex items-center gap-4 group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border ${i === 0 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : i === 1 ? 'bg-zinc-300/20 border-zinc-300 text-zinc-300' : 'bg-orange-600/20 border-orange-600 text-orange-500'}`}>
                    {i === 0 ? '1' : i === 1 ? '2' : '3'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-zinc-200 truncate uppercase">@{s.display_name}</p>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase">{s.total_amount} Coins</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
      {isCommentOpen && (
        <div className="fixed inset-y-0 right-0 w-full lg:w-[450px] bg-[#09090B]/98 backdrop-blur-3xl border-l border-white/10 z-[100] flex flex-col">
          <div className="p-8 border-b border-white/5 flex items-center justify-between"><h3 className="font-black uppercase tracking-widest text-xs text-blue-400">Live Chat</h3><button onClick={() => setIsCommentOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-zinc-400"><X className="w-6 h-6" /></button></div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
            {currentClipComments.filter(c => !c.parent_id).map((c) => (
              <div key={c.id} className="space-y-6">
                <div className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center font-black border border-white/10 text-[10px] uppercase text-zinc-300">
                    {c.vlyp_id?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[10px] font-black text-blue-500 uppercase">@{c.vlyp_id}</p>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium mb-2">{c.content}</p>
                    <button 
                      onClick={() => {
                        setReplyingTo({ id: c.id, vlyp_id: c.vlyp_id });
                        setNewComment(`@${c.vlyp_id} `);
                      }}
                      className="text-[9px] font-black text-zinc-500 uppercase hover:text-blue-400 transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                </div>
                
                {/* Replies */}
                {currentClipComments.filter(reply => reply.parent_id === c.id).map(reply => (
                  <div key={reply.id} className="flex gap-4 ml-12 group">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex-shrink-0 flex items-center justify-center font-black border border-white/5 text-[8px] uppercase text-zinc-500">
                      {reply.vlyp_id?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[9px] font-black text-zinc-400 uppercase">@{reply.vlyp_id}</p>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed font-medium">{reply.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="p-8 border-t border-white/5 relative flex flex-col gap-4 bg-black/50">
            {replyingTo && (
              <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl">
                <p className="text-[10px] font-black text-blue-400 uppercase">Replying to @{replyingTo.vlyp_id}</p>
                <button onClick={() => setReplyingTo(null)}><X className="w-4 h-4 text-zinc-500" /></button>
              </div>
            )}
            <div className="relative flex items-center">
              <input type="text" placeholder={replyingTo ? "Write a reply..." : "Type a message..."} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 pr-16 text-sm focus:outline-none focus:border-blue-500/50" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postComment()} />
              <button onClick={postComment} className="absolute right-3 p-3 bg-blue-600 rounded-xl text-white">{isCommenting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}