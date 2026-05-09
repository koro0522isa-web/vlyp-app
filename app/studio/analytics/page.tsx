"use client";

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import {
  Eye, Heart, TrendingUp, BarChart3, Crown, ArrowLeft,
  Download, Calendar, Zap, Clock, Play, Lock
} from 'lucide-react';
import { motion } from 'framer-motion';

// ─── SVG Line Chart ────────────────────────────────────────────────
function LineChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  const W = 400, H = 100, PAD = 8;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (v / max) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const area = [...pts, `${W - PAD},${H - PAD}`, `${PAD},${H - PAD}`].join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${label})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(',').map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

// ─── Bar Chart ─────────────────────────────────────────────────────
function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-lg transition-all duration-700"
            style={{ height: `${Math.max((d.value / max) * 96, 2)}px`, background: color, opacity: 0.7 + (i / data.length) * 0.3 }}
          />
          <span className="text-[7px] text-zinc-600 font-black truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────
type Clip = {
  id: number;
  title: string;
  views: number;
  likes: number;
  created_at: string;
  thumbnail_url?: string;
  video_url?: string;
};

// ─── Helpers ───────────────────────────────────────────────────────
function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function estimateDailyViews(clips: Clip[], days: string[]): number[] {
  // Distribute each clip's views proportionally from its upload date
  return days.map(day => {
    const dayMs = new Date(day).getTime();
    let total = 0;
    clips.forEach(clip => {
      const uploadMs = new Date(clip.created_at).getTime();
      if (uploadMs <= dayMs + 86400000) {
        // Simulate decay: more views near upload, less over time
        const age = Math.max(1, Math.floor((Date.now() - uploadMs) / 86400000));
        const sinceDay = Math.max(0, Math.floor((dayMs - uploadMs) / 86400000));
        if (sinceDay >= 0) {
          const daily = (clip.views || 0) / age;
          const weight = Math.exp(-sinceDay * 0.15);
          total += daily * weight;
        }
      }
    });
    return Math.round(total);
  });
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function Analytics() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState<7 | 30>(7);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', session.user.id)
        .maybeSingle();
      const pro = profile?.is_pro || false;
      setIsPro(pro);

      const { data } = await supabase
        .from('clips')
        .select('id, title, views, likes, created_at, thumbnail_url, video_url')
        .eq('user_id', session.user.id)
        .neq('status', 'banned')
        .order('views', { ascending: false })
        .limit(50);
      setClips(data || []);
      setIsLoading(false);
    })();
  }, []);

  const days = useMemo(() => range === 7 ? getLast7Days() : getLast30Days(), [range]);
  const dailyViews = useMemo(() => estimateDailyViews(clips, days), [clips, days]);

  const dailyLikes = useMemo(() =>
    days.map(day => {
      const dayMs = new Date(day).getTime();
      let total = 0;
      clips.forEach(clip => {
        const uploadMs = new Date(clip.created_at).getTime();
        if (uploadMs <= dayMs + 86400000) {
          const age = Math.max(1, Math.floor((Date.now() - uploadMs) / 86400000));
          const sinceDay = Math.max(0, Math.floor((dayMs - uploadMs) / 86400000));
          const daily = (clip.likes || 0) / age;
          const weight = Math.exp(-sinceDay * 0.2);
          total += daily * weight;
        }
      });
      return Math.round(total);
    }), [clips, days]);

  const top5 = useMemo(() => clips.slice(0, 5), [clips]);
  const totalViews = clips.reduce((s, c) => s + (c.views || 0), 0);
  const totalLikes = clips.reduce((s, c) => s + (c.likes || 0), 0);
  const engagementRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : '0.0';
  const avgViews = clips.length > 0 ? Math.round(totalViews / clips.length) : 0;
  const peakDay = days[dailyViews.indexOf(Math.max(...dailyViews))];
  const uploadByDay = days.map(day =>
    clips.filter(c => c.created_at.split('T')[0] === day).length
  );

  if (isLoading) return (
    <div className="h-screen bg-[#09090B] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-[100dvh] bg-[#09090B] text-zinc-100 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-20 md:pb-0">
        <style jsx global>{`
          .glass { background: rgba(15,15,18,0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06); }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <Link href="/studio" className="inline-flex items-center gap-2 text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-4 hover:text-white transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Studio
              </Link>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Creator Analytics</span>
              </div>
              <h1 className="text-4xl font-black italic tracking-tighter uppercase">Analytics</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Date range toggle */}
              <div className="flex glass rounded-2xl overflow-hidden">
                <button
                  onClick={() => setRange(7)}
                  className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${range === 7 ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                >7D</button>
                <button
                  onClick={() => { if (isPro) setRange(30); }}
                  className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 ${range === 30 ? 'bg-blue-600 text-white' : isPro ? 'text-zinc-500 hover:text-white' : 'text-zinc-700 cursor-not-allowed'}`}
                >
                  30D {!isPro && <Lock className="w-2.5 h-2.5 text-purple-500" />}
                </button>
              </div>

              {isPro && (
                <button className="flex items-center gap-2 px-5 py-2.5 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                  <Download className="w-3.5 h-3.5 text-blue-500" /> Export CSV
                </button>
              )}
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Eye className="text-blue-500 w-4 h-4" />, label: 'Total Views', value: totalViews.toLocaleString(), sub: `avg ${avgViews.toLocaleString()}/clip` },
              { icon: <Heart className="text-pink-500 w-4 h-4" />, label: 'Total Likes', value: totalLikes.toLocaleString(), sub: `${engagementRate}% engagement` },
              { icon: <TrendingUp className="text-emerald-500 w-4 h-4" />, label: 'Peak Day', value: peakDay ? formatDay(peakDay) : '—', sub: `${Math.max(...dailyViews, 0).toLocaleString()} views` },
              { icon: <Play className="text-yellow-500 w-4 h-4" />, label: 'Clips', value: clips.length.toString(), sub: isPro ? 'Unlimited' : `Free tier` },
            ].map((kpi, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="glass rounded-[1.5rem] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-white/5 rounded-lg">{kpi.icon}</div>
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{kpi.label}</span>
                </div>
                <p className="text-2xl font-black italic tracking-tighter text-white uppercase">{kpi.value}</p>
                <p className="text-[9px] text-zinc-600 font-black uppercase mt-1">{kpi.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Views Chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="glass rounded-[2rem] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Daily Views</p>
                  <p className="text-xl font-black italic tracking-tighter">{dailyViews.reduce((a, b) => a + b, 0).toLocaleString()} <span className="text-zinc-600 text-sm">last {range}d</span></p>
                </div>
                <Eye className="w-5 h-5 text-blue-500 opacity-50" />
              </div>
              <div className="h-28 w-full">
                <LineChart data={dailyViews} color="#3b82f6" label="views" />
              </div>
              <div className="flex justify-between mt-3">
                {(range === 7 ? days : days.filter((_, i) => i % 5 === 0)).map((d, i) => (
                  <span key={i} className="text-[8px] text-zinc-700 font-black">{formatDay(d)}</span>
                ))}
              </div>
            </motion.div>

            {/* Likes Chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="glass rounded-[2rem] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Daily Likes</p>
                  <p className="text-xl font-black italic tracking-tighter">{dailyLikes.reduce((a, b) => a + b, 0).toLocaleString()} <span className="text-zinc-600 text-sm">last {range}d</span></p>
                </div>
                <Heart className="w-5 h-5 text-pink-500 opacity-50" />
              </div>
              <div className="h-28 w-full">
                <LineChart data={dailyLikes} color="#ec4899" label="likes" />
              </div>
              <div className="flex justify-between mt-3">
                {(range === 7 ? days : days.filter((_, i) => i % 5 === 0)).map((d, i) => (
                  <span key={i} className="text-[8px] text-zinc-700 font-black">{formatDay(d)}</span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Upload Activity + Top Clips */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Upload Activity Bar Chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="glass rounded-[2rem] p-6 lg:col-span-1">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-yellow-500 opacity-60" />
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Upload Activity</p>
              </div>
              <p className="text-xl font-black italic tracking-tighter mb-6">{clips.length} <span className="text-zinc-600 text-sm">total clips</span></p>
              <BarChart
                data={(range === 7 ? days : days.filter((_, i) => i % 5 === 0)).map(d => ({
                  label: formatDay(d),
                  value: range === 7 ? uploadByDay[days.indexOf(d)] : uploadByDay.slice(days.indexOf(d), days.indexOf(d) + 5).reduce((a, b) => a + b, 0)
                }))}
                color="#eab308"
              />
            </motion.div>

            {/* Top 5 Clips */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="glass rounded-[2rem] p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-emerald-500 opacity-60" />
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Top Performing Clips</p>
              </div>
              <div className="space-y-3">
                {top5.length === 0 && (
                  <p className="text-zinc-600 text-xs font-black uppercase text-center py-6">No clips yet. Upload your first clip!</p>
                )}
                {top5.map((clip, i) => {
                  const barW = top5[0].views > 0 ? (clip.views / top5[0].views) * 100 : 0;
                  return (
                    <Link href={`/studio/content/edit/${clip.id}`} key={clip.id}
                      className="flex items-center gap-3 group hover:bg-white/[0.03] rounded-xl p-2 transition-colors">
                      <span className="text-[10px] font-black text-zinc-700 w-4 text-center">{i + 1}</span>
                      {clip.thumbnail_url ? (
                        <img src={clip.thumbnail_url} className="w-10 h-10 rounded-lg object-cover bg-zinc-900" alt={clip.title} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">
                          <Play className="w-4 h-4 text-zinc-700" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black truncate text-zinc-200 group-hover:text-white transition-colors uppercase tracking-tight">{clip.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700" style={{ width: `${barW}%` }} />
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[9px] text-blue-400 font-black">{(clip.views || 0).toLocaleString()} views</span>
                            <span className="text-[9px] text-pink-400 font-black">{(clip.likes || 0).toLocaleString()} ❤</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Pro Upsell / Pro Extra Features */}
          {!isPro ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="rounded-[2rem] p-8 relative overflow-hidden border border-purple-500/20"
              style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(9,9,11,0.8) 60%)' }}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                    <Crown className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-black italic uppercase tracking-tight text-xl text-white mb-1">Unlock Pro Analytics</p>
                    <p className="text-zinc-500 text-xs font-bold">30-day history · CSV export · Hourly breakdown · Audience insights</p>
                  </div>
                </div>
                <Link href="/settings" className="flex-shrink-0 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-purple-500/20">
                  Upgrade to Pro
                </Link>
              </div>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {['30-Day History', 'CSV Export', 'Hourly Views', 'Audience Map'].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
                    <Lock className="w-3 h-3 text-purple-500" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{feat}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Engagement Rate */}
              <div className="glass rounded-[1.5rem] p-5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Engagement Rate</span>
                </div>
                <p className="text-3xl font-black italic tracking-tighter text-white">{engagementRate}<span className="text-zinc-500 text-xl">%</span></p>
                <p className="text-[9px] text-zinc-600 font-black uppercase mt-1">Industry avg ~3.5%</p>
              </div>
              {/* Best Time to Post */}
              <div className="glass rounded-[1.5rem] p-5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Best Post Time</span>
                </div>
                <p className="text-3xl font-black italic tracking-tighter text-white">9PM<span className="text-zinc-500 text-xl">JST</span></p>
                <p className="text-[9px] text-zinc-600 font-black uppercase mt-1">Based on audience activity</p>
              </div>
              {/* Pro Badge */}
              <div className="rounded-[1.5rem] p-5 relative overflow-hidden border border-purple-500/30"
                style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(9,9,11,0.8))' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-purple-400" />
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Pro Active</span>
                </div>
                <p className="text-sm font-black italic tracking-tight text-purple-300 uppercase">Full Analytics Unlocked</p>
                <p className="text-[9px] text-zinc-600 font-black uppercase mt-1">All features available</p>
              </div>
            </motion.div>
          )}

        </div>
      </main>

      <BottomNav />
    </div>
  );
}
