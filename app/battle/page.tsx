"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Swords, Trophy, ChevronRight, Loader2, ArrowLeft, 
  Flame, Crown, Zap, SkipForward, Share2
} from 'lucide-react';

interface BattleClip {
  id: number;
  title: string;
  video_url: string;
  url: string;
  user_id: string;
  game_title: string;
  views: number;
  likes: number;
  profiles?: { display_name: string; is_pro: boolean };
}

export default function BattlePage() {
  const [clipA, setClipA] = useState<BattleClip | null>(null);
  const [clipB, setClipB] = useState<BattleClip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [voted, setVoted] = useState<'A' | 'B' | null>(null);
  const [voteCounts, setVoteCounts] = useState({ a: 0, b: 0 });
  const [streak, setStreak] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    fetchBattle();
  }, []);

  const fetchBattle = async () => {
    setIsLoading(true);
    setVoted(null);
    setShowResult(false);
    setVoteCounts({ a: 0, b: 0 });

    try {
      // ランダムに2つのクリップを取得
      const { data: clips } = await supabase
        .from('clips')
        .select('*, profiles(display_name, is_pro)')
        .neq('status', 'banned')
        .order('created_at', { ascending: false })
        .limit(50);

      if (clips && clips.length >= 2) {
        // ランダムに2つ選ぶ
        const shuffled = clips.sort(() => Math.random() - 0.5);
        setClipA(shuffled[0]);
        setClipB(shuffled[1]);
      }
    } catch (e) {
      console.error('Error fetching battle clips:', e);
    }
    setIsLoading(false);
  };

  const handleVote = async (winner: 'A' | 'B') => {
    if (voted) return;
    setVoted(winner);
    setStreak(prev => prev + 1);

    // 投票結果の表示用（デモ）
    const aVotes = winner === 'A' ? 60 + Math.floor(Math.random() * 20) : 20 + Math.floor(Math.random() * 20);
    const bVotes = 100 - aVotes;
    setVoteCounts({ a: aVotes, b: bVotes });
    setShowResult(true);

    // 勝者クリップにログインユーザーのいいねを1件追加（未ログイン・既にいいね済みはスキップ）
    const winnerClip = winner === 'A' ? clipA : clipB;
    if (winnerClip && user) {
      const { data: liked } = await supabase
        .from('clip_likes')
        .select('clip_id')
        .eq('user_id', user.id)
        .eq('clip_id', winnerClip.id)
        .maybeSingle();
      if (!liked) {
        const { error } = await supabase.rpc('toggle_like', {
          p_user_id: user.id,
          p_clip_id: winnerClip.id,
          p_clip_owner_id: winnerClip.user_id,
        });
        if (error) console.error('Battle vote like error:', error);
      }
    }
  };

  const nextBattle = () => {
    fetchBattle();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#09090B] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Swords className="w-12 h-12 text-orange-500 animate-pulse" />
          <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Loading Battle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090B]/90 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Swords className="w-5 h-5 text-orange-500" />
              <h1 className="text-lg font-black italic uppercase tracking-tighter">Clip Battle</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {streak > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/30 px-3 py-1.5 rounded-full"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-black text-orange-400">{streak} Streak</span>
              </motion.div>
            )}
            <button
              onClick={nextBattle}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
          </div>
        </div>

        {/* VS Label */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/30 border-4 border-black"
          >
            <span className="text-xl md:text-2xl font-black italic text-white">VS</span>
          </motion.div>
        </div>

        {/* Battle Arena */}
        <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
          {/* Clip A */}
          {clipA && (
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex-1 relative cursor-pointer group"
              onClick={() => handleVote('A')}
            >
              <video
                ref={videoRefA}
                src={clipA.video_url || clipA.url}
                className="w-full h-full object-cover"
                loop
                playsInline
                muted
                autoPlay
              />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
              
              {/* Hover effect */}
              {!voted && (
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors duration-300 flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    className="bg-blue-600 px-8 py-4 rounded-2xl shadow-2xl shadow-blue-500/30"
                  >
                    <span className="text-xl font-black text-white uppercase tracking-widest">Vote</span>
                  </motion.div>
                </div>
              )}

              {/* Info */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 mb-2">
                  {clipA.profiles?.is_pro && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-0.5 rounded-md">
                      <Crown className="w-2.5 h-2.5 text-white fill-white" />
                      <span className="text-[7px] font-black text-white uppercase">PRO</span>
                    </div>
                  )}
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
                    {clipA.game_title}
                  </span>
                </div>
                <h3 className="text-lg font-black italic text-white line-clamp-2 drop-shadow-lg">
                  {clipA.title}
                </h3>
                <p className="text-xs text-white/60 font-bold mt-1">
                  @{clipA.profiles?.display_name || 'Player'}
                </p>
              </div>

              {/* Vote Result */}
              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-6 left-6 right-6"
                  >
                    <div className={`p-4 rounded-2xl backdrop-blur-xl border ${voted === 'A' ? 'bg-blue-500/30 border-blue-400/50' : 'bg-white/10 border-white/20'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-black text-white">{voteCounts.a}%</span>
                        {voted === 'A' && <Trophy className="w-5 h-5 text-yellow-400" />}
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${voteCounts.a}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full ${voted === 'A' ? 'bg-blue-500' : 'bg-zinc-500'}`}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Clip B */}
          {clipB && (
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex-1 relative cursor-pointer group"
              onClick={() => handleVote('B')}
            >
              <video
                ref={videoRefB}
                src={clipB.video_url || clipB.url}
                className="w-full h-full object-cover"
                loop
                playsInline
                muted
                autoPlay
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

              {!voted && (
                <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/20 transition-colors duration-300 flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    className="bg-red-600 px-8 py-4 rounded-2xl shadow-2xl shadow-red-500/30"
                  >
                    <span className="text-xl font-black text-white uppercase tracking-widest">Vote</span>
                  </motion.div>
                </div>
              )}

              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 mb-2">
                  {clipB.profiles?.is_pro && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-0.5 rounded-md">
                      <Crown className="w-2.5 h-2.5 text-white fill-white" />
                      <span className="text-[7px] font-black text-white uppercase">PRO</span>
                    </div>
                  )}
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
                    {clipB.game_title}
                  </span>
                </div>
                <h3 className="text-lg font-black italic text-white line-clamp-2 drop-shadow-lg">
                  {clipB.title}
                </h3>
                <p className="text-xs text-white/60 font-bold mt-1">
                  @{clipB.profiles?.display_name || 'Player'}
                </p>
              </div>

              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-6 left-6 right-6"
                  >
                    <div className={`p-4 rounded-2xl backdrop-blur-xl border ${voted === 'B' ? 'bg-red-500/30 border-red-400/50' : 'bg-white/10 border-white/20'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-black text-white">{voteCounts.b}%</span>
                        {voted === 'B' && <Trophy className="w-5 h-5 text-yellow-400" />}
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${voteCounts.b}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full ${voted === 'B' ? 'bg-red-500' : 'bg-zinc-500'}`}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Next Battle Button */}
        <AnimatePresence>
          {voted && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-30"
            >
              <button
                onClick={nextBattle}
                className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-red-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-orange-500/30 hover:scale-105 transition-transform active:scale-95"
              >
                <Zap className="w-5 h-5" />
                Next Battle
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}
