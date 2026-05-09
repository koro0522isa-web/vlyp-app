"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import { MessageCircle, Heart, Share2, Play, Flame, Trophy, Check, Loader2, Search, X, Link as LinkIcon, Lock, MapPin, ExternalLink, Calendar, Plus, Crown, Star, ChevronLeft, ChevronRight, Video, Send, Gamepad2, AlertTriangle, Gift, Shield, Wifi } from 'lucide-react';
import AdSlot from './components/AdSlot';
import { useLanguage } from './contexts/LanguageContext';
import { useToast } from './contexts/ToastContext';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import TikTokPlayer from './components/TikTokPlayer';
import StoriesBar from './components/StoriesBar';

function HomeContent() {
  const [clips, setClips] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [vlypId, setVlypId] = useState<string>('Player');
  
  // デイリーミッションの状態
  const [dailyViews, setDailyViews] = useState(0);
  const [isRewarded, setIsRewarded] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageOffset, setPageOffset] = useState(0);
  const LIMIT = 5;
  const searchParams = useSearchParams();
  const targetClipId = searchParams.get('clip');

  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const [userLikes, setUserLikes] = useState<number[]>([]);
  const [userSaves, setUserSaves] = useState<number[]>([]);
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // 有料動画 - 解放済みIDセット
  const [unlockedClipIds, setUnlockedClipIds] = useState<Set<number>>(new Set());
  const [isUnlocking, setIsUnlocking] = useState<number | null>(null);

  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [currentClipComments, setCurrentClipComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentClipId, setCommentClipId] = useState<number | null>(null);
  const [commentClipOwnerId, setCommentClipOwnerId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null); // { id: number, vlyp_id: string }
  const { t } = useLanguage();
  const { toast } = useToast();

  const [likeAnimation, setLikeAnimation] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // 支援者ランキング
  const [topSupporters, setTopSupporters] = useState<any[]>([]);

  // 投げ銭モーダル
  const [giftModalClip, setGiftModalClip] = useState<any>(null);
  const [giftAmount, setGiftAmount] = useState<number>(100);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [isGifting, setIsGifting] = useState(false);

  // レポートモーダル
  const [reportModalClipId, setReportModalClipId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const viewedVideos = useRef<Set<number>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);
  /** 同一クリップへのいいね RPC が並列で走ると楽観 UI が壊れるため、進行中クリップ ID を保持する */
  const likeInFlightRef = useRef<Set<number>>(new Set());
  /** View Count バッチ処理用バッファ — 5秒間隔でまとめて送信 */
  const viewBufferRef = useRef<number[]>([]);

  // View Count バッチフラッシュ（5秒間隔）
  useEffect(() => {
    const flush = setInterval(async () => {
      if (viewBufferRef.current.length === 0) return;
      const ids = [...viewBufferRef.current];
      viewBufferRef.current = [];
      try {
        await supabase.rpc('batch_increment_views', { p_clip_ids: ids });
      } catch (err) {
        console.error('Batch view count error:', err);
      }
    }, 5000);
    return () => clearInterval(flush);
  }, []);

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

        // コイン残高取得
        const { data: wallet } = await supabase.from('wallets').select('coins').eq('user_id', currentUser.id).maybeSingle();
        if (wallet) setUserCoins(wallet.coins ?? 0);
        
        // Fetch likes
        const { data: likes } = await supabase.from('clip_likes').select('clip_id').eq('user_id', currentUser.id);
        if (likes) setUserLikes(likes.map(l => l.clip_id));

        // Fetch saves
        const { data: saves } = await supabase.from('clip_saves').select('clip_id').eq('user_id', currentUser.id);
        if (saves) setUserSaves(saves.map(s => s.clip_id));

        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id);
        if (following) setFollowingIds(following.map(f => f.following_id));
      }

      // 特定のクリップが指定されている場合、それを最優先で取得
      let targetedClip = null;
      if (targetClipId) {
        const { data: clip } = await supabase
          .from('clips')
          .select('*, profiles(display_name, username, is_pro)')
          .eq('id', targetClipId)
          .maybeSingle();
        if (clip) targetedClip = clip;
      }

      await fetchClips(0, currentUser?.id, targetedClip);
      
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
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClips = async (offset: number, userId: string | null = user?.id, targetedClip: any = null) => {
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
            const userIds = [...new Set(aiClips.map((c: any) => c.user_id))];
            const { data: profiles } = await supabase.from('profiles').select('id, avatar_url').in('id', userIds);
            const avatarMap: any = {};
            if (profiles) profiles.forEach((p: any) => avatarMap[p.id] = p.avatar_url);

            finalClips = aiClips.map((c: any) => ({
              ...c,
              profiles: { 
                display_name: c.profile_display_name || 'Player',
                is_pro: c.is_pro || false,
                avatar_url: avatarMap[c.user_id] || null
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
          // Fetch avatar_urls separately since get_feed RPC doesn't return them
          const userIds = [...new Set(rpcData.map((c: any) => c.user_id))];
          const { data: profiles } = await supabase.from('profiles').select('id, avatar_url').in('id', userIds);
          const avatarMap: any = {};
          if (profiles) profiles.forEach((p: any) => avatarMap[p.id] = p.avatar_url);

          const rpcClips = rpcData.map((clip: any) => ({
            ...clip,
            profiles: {
              display_name: clip.profile_display_name || clip.user_name || 'Player',
              username: clip.profile_username,
              is_pro: clip.is_pro || false,
              avatar_url: avatarMap[clip.user_id] || null
            }
          }));
          const existingIds = new Set(finalClips.map((c: any) => c.id));
          finalClips = [...finalClips, ...rpcClips.filter((c: any) => !existingIds.has(c.id))];
        }
      }

      if (finalClips.length === 0) setHasMore(false);
      const newBatch = finalClips.slice(0, LIMIT);
      if (offset === 0) {
        if (targetedClip) {
          // 指定されたクリップを先頭に追加し、重複を除去
          setClips([targetedClip, ...newBatch.filter((c: any) => c.id !== targetedClip.id)]);
          setActiveVideoId(targetedClip.id);
        } else {
          setClips(newBatch);
          // 最初のクリップを自動的にアクティブに設定（初期ロード時の自動再生対応）
          if (newBatch.length > 0) setActiveVideoId(newBatch[0].id);
        }
      }
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
            // バッチバッファに追加（5秒間隔でまとめてDB更新）
            viewBufferRef.current.push(id);
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
    const { data, error } = await supabase.rpc('claim_daily_reward');
    if (error) {
      console.error('claim_daily_reward RPC error:', error);
      // RPCが存在しない場合のフォールバック: ウォレットに直接1コイン付与
      const jstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
      await supabase.from('daily_user_missions').upsert(
        { user_id: user.id, target_date: jstDate, is_rewarded: true, views_count: dailyViews },
        { onConflict: 'user_id,target_date' }
      );
      // wallets テーブルのコインを+1
      const { error: rpcErr } = await supabase.rpc('increment_coins', { uid: user.id, amount: 1 });
      if (rpcErr) {
        const { data: w } = await supabase.from('wallets').select('coins').eq('user_id', user.id).maybeSingle();
        await supabase.from('wallets').upsert({ user_id: user.id, coins: (w?.coins || 0) + 1 }, { onConflict: 'user_id' });
      }
      setIsRewarded(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#22d3ee', '#818cf8', '#fbbf24'] });
      alert('1コインを獲得しました！');
      return;
    }
    if (data?.success) {
      setIsRewarded(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22d3ee', '#818cf8', '#fbbf24']
      });
      alert(t('mission.rewarded') || data?.message || '1コインを獲得しました！');
    }
  };

  const handleLike = async (clipId: number, clipOwnerId: string) => {
    if (!user) return alert(t('auth.loginRequired') || 'Please log in');

    // 連打対策: 進行中は無視（楽観 UI と RPC の結果が一致しなくなるのを防ぐ）
    if (likeInFlightRef.current.has(clipId)) return;
    likeInFlightRef.current.add(clipId);

    const isLiked = userLikes.includes(clipId);

    /** 楽観更新を元に戻す（スナップショットではなく「トグル前 wasLiked」基準で逆操作） */
    const revertOptimisticLike = () => {
      if (isLiked) {
        setUserLikes((prev) => (prev.includes(clipId) ? prev : [...prev, clipId]));
        setClips((prev) =>
          prev.map((c) =>
            c.id === clipId ? { ...c, likes: Math.max(0, (c.likes || 0) + 1) } : c
          )
        );
      } else {
        setUserLikes((prev) => prev.filter((id) => id !== clipId));
        setClips((prev) =>
          prev.map((c) =>
            c.id === clipId ? { ...c, likes: Math.max(0, (c.likes || 0) - 1) } : c
          )
        );
      }
    };

    // 楽観的 UI: 即時反映
    if (!isLiked) {
      setLikeAnimation(clipId);
      setTimeout(() => setLikeAnimation(null), 800);
    }
    setUserLikes((prev) => (isLiked ? prev.filter((id) => id !== clipId) : [...prev, clipId]));
    setClips((prev) =>
      prev.map((c) =>
        c.id === clipId
          ? { ...c, likes: Math.max(0, (c.likes || 0) + (isLiked ? -1 : 1)) }
          : c
      )
    );

    try {
      const { data: rpcResult, error } = await supabase.rpc('toggle_like', {
        p_user_id: user.id,
        p_clip_id: clipId,
        p_clip_owner_id: clipOwnerId,
      });

      if (error) {
        console.error('Like toggle error:', error);
        revertOptimisticLike();
        toast('Failed to save like. Please try again.', 'error');
        return;
      }

      // RPC が JSON { liked, likes_count } を返す場合は DB の正確な値で上書き
      if (rpcResult && typeof rpcResult === 'object') {
        const { liked, likes_count } = rpcResult as { liked: boolean; likes_count: number };
        if (typeof likes_count === 'number') {
          setClips((prev) =>
            prev.map((c) => (c.id === clipId ? { ...c, likes: likes_count } : c))
          );
        }
        setUserLikes((prev) => {
          if (liked) return prev.includes(clipId) ? prev : [...prev, clipId];
          return prev.filter((id) => id !== clipId);
        });
      }

      if (!isLiked) {
        updateUserPreference(clipId);
      }

      toast(
        isLiked
          ? t('common.removedFromLikes') || 'Removed from likes'
          : t('common.addedToLikes') || 'Added to likes',
        'success'
      );
    } catch (err) {
      console.error('Unexpected error in handleLike:', err);
      revertOptimisticLike();
      toast(t('common.error') || 'An error occurred. Please try again.', 'error');
    } finally {
      likeInFlightRef.current.delete(clipId);
    }
  };

  const handleSave = async (clipId: number) => {
    if (!user) return alert(t('auth.loginRequired') || 'Please log in');
    
    const isSaved = userSaves.includes(clipId);
    const previousUserSaves = userSaves;

    // Optimistic update
    setUserSaves(prev => isSaved ? prev.filter(id => id !== clipId) : [...prev, clipId]);

    try {
      const { data, error } = await supabase.rpc('toggle_save', {
        p_user_id: user.id,
        p_clip_id: clipId
      });

      if (error) throw error;
      
      toast(isSaved ? 'Removed from saves' : 'Saved to your collection', 'success');
    } catch (err) {
      console.error('Save error:', err);
      setUserSaves(previousUserSaves);
      toast('Failed to save clip.', 'error');
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

  const handleReport = (clipId: number) => {
    if (!user) return toast(t('auth.loginRequired') || 'ログインしてください');
    setReportReason('');
    setReportModalClipId(clipId);
  };

  const handleReportSubmit = async () => {
    if (!reportModalClipId || !reportReason.trim() || !user) return;
    setIsReporting(true);
    await supabase.rpc('submit_report', { p_clip_id: reportModalClipId, p_reporter_id: user.id, p_reason: reportReason.trim() });
    setIsReporting(false);
    setReportModalClipId(null);
    toast(t('action.reportSubmitted') || '報告しました。');
  };

  const handleFollow = async (targetId: string) => {
    if (!user) return alert(t('auth.loginRequired') || 'Please log in');
    if (user.id === targetId) return;
    
    const isFollowing = followingIds.includes(targetId);
    setFollowingIds(prev => isFollowing ? prev.filter(id => id !== targetId) : [...prev, targetId]);
    await supabase.rpc('toggle_follow', { p_follower_id: user.id, p_following_id: targetId });
  };

  const handleUnlockClip = async (clip: any) => {
    if (!user) { window.location.href = '/login'; return; }
    if (user.id === clip.user_id) { setUnlockedClipIds(prev => new Set([...prev, clip.id])); return; }
    setIsUnlocking(clip.id);
    const { data, error } = await supabase.rpc('unlock_paid_clip', { p_clip_id: clip.id });
    setIsUnlocking(null);
    if (error || data?.error) {
      if (data?.error === 'Insufficient coins') {
        toast('コインが不足しています。/coins でチャージできます。');
      } else {
        alert('エラーが発生しました: ' + (data?.error || error?.message));
      }
    } else {
      setUnlockedClipIds(prev => new Set([...prev, clip.id]));
    }
  };

  const handleGift = (clip: any) => {
    if (!user) return alert(t('auth.loginRequired') || 'Please log in');
    if (user.id === clip.user_id) return alert(t('gift.cantSelf') || 'Cannot gift your own clip');
    setGiftAmount(10);
    setGiftModalClip(clip);
  };

  const handleGiftSend = async () => {
    if (!giftModalClip || !user || isGifting) return;
    if (isNaN(giftAmount) || giftAmount <= 0) return;
    setIsGifting(true);
    const { data, error } = await supabase.rpc('send_gift', {
      p_sender: user.id,
      p_receiver: giftModalClip.user_id,
      p_clip_id: giftModalClip.id,
      p_amount: giftAmount,
    });
    setIsGifting(false);
    setGiftModalClip(null);
    if (error || !data) {
      toast(t('gift.insufficientCoins') || 'コインが不足しています。/coins でチャージできます。');
    } else {
      setUserCoins(prev => Math.max(0, prev - giftAmount));
      confetti({
        particleCount: 200,
        spread: 160,
        origin: { y: 0.7 },
        colors: ['#facc15', '#fde047', '#ffffff'],
        shapes: ['star'],
      });
      toast(`${giftAmount} ${t('gift.sent') || 'コインを贈りました!'}`);
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

  // コメントのリアルタイム購読
  useEffect(() => {
    if (!commentClipId || !isCommentOpen) return;

    const channel = supabase
      .channel(`comments-${commentClipId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `clip_id=eq.${commentClipId}` },
        (payload) => {
          const newComment = payload.new;
          setCurrentClipComments(prev => {
            if (prev.some(c => c.id === newComment.id)) return prev;
            return [newComment, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [commentClipId, isCommentOpen]);

  const postComment = async () => {
    if (!user || !newComment.trim() || !commentClipId || !commentClipOwnerId) return;
    setIsCommenting(true);
    const { data, error } = await supabase.from('comments').insert({ 
      clip_id: commentClipId, 
      user_id: user.id, 
      user_name: vlypId, 
      content: newComment,
      parent_id: replyingTo?.id || null 
    }).select().single();
    if (error) {
      toast(error.message || 'Failed to post comment. Rate limit reached.', 'error');
    } else if (data) {
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
        {/* ストーリーズバー + フィードモード切り替え */}
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-center gap-1 pt-3 pb-2">
            <button onClick={() => setFeedMode('all')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${feedMode === 'all' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>{t('feed.foryou')}</button>
            <button onClick={() => setFeedMode('following')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${feedMode === 'following' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>{t('feed.following')}</button>
          </div>
          <StoriesBar />
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
                  <div className="relative w-full h-full">
                    <TikTokPlayer
                      clip={clip}
                      isActive={activeVideoId === clip.id && (!clip.is_paid || unlockedClipIds.has(clip.id) || user?.id === clip.user_id)}
                      userLikes={userLikes}
                      userSaves={userSaves}
                      onLike={handleLike}
                      onSave={handleSave}
                      onComment={openComments}
                      onShare={handleShare}
                      onGift={handleGift}
                      onFollow={handleFollow}
                      renderTitle={renderTitle}
                      isCopied={copiedId === clip.id}
                      isFollowing={followingIds.includes(clip.user_id)}
                    />
                    {/* ペイウォールオーバーレイ */}
                    {clip.is_paid && !unlockedClipIds.has(clip.id) && user?.id !== clip.user_id && (
                      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#09090B] border border-yellow-500/30 rounded-3xl p-8 max-w-xs mx-4 text-center shadow-2xl">
                          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-yellow-400" />
                          </div>
                          <h3 className="text-lg font-black text-white mb-1">有料コンテンツ</h3>
                          <p className="text-zinc-400 text-sm mb-4">
                            このクリップを視聴するには<br />
                            <strong className="text-yellow-400">{clip.paid_price_coins} コイン</strong> が必要です
                          </p>
                          <button
                            onClick={() => handleUnlockClip(clip)}
                            disabled={isUnlocking === clip.id}
                            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black text-sm rounded-2xl hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isUnlocking === clip.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>{clip.paid_price_coins}Cで解放</>
                            )}
                          </button>
                          <Link href="/coins" className="block mt-3 text-[10px] text-zinc-500 hover:text-zinc-400">
                            コインを購入する →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full w-full bg-black flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
                  </div>
                )}
                {(index + 1) % 5 === 0 && <AdSlot />}
              </motion.div>
            );
          })}

          {/* Error State */}
          {!isLoading && fetchError && clips.length === 0 && (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-black snap-start">
              <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <Wifi className="w-10 h-10 text-red-500/60" />
              </div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">読み込みに失敗しました</h2>
              <p className="text-sm font-bold text-zinc-500 mb-8 max-w-xs">ネットワーク接続を確認して、もう一度お試しください。</p>
              <button
                onClick={() => { setFetchError(false); fetchInitialData(); }}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.4)]"
              >
                再試行
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !fetchError && clips.length === 0 && (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-black">
              <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                <Video className="w-10 h-10 text-zinc-600" />
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">{t('feed.emptyTitle')}</h2>
              <p className="text-sm font-bold text-zinc-500 mb-8 max-w-xs">{t('feed.emptyDesc')}</p>
              <Link href="/post" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                {t('feed.uploadCta')}
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
                {dailyViews >= 3 && <span className="text-[10px] font-black text-orange-400 fire-text">🔥 {dailyViews} {t('common.streak')}</span>}
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

        <div className="flex items-center gap-3 mb-10"><Flame className="w-5 h-5 text-orange-500" /><h2 className="text-xs font-black uppercase tracking-widest text-zinc-100">{t('feed.trending')}</h2></div>
        <div className="space-y-8 mb-12">
          {ranking.map((item, index) => (
            <Link key={item.id} href={`/profile/${item.user_id}`} className="flex gap-5 items-center group cursor-pointer">
              <span className="text-3xl font-black italic text-zinc-800 group-hover:text-blue-500">{index + 1}</span>
              <div className="min-w-0"><p className="text-xs font-black text-zinc-200 truncate group-hover:text-blue-400 uppercase mb-1">{item.title}</p><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">{item.views || 0} {t('feed.viewsLabel')}</p></div>
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
        <div className="fixed inset-y-0 right-0 w-full lg:w-[450px] bg-[#09090B]/98 backdrop-blur-3xl border-l border-white/10 z-[100] flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/40">
            <div>
              <h3 className="font-black uppercase tracking-[0.2em] text-xs text-blue-500 mb-1">{t('comments.title')}</h3>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('comments.subtitle')}</p>
            </div>
            <button onClick={() => setIsCommentOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl text-zinc-400 transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar bg-gradient-to-b from-blue-500/[0.02] to-transparent">
            {currentClipComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-20 text-center gap-4">
                <MessageCircle className="w-16 h-16" />
                <p className="font-black uppercase tracking-widest text-[10px]">{t('comments.emptyLine1')}<br/>{t('comments.emptyLine2')}</p>
              </div>
            ) : (
              currentClipComments.filter(c => !c.parent_id).map((c) => (
                <div key={c.id} className="space-y-6">
                  <div className="flex gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex-shrink-0 flex items-center justify-center font-black border border-white/10 text-xs uppercase text-zinc-400 shadow-xl group-hover:scale-105 transition-transform">
                      {c.vlyp_id?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider">@{c.vlyp_id}</p>
                        <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                        <span className="text-[8px] font-bold text-zinc-600 uppercase">{t('comments.justNow')}</span>
                      </div>
                      <p className="text-sm text-zinc-200 leading-relaxed font-medium mb-3 bg-white/[0.03] p-4 rounded-2xl rounded-tl-none border border-white/5">
                        {c.content}
                      </p>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => {
                            setReplyingTo({ id: c.id, vlyp_id: c.vlyp_id });
                            setNewComment(`@${c.vlyp_id} `);
                          }}
                          className="text-[9px] font-black text-zinc-500 uppercase hover:text-blue-400 transition-colors flex items-center gap-1"
                        >
                          <Send className="w-2.5 h-2.5 rotate-45" /> {t('comments.reply')}
                        </button>
                        <button type="button" className="text-[9px] font-black text-zinc-600 uppercase hover:text-pink-500 transition-colors">{t('comments.like')}</button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Replies */}
                  {currentClipComments.filter(reply => reply.parent_id === c.id).map(reply => (
                    <div key={reply.id} className="flex gap-4 ml-12 group">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 flex-shrink-0 flex items-center justify-center font-black border border-white/5 text-[10px] uppercase text-zinc-600">
                        {reply.vlyp_id?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[9px] font-black text-zinc-400 uppercase">@{reply.vlyp_id}</p>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed font-medium bg-white/5 p-3 rounded-xl rounded-tl-none">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="p-8 border-t border-white/5 relative flex flex-col gap-4 bg-black/60 backdrop-blur-xl">
            {/* Quick Emoji Bar */}
            <div className="flex gap-2 mb-1">
              {['🔥', 'GG', 'LFG', '🎮', '❤️', '🤩'].map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => setNewComment(prev => prev + emoji)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-black transition-all hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {replyingTo && (
              <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 px-5 py-3 rounded-2xl animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('comments.replyingTo')} @{replyingTo.vlyp_id}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-blue-500/20 rounded-full transition-all text-blue-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="relative group">
              <textarea 
                placeholder={replyingTo ? t('comments.placeholderReply') : t('comments.placeholder')} 
                className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-6 pr-16 text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-all group-hover:bg-white/[0.08] min-h-[60px] max-h-[150px] scrollbar-hide" 
                value={newComment} 
                rows={1}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    postComment();
                  }
                }} 
              />
              <button 
                onClick={postComment} 
                disabled={isCommenting || !newComment.trim()}
                className="absolute right-3 bottom-3 p-3.5 rounded-xl bg-blue-600 disabled:opacity-30 transition-all hover:bg-blue-500 active:scale-95"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
        )}
      {/* レポートモーダル */}
      {reportModalClipId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setReportModalClipId(null)}>
          <div className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black mb-2">報告する</h3>
            <p className="text-zinc-400 text-sm mb-4">報告理由を入力してください（最大200文字）</p>
            <textarea
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 text-sm resize-none"
              placeholder="例: スパム、不適切なコンテンツ、暴力的な表現..."
              rows={3}
              maxLength={200}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReportModalClipId(null)}
                className="flex-1 py-3 bg-white/5 rounded-xl font-black text-xs"
              >キャンセル</button>
              <button
                onClick={handleReportSubmit}
                disabled={isReporting || !reportReason.trim()}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black text-xs disabled:opacity-50"
              >
                {isReporting ? '送信中...' : '報告する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 投げ銭モーダル */}
      {giftModalClip && (
        <div className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-black mb-2">コインを贈る</h3>
            <p className="text-zinc-400 text-sm mb-4">@{giftModalClip.vlyp_id || giftModalClip.profiles?.display_name || 'ユーザー'} さんへ</p>

            {/* コイン残高表示 */}
            <p className="text-yellow-400 text-xs mb-4">残高: {userCoins} コイン</p>

            {/* 金額ボタン群 */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[10, 50, 100, 500].map(amt => (
                <button
                  key={amt}
                  onClick={() => setGiftAmount(amt)}
                  className={`py-3 rounded-xl font-black text-sm border transition-all ${
                    giftAmount === amt
                      ? 'bg-yellow-500 border-yellow-500 text-black'
                      : 'bg-white/5 border-white/10 text-zinc-300'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* カスタム入力 */}
            <input
              type="number"
              value={giftAmount}
              onChange={e => setGiftAmount(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 text-sm"
              placeholder="カスタム金額"
              min={1}
              max={userCoins}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setGiftModalClip(null)}
                className="flex-1 py-3 bg-white/5 rounded-xl font-black text-xs"
              >キャンセル</button>
              <button
                onClick={handleGiftSend}
                disabled={isGifting || giftAmount <= 0 || giftAmount > userCoins}
                className="flex-1 py-3 bg-yellow-500 text-black rounded-xl font-black text-xs disabled:opacity-50"
              >
                {isGifting ? '送信中...' : `${giftAmount}コイン贈る`}
              </button>
            </div>

            {giftAmount > userCoins && (
              <p className="text-red-400 text-xs mt-3 text-center">
                残高不足です。<a href="/coins" className="underline">コインショップ</a>でチャージできます。
              </p>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
