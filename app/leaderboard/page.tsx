"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { Trophy, Crown, Zap, Eye, Heart, Users, ArrowLeft, Flame, Medal } from 'lucide-react';
import { motion } from 'framer-motion';

type Tab = 'monthly_views' | 'total_views' | 'follower_count' | 'total_likes';

const TAB_CONFIG: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'monthly_views', label: '今月の視聴数', icon: <Flame className="w-3 h-3" />, color: 'text-orange-400' },
  { key: 'total_views',   label: '総視聴数',    icon: <Eye className="w-3 h-3" />,   color: 'text-blue-400'   },
  { key: 'follower_count',label: 'フォロワー数', icon: <Users className="w-3 h-3" />, color: 'text-purple-400' },
  { key: 'total_likes',   label: '総いいね数',  icon: <Heart className="w-3 h-3" />, color: 'text-pink-400'   },
];

const RANK_COLORS = ['from-yellow-400 to-orange-400', 'from-zinc-300 to-zinc-400', 'from-amber-600 to-amber-700'];
const RANK_ICONS = [
  <Trophy className="w-4 h-4 text-yellow-400" />,
  <Medal className="w-4 h-4 text-zinc-400" />,
  <Medal className="w-4 h-4 text-amber-600" />,
];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('monthly_views');
  const [creators, setCreators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [tab]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    // creator_leaderboard viewからデータを取得
    const { data, error } = await supabase
      .from('creator_leaderboard')
      .select('*')
      .order(tab, { ascending: false })
      .limit(50);

    if (!error && data) {
      setCreators(data);
      // 自分のランクを探す
      if (currentUserId) {
        const idx = data.findIndex(c => c.user_id === currentUserId);
        setMyRank(idx >= 0 ? idx + 1 : null);
      }
    }
    setIsLoading(false);
  };

  const formatNum = (n: number) => {
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n/1000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* ヘッダー */}
        <div className="sticky top-0 z-20 bg-[#09090B]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="text-zinc-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h1 className="text-lg font-black uppercase tracking-tighter">Creator Leaderboard</h1>
            </div>
          </div>
          {/* タブ */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TAB_CONFIG.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                  tab === t.key
                    ? `bg-white/10 text-white border-white/20`
                    : 'text-zinc-600 border-zinc-800 hover:border-zinc-600 hover:text-zinc-400'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 自分のランク */}
        {myRank && (
          <div className="mx-6 mt-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl px-5 py-3 flex items-center justify-between">
            <span className="text-[11px] font-black text-blue-400">あなたのランク</span>
            <span className="text-2xl font-black text-white">#{myRank}</span>
          </div>
        )}

        {/* トップ3 */}
        {!isLoading && creators.length >= 3 && (
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-end justify-center gap-3">
              {/* 2位 */}
              <TopPodium creator={creators[1]} rank={2} tab={tab} formatNum={formatNum} />
              {/* 1位 */}
              <TopPodium creator={creators[0]} rank={1} tab={tab} formatNum={formatNum} />
              {/* 3位 */}
              <TopPodium creator={creators[2]} rank={3} tab={tab} formatNum={formatNum} />
            </div>
          </div>
        )}

        {/* 4位以降リスト */}
        <div className="px-6 py-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 bg-white/[0.02] rounded-2xl animate-pulse" />
            ))
          ) : (
            creators.slice(3).map((creator, i) => (
              <motion.div
                key={creator.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={`/profile/${creator.username}`}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:bg-white/5 ${
                    creator.user_id === currentUserId
                      ? 'bg-blue-500/10 border-blue-500/20'
                      : 'bg-white/[0.02] border-white/5'
                  }`}
                >
                  {/* ランク番号 */}
                  <div className="w-8 text-center text-sm font-black text-zinc-500 flex-shrink-0">
                    #{i + 4}
                  </div>
                  {/* アバター */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-black text-zinc-400">
                        {(creator.display_name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* 名前 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate flex items-center gap-1.5">
                      {creator.display_name || creator.username}
                      {creator.is_pro && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                    </p>
                    <p className="text-[10px] text-zinc-500">@{creator.username}</p>
                  </div>
                  {/* スコア */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-white">{formatNum(creator[tab] || 0)}</p>
                    <p className="text-[9px] text-zinc-600">{TAB_CONFIG.find(t => t.key === tab)?.label}</p>
                  </div>
                </Link>
              </motion.div>
            ))
          )}

          {!isLoading && creators.length === 0 && (
            <div className="text-center py-16 text-zinc-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-black">まだランキングデータがありません</p>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function TopPodium({ creator, rank, tab, formatNum }: {
  creator: any; rank: 1 | 2 | 3; tab: Tab; formatNum: (n: number) => string;
}) {
  const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' };
  const sizes = { 1: 'w-20 h-20', 2: 'w-16 h-16', 3: 'w-14 h-14' };

  return (
    <Link href={`/profile/${creator.username}`} className="flex flex-col items-center gap-2 group">
      {/* 王冠 (1位のみ) */}
      {rank === 1 && <Crown className="w-6 h-6 text-yellow-400" />}
      {/* アバター */}
      <div className={`${sizes[rank]} rounded-full overflow-hidden border-2 ${rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-zinc-400' : 'border-amber-600'} shadow-lg`}>
        {creator.avatar_url ? (
          <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${RANK_COLORS[rank - 1]} flex items-center justify-center text-black font-black text-lg`}>
            {(creator.display_name || 'U')[0].toUpperCase()}
          </div>
        )}
      </div>
      {/* 名前 */}
      <p className="text-[10px] font-black text-white max-w-[72px] truncate text-center">
        {creator.display_name || creator.username}
      </p>
      {/* スコア */}
      <p className="text-[10px] font-bold text-zinc-400">{formatNum(creator[tab] || 0)}</p>
      {/* 台 */}
      <div className={`w-20 ${heights[rank]} bg-gradient-to-t ${RANK_COLORS[rank - 1]} opacity-20 rounded-t-xl flex items-start justify-center pt-2 group-hover:opacity-30 transition-opacity`}>
        <span className="text-2xl font-black text-white opacity-80">#{rank}</span>
      </div>
    </Link>
  );
}
