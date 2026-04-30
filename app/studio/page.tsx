"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Play, Heart, Trash2, Edit3, DollarSign, ArrowLeft, Video, 
  Eye, Wand2, TrendingUp, BarChart3, Clock, Zap, Crown
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Studio() {
  const { t } = useLanguage();
  const [myClips, setMyClips] = useState<any[]>([]);
  const [stats, setStats] = useState({ views: 0, likes: 0, count: 0 });
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudioData = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/login'; return; }
    
    const currentUser = session.user;
    setUser(currentUser);

    const { data: profile } = await supabase.from('profiles').select('is_pro').eq('id', currentUser.id).maybeSingle();
    setIsPro(profile?.is_pro || false);

    const { data: clips } = await supabase
      .from('clips')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (clips) {
      setMyClips(clips);
      setStats({
        views: clips.reduce((acc, c) => acc + (c.views || 0), 0),
        likes: clips.reduce((acc, c) => acc + (c.likes || 0), 0),
        count: clips.length
      });
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchStudioData(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this clip?")) return;
    const { error } = await supabase.from('clips').delete().eq('id', id);
    if (!error) setMyClips(myClips.filter(c => c.id !== id));
  };

  if (isLoading) return (
    <div className="h-screen bg-[#09090B] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-20 md:pb-0 p-4 lg:p-10 bg-studio-dots">
        <style jsx global>{`
          .bg-studio-dots {
            background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
            background-size: 30px 30px;
          }
          .glass-panel {
            background: rgba(15, 15, 18, 0.6);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
        `}</style>

        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Area */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Creator Hub</span>
              </div>
              <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-2">Studio</h1>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Manage your empire and edit with Pro tools</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/studio/revenue" className="flex items-center gap-2 px-6 py-4 glass-panel rounded-2xl hover:bg-white/5 transition-all group">
                <DollarSign className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Total Earnings</p>
                  <p className="text-xl font-black italic">$0.00</p>
                </div>
              </Link>
              <Link href="/post" className={`px-8 py-4 ${isPro ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-500/20' : 'bg-blue-600 shadow-blue-600/20'} shadow-xl rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all`}>
                <Video className="w-5 h-5" />
                New Clip
              </Link>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox icon={<Eye className="text-blue-500" />} label="Total Views" value={stats.views.toLocaleString()} trend="Live" />
            <StatBox icon={<Heart className="text-pink-500" />} label="Total Likes" value={stats.likes.toLocaleString()} trend="Live" />
            <StatBox icon={<Zap className="text-yellow-500" />} label="Clip Count" value={stats.count.toString()} trend="Active" />
            <StatBox 
              icon={<Crown className="text-purple-500" />} 
              label="Pro Status" 
              value={isPro ? 'Active' : 'Free'} 
              sub={isPro ? 'Unlimited Edit' : 'Limited'}
              isPro={isPro}
            />
          </div>

          {/* Content Manager Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-12">
              <div className="glass-panel rounded-[2.5rem] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-lg font-black italic uppercase tracking-tight flex items-center gap-3">
                    <Video className="w-5 h-5 text-blue-500" /> My Content
                  </h2>
                  <div className="flex gap-2">
                    {/* Filters etc could go here */}
                    <span className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-black uppercase text-zinc-500">All Clips</span>
                  </div>
                </div>

                <div className="divide-y divide-white/5">
                  {myClips.length > 0 ? myClips.map((clip) => (
                    <div key={clip.id} className="p-6 flex flex-col md:flex-row items-center gap-6 hover:bg-white/[0.02] transition-all group">
                      {/* Thumbnail with Pro Overlay */}
                      <div className="relative w-full md:w-48 aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 flex-shrink-0 group-hover:border-blue-500/30 transition-colors">
                        {clip.video_url && (
                          <video src={`${clip.video_url}#t=0.1`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" muted playsInline />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                        {isPro && (
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-purple-500/30">
                            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                          </div>
                        )}
                      </div>

                      {/* Info & Actions */}
                      <div className="flex-1 min-w-0 text-center md:text-left">
                        <h3 className="text-lg font-black italic text-zinc-200 truncate mb-2 uppercase tracking-tight">{clip.title}</h3>
                        <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          <div className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {clip.views || 0}</div>
                          <div className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> {clip.likes || 0}</div>
                          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(clip.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link href={`/studio/content/edit/${clip.id}`} className="flex items-center gap-2 px-5 py-3 glass-panel rounded-xl text-[10px] font-black uppercase text-zinc-400 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/30 transition-all">
                          <Wand2 className="w-3.5 h-3.5 text-blue-500" />
                          Edit & Filter
                        </Link>
                        <button onClick={() => handleDelete(clip.id)} className="p-3 glass-panel rounded-xl text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="py-24 text-center">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Video className="w-10 h-10 text-zinc-700" />
                      </div>
                      <p className="text-zinc-500 font-black uppercase tracking-widest text-sm mb-6">No clips found in your studio</p>
                      <Link href="/post" className="text-blue-500 font-black uppercase text-xs hover:underline tracking-[0.2em]">Upload your first clip →</Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function StatBox({ icon, label, value, trend, sub, isPro }: any) {
  return (
    <div className={`glass-panel p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-transform ${isPro ? 'border-purple-500/20' : ''}`}>
      <div className="relative z-10">
        <div className="p-3 bg-white/5 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-black italic tracking-tighter text-white uppercase">{value}</p>
          {trend && <span className="text-[9px] font-black text-emerald-500">{trend}</span>}
        </div>
        {sub && <p className="text-[9px] text-zinc-700 font-black uppercase mt-1">{sub}</p>}
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
        <TrendingUp className="w-32 h-32 rotate-12" />
      </div>
    </div>
  );
}