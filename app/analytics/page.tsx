'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  BarChart2, Eye, Heart, Users, PlaySquare, Coins,
  TrendingUp, Crown, Lock, ArrowLeft, MessageCircle,
  Trophy, Star
} from 'lucide-react';

interface AnalyticsData {
  totalViews: number;
  totalLikes: number;
  totalClips: number;
  totalFollowers: number;
  totalFollowing: number;
  totalComments: number;
  coinsBalance: number;
  topClips: {
    id: number;
    title: string;
    views: number;
    likes: number;
    game_title: string;
    thumbnail_url: string | null;
    created_at: string;
  }[];
  recentFollowers: number;   // 過去7日
  recentViews: number;       // 過去7日のクリップ累計（全件から推定）
  viewsByGame: { game: string; views: number }[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-blue-400',
  bg = 'bg-blue-500/10',
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  bg?: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
        <p className="text-2xl font-black text-white leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {sub && <p className="text-[10px] font-bold text-zinc-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function BarMini({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      setUserId(session.user.id);

      // Proチェック
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', session.user.id)
        .maybeSingle();

      setIsPro(profile?.is_pro || false);
      setLoading(false);

      if (!profile?.is_pro) return;

      // ── データ取得 ───────────────────────────────
      const uid = session.user.id;
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [
        clipsRes,
        followersRes,
        followingRes,
        commentsRes,
        walletRes,
        recentFollowersRes,
      ] = await Promise.all([
        supabase
          .from('clips')
          .select('id, title, views, likes, game_title, thumbnail_url, created_at')
          .eq('user_id', uid)
          .eq('status', 'published')
          .order('views', { ascending: false }),
        supabase
          .from('follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('following_id', uid),
        supabase
          .from('follows')
          .select('following_id', { count: 'exact', head: true })
          .eq('follower_id', uid),
        supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .in(
            'clip_id',
            // サブクエリ代わりにclip IDを使う
            ((await supabase.from('clips').select('id').eq('user_id', uid)).data || []).map((c: any) => c.id)
          ),
        supabase
          .from('wallets')
          .select('coins')
          .eq('user_id', uid)
          .maybeSingle(),
        supabase
          .from('follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('following_id', uid)
          .gte('created_at', sevenDaysAgo),
      ]);

      const clips = clipsRes.data || [];
      const totalViews = clips.reduce((s: number, c: any) => s + (c.views || 0), 0);
      const totalLikes = clips.reduce((s: number, c: any) => s + (c.likes || 0), 0);

      // ゲーム別集計
      const gameMap: Record<string, number> = {};
      clips.forEach((c: any) => {
        const g = c.game_title || 'Unknown';
        gameMap[g] = (gameMap[g] || 0) + (c.views || 0);
      });
      const viewsByGame = Object.entries(gameMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([game, views]) => ({ game, views }));

      setData({
        totalViews,
        totalLikes,
        totalClips: clips.length,
        totalFollowers: followersRes.count || 0,
        totalFollowing: followingRes.count || 0,
        totalComments: commentsRes.count || 0,
        coinsBalance: walletRes.data?.coins || 0,
        topClips: clips.slice(0, 5),
        recentFollowers: recentFollowersRes.count || 0,
        recentViews: totalViews,
        viewsByGame,
      });
    };
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-black text-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/[0.06] px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-400" />
          <h1 className="font-black text-base uppercase tracking-widest">Analytics</h1>
        </div>
        {isPro && (
          <span className="ml-auto px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1">
            <Crown className="w-3 h-3" />Pro
          </span>
        )}
      </div>

      {/* Pro Gate */}
      {!isPro ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <p className="text-xl font-black mb-2">Pro限定機能</p>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
              アナリティクスはProプランのみご利用いただけます。
              視聴数・いいね・フォロワー推移をチェックして投稿を最適化しましょう。
            </p>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            7日間無料トライアルを始める
          </button>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-8 pb-24">

          {/* サマリーカード */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4">Overview</p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Eye}           label="Total Views"     value={data.totalViews}     color="text-blue-400"   bg="bg-blue-500/10" />
              <StatCard icon={Heart}         label="Total Likes"     value={data.totalLikes}     color="text-red-400"    bg="bg-red-500/10" />
              <StatCard icon={Users}         label="Followers"       value={data.totalFollowers} sub={`+${data.recentFollowers} this week`} color="text-green-400" bg="bg-green-500/10" />
              <StatCard icon={PlaySquare}    label="Clips Posted"    value={data.totalClips}     color="text-yellow-400" bg="bg-yellow-500/10" />
              <StatCard icon={MessageCircle} label="Comments"        value={data.totalComments}  color="text-purple-400" bg="bg-purple-500/10" />
              <StatCard icon={Coins}         label="Coins Balance"   value={data.coinsBalance}   color="text-orange-400" bg="bg-orange-500/10" />
            </div>
          </section>

          {/* トップクリップ */}
          {data.topClips.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Top Clips by Views</p>
              </div>
              <div className="space-y-2">
                {data.topClips.map((clip, i) => {
                  const maxViews = data.topClips[0]?.views || 1;
                  return (
                    <div
                      key={clip.id}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[10px] font-black w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-orange-400' : 'text-zinc-600'}`}>
                          #{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white truncate">{clip.title || '(無題)'}</p>
                          <p className="text-[10px] font-bold text-zinc-600 truncate">{clip.game_title || '—'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-black text-white">{(clip.views || 0).toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-zinc-600">views</p>
                        </div>
                      </div>
                      <BarMini value={clip.views || 0} max={maxViews} />
                      <div className="flex gap-4 mt-2">
                        <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                          <Heart className="w-3 h-3" />{(clip.likes || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-600">
                          {new Date(clip.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ゲーム別視聴数 */}
          {data.viewsByGame.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-purple-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Views by Game</p>
              </div>
              <div className="space-y-3">
                {data.viewsByGame.map(({ game, views }) => {
                  const maxViews = data.viewsByGame[0]?.views || 1;
                  return (
                    <div key={game} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-black text-zinc-300 truncate max-w-[70%]">{game}</p>
                        <p className="text-xs font-black text-white">{views.toLocaleString()}</p>
                      </div>
                      <BarMini value={views} max={maxViews} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* エンゲージメント率 */}
          {data.totalViews > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Engagement</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <p className="text-xl font-black text-white">
                    {((data.totalLikes / data.totalViews) * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Like Rate</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <p className="text-xl font-black text-white">
                    {data.totalClips > 0 ? Math.round(data.totalViews / data.totalClips).toLocaleString() : '—'}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Avg Views</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <p className="text-xl font-black text-white">
                    {data.totalFollowers > 0
                      ? ((data.totalViews / data.totalFollowers)).toFixed(1)
                      : '—'}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Views/Fan</p>
                </div>
              </div>
            </section>
          )}

          {/* フッター */}
          <div className="text-center">
            <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
              Data refreshes on each page load
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
