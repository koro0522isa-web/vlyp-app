"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { useLanguage } from '../contexts/LanguageContext';
import {
  BarChart3,
  Play,
  Heart,
  Trash2,
  Edit3,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  Video,
  Eye
} from 'lucide-react';

export default function Studio() {
  const { t } = useLanguage();
  const [myClips, setMyClips] = useState<any[]>([]);
  const [stats, setStats] = useState({ views: 0, likes: 0, count: 0 });
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudioData = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/';
      return;
    }
    const currentUser = session.user;
    setUser(currentUser);

    // 1. 自分の動画を取得
    const { data: clips } = await supabase
      .from('clips')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (clips) setMyClips(clips);

    // 2. 統計データを取得 (先ほどのSQL関数を呼び出し)
    const { data: userStats } = await supabase.rpc('get_user_stats', { target_user_id: currentUser.id });
    if (userStats && userStats[0]) {
      setStats({
        views: userStats[0].total_views,
        likes: userStats[0].total_likes,
        count: userStats[0].clip_count
      });
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchStudioData(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("このクリップを削除しますか？")) return;
    const { error } = await supabase.from('clips').delete().eq('id', id);
    if (!error) {
      setMyClips(myClips.filter(c => c.id !== id));
      fetchStudioData(); // 統計を更新
    }
  };

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:v=|\/embed\/|\.be\/)([^&?/]{11})/);
    return match ? match[1] : null;
  };

  if (isLoading) return (
    <div className="h-screen bg-[#09090B] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-20 md:pb-0 p-4 lg:p-10">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">{t('studio.title')}</h1>
          </div>
          <Link href="/post" className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
            <Video className="w-4 h-4" /> {t('nav.post')}
          </Link>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* --- Stats Overview --- */}
          <div className="lg:col-span-1 space-y-4">
            <StatCard icon={<Eye className="text-blue-400" />} label={t('studio.views')} value={stats.views.toLocaleString()} />
            <StatCard icon={<Heart className="text-pink-400" />} label={t('studio.likes')} value={stats.likes.toLocaleString()} />
            <Link href="/studio/revenue" className="block">
              <StatCard icon={<DollarSign className="text-emerald-400" />} label={t('studio.revenue')} value="Details" sub="Manage earnings & gifts" />
            </Link>
          </div>

          {/* --- Content List --- */}
          <div className="lg:col-span-3">
            <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <h2 className="font-bold flex items-center gap-2 uppercase tracking-widest text-xs text-zinc-400">
                  <BarChart3 className="w-4 h-4" /> {t('studio.myContent')}
                </h2>
                <Link href="/studio/content" className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors">
                  Manage All →
                </Link>
              </div>

              <div className="divide-y divide-white/5">
                {myClips.length > 0 ? myClips.map((clip) => {
                  const vid = getYouTubeId(clip.url || clip.video_url);
                  return (
                  <div key={clip.id} className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group">
                    <div className="relative w-20 h-28 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                      {vid ? (
                        <img
                          src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                          alt={clip.title}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (clip.video_url || clip.url) ? (
                        <video
                          src={`${clip.video_url || clip.url}#t=0.1`}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                          preload="metadata"
                          muted
                          playsInline
                        />
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-zinc-200 truncate group-hover:text-blue-400 transition-colors">{clip.title}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-zinc-500 font-bold">
                          <Play className="w-3 h-3" /> {clip.views || 0}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-zinc-500 font-bold">
                          <Heart className="w-3 h-3" /> {clip.likes || 0}
                        </div>
                        <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 font-black uppercase">
                          {clip.game_title || 'General'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/studio/content/edit/${clip.id}`} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400">
                        <Edit3 className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleDelete(clip.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  );
                }) : (
                  <div className="p-20 text-center text-zinc-600 font-bold uppercase tracking-widest text-sm">
                    {t('studio.noClips')}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function StatCard({ icon, label, value, sub }: any) {
  return (
    <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group hover:border-white/10 transition-colors">
      <div className="relative z-10">
        <div className="p-2 bg-white/5 rounded-xl w-fit mb-4">{icon}</div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-white italic tracking-tighter">{value}</p>
        {sub && <p className="text-[10px] text-zinc-600 font-bold mt-1 uppercase">{sub}</p>}
      </div>
      <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-white/[0.02] -rotate-12 group-hover:text-white/[0.05] transition-colors" />
    </div>
  );
}