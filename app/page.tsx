"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import {
  Heart,
  MessageCircle,
  Share2,
  Flame,
  X,
  Send,
  Loader2,
  Gamepad2,
  AlertTriangle,
  Check,
  Gift,
} from 'lucide-react';
import AdSlot from './components/AdSlot';
import { useLanguage } from './contexts/LanguageContext';

export default function Home() {
  const [clips, setClips] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [vlypId, setVlypId] = useState<string>('Player');
  
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
  const { t } = useLanguage();

  const [likeAnimation, setLikeAnimation] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

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
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_feed', {
        p_limit: LIMIT,
        p_offset: offset,
        p_user_id: userId,
        p_mode: feedMode
      });

      let newClips = [];

      if (!rpcError && rpcData) {
        newClips = rpcData.map((clip: any) => ({
          ...clip,
          profiles: {
            display_name: clip.profile_display_name || clip.user_name || 'Player',
            username: clip.profile_username
          }
        }));
      } else {
        let query = supabase.from('clips').select('*').neq('status', 'banned').order('created_at', { ascending: false }).range(offset, offset + LIMIT - 1);
        const { data: clipsData } = await query;
        if (clipsData) {
          const { data: allProfiles } = await supabase.from('profiles').select('id, display_name, username');
          newClips = clipsData.map(clip => ({
            ...clip,
            profiles: allProfiles?.find(p => p.id === clip.user_id) || { display_name: 'Player' }
          }));
        }
      }

      if (newClips.length < LIMIT) setHasMore(false);
      if (offset === 0) setClips(newClips);
      else setClips(prev => [...prev, ...newClips]);
      setPageOffset(offset + LIMIT);
    } catch (e) {
      console.error("Error fetching clips:", e);
    } finally {
      setIsFetchingMore(false);
    }
  };

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
            supabase.rpc('increment_view_count', { p_clip_id: id, p_user_id: user?.id || null });
          }
        }
      });
    }, { threshold: [0.6] });
    document.querySelectorAll('.video-section').forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [clips, user]);

  const handleLike = async (clipId: number, clipOwnerId: string) => {
    if (!user) return alert("ログインが必要です");
    const isLiked = userLikes.includes(clipId);
    if (!isLiked) {
      setLikeAnimation(clipId);
      setTimeout(() => setLikeAnimation(null), 800);
    }
    setUserLikes(prev => isLiked ? prev.filter(id => id !== clipId) : [...prev, clipId]);
    setClips(prev => prev.map(c => c.id === clipId ? { ...c, likes: Math.max(0, (c.likes || 0) + (isLiked ? -1 : 1)) } : c));
    await supabase.rpc('toggle_like', { p_user_id: user.id, p_clip_id: clipId, p_clip_owner_id: clipOwnerId });
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
    if (!user) return alert("ログインが必要です");
    const reason = window.prompt("通報理由を入力してください:");
    if (!reason) return;
    await supabase.rpc('submit_report', { p_clip_id: clipId, p_reporter_id: user.id, p_reason: reason });
    alert("通報を受け付けました。");
  };

  const handleGift = async (clip: any) => {
    if (!user) return alert("ログインが必要です");
    if (user.id === clip.user_id) return alert("自分の動画には投げ銭できません");
    const amountStr = window.prompt("いくらVLYPコインを投げ銭しますか？");
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return alert("無効な金額です");
    const { data, error } = await supabase.rpc('send_gift', { p_sender: user.id, p_receiver: clip.user_id, p_clip_id: clip.id, p_amount: amount });
    if (error || !data) {
      if (window.confirm("コインが不足しています。チャージ画面へ移動しますか？")) window.location.href = '/coins';
    } else alert(`${amount} コインを投げ銭しました！🎉`);
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
    const { data } = await supabase.from('comments').insert({ clip_id: commentClipId, user_id: user.id, vlyp_id: vlypId, content: newComment }).select().single();
    if (data) {
      setCurrentClipComments(prev => [data, ...prev]);
      setNewComment('');
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
        {clips.map((clip, index) => {
          const videoId = getYouTubeId(clip.url || clip.video_url);
          return (
            <React.Fragment key={clip.id}>
              <section data-clip-id={clip.id} className="video-section h-screen w-full snap-start flex items-center justify-center p-2 lg:p-6 pb-28 lg:pb-6 relative">
                <div className="relative h-full aspect-[9/16] bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                  {videoId ? (
                    <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${videoId}?autoplay=${activeVideoId === clip.id ? 1 : 0}&mute=0&controls=1&modestbranding=1&rel=0`} allow="autoplay; encrypted-media" allowFullScreen></iframe>
                  ) : (clip.video_url || clip.url) ? (
                    <video className="w-full h-full object-cover" src={clip.video_url || clip.url} autoPlay={activeVideoId === clip.id} loop playsInline controls={activeVideoId === clip.id} />
                  ) : <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2"><Loader2 className="animate-spin w-8 h-8 opacity-20" /><p className="text-[10px] font-bold uppercase">Loading...</p></div>}
                  <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 right-20 p-8 pointer-events-none">
                    {clip.game_title && <div className="flex items-center gap-2 mb-3"><div className="bg-blue-500/20 border border-blue-500/30 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 pointer-events-auto"><Gamepad2 className="w-3 h-3 text-blue-400" /><span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">{clip.game_title}</span></div></div>}
                    <h2 className="text-2xl font-black text-white mb-2 leading-tight line-clamp-2 italic uppercase">{renderTitle(clip.title)}</h2>
                    <Link href={`/profile/${clip.user_id}`} className="pointer-events-auto inline-flex items-center gap-2 group"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-[10px] font-black border border-blue-500/30">{(clip.profiles?.display_name || 'P').charAt(0).toUpperCase()}</div><span className="text-sm font-bold text-zinc-400 group-hover:text-blue-400">@{clip.profiles?.display_name || "Player"}</span></Link>
                  </div>
                  <div className="absolute right-6 bottom-12 flex flex-col gap-6 z-10">
                    <div onClick={() => handleLike(clip.id, clip.user_id)} className="cursor-pointer group text-center"><div className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 ${userLikes.includes(clip.id) ? 'bg-pink-500/20 border-pink-500 shadow-pink-500/20 shadow-lg' : 'bg-white/5 border-white/10'}`}><Heart className={`${userLikes.includes(clip.id) ? "fill-pink-500 text-pink-500" : "text-white"}`} /></div><p className="text-[10px] font-black mt-2 text-zinc-400 tracking-tighter">{clip.likes || 0}</p></div>
                    <div onClick={() => openComments(clip.id, clip.user_id)} className="cursor-pointer group text-center"><div className="w-14 h-14 rounded-full flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10"><MessageCircle className="w-6 h-6 text-white" /></div><p className="text-[10px] font-black mt-2 text-zinc-400 uppercase tracking-tighter">Chat</p></div>
                    <div onClick={() => handleShare(clip)} className="cursor-pointer group text-center"><div className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${copiedId === clip.id ? 'bg-green-500/20 border-green-500/50' : 'border-white/10 bg-white/5'}`}>{copiedId === clip.id ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5 text-white" />}</div><p className="text-[10px] font-black mt-2 uppercase tracking-tighter text-zinc-400">Share</p></div>
                    <div onClick={() => handleGift(clip)} className="cursor-pointer group text-center"><div className="w-14 h-14 rounded-full flex items-center justify-center border border-yellow-500/20 bg-yellow-500/10"><Gift className="w-6 h-6 text-yellow-400" /></div><p className="text-[10px] font-black mt-2 text-yellow-400 uppercase tracking-tighter">Gift</p></div>
                  </div>
                </div>
              </section>
              {(index + 1) % 5 === 0 && <AdSlot />}
            </React.Fragment>
          );
        })}
        {hasMore && !isLoading && <div ref={observerTarget} className="w-full h-32 flex items-center justify-center snap-start"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}
        {isLoading && <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10" /></div>}
      </main>
      <aside className="w-80 lg:w-96 border-l border-white/5 bg-[#09090B] p-10 hidden xl:flex flex-col flex-shrink-0">
        <div className="flex items-center gap-3 mb-10"><Flame className="w-5 h-5 text-orange-500" /><h2 className="text-xs font-black uppercase tracking-widest text-zinc-100">Trending</h2></div>
        <div className="space-y-8">
          {ranking.map((item, index) => (
            <Link key={item.id} href={`/profile/${item.user_id}`} className="flex gap-5 items-center group cursor-pointer">
              <span className="text-3xl font-black italic text-zinc-800 group-hover:text-blue-500">{index + 1}</span>
              <div className="min-w-0"><p className="text-xs font-black text-zinc-200 truncate group-hover:text-blue-400 uppercase mb-1">{item.title}</p><p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">{item.views || 0} Views</p></div>
            </Link>
          ))}
        </div>
      </aside>
      {isCommentOpen && (
        <div className="fixed inset-y-0 right-0 w-full lg:w-[450px] bg-[#09090B]/98 backdrop-blur-3xl border-l border-white/10 z-[100] flex flex-col">
          <div className="p-8 border-b border-white/5 flex items-center justify-between"><h3 className="font-black uppercase tracking-widest text-xs text-blue-400">Live Chat</h3><button onClick={() => setIsCommentOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-zinc-400"><X className="w-6 h-6" /></button></div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">{currentClipComments.map((c) => (<div key={c.id} className="flex gap-4 group"><div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center font-black border border-white/10 text-[10px] uppercase text-zinc-300">{c.vlyp_id?.charAt(0)}</div><div className="flex-1"><p className="text-[10px] font-black text-blue-500 uppercase mb-1">@{c.vlyp_id}</p><p className="text-sm text-zinc-300 leading-relaxed font-medium">{c.content}</p></div></div>))}</div>
          <div className="p-8 border-t border-white/5 relative flex items-center bg-black/50"><input type="text" placeholder="Type a message..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 pr-16 text-sm focus:outline-none focus:border-blue-500/50" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postComment()} /><button onClick={postComment} className="absolute right-11 p-3 bg-blue-600 rounded-xl text-white">{isCommenting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button></div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}