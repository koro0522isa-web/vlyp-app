"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Check, X, Loader2, Play } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function AdminPage() {
  const [pendingClips, setPendingClips] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return window.location.href = '/';

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) {
      alert("Access Denied: Admin only.");
      return window.location.href = '/';
    }

    setIsAdmin(true);
    fetchPending();
  };

  const fetchPending = async () => {
    setLoading(true);
    const { data } = await supabase.from('pending_clips_queue').select('*');
    if (data) setPendingClips(data);
    setLoading(false);
  };

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    const { error } = await supabase.rpc('approve_clip', { p_clip_id: id });
    if (!error) {
      setPendingClips(prev => prev.filter(c => c.id !== id));
    }
    setProcessingId(null);
  };

  const handleReject = async (id: number) => {
    if (!window.confirm("この動画を削除しますか？")) return;
    setProcessingId(id);
    const { error } = await supabase.from('clips').delete().eq('id', id);
    if (!error) {
      setPendingClips(prev => prev.filter(c => c.id !== id));
    }
    setProcessingId(null);
  };

  if (!isAdmin && loading) {
    return <div className="h-screen bg-black flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen bg-[#09090B] text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-10">
        <div className="flex items-center gap-4 mb-12">
          <div className="p-3 bg-red-500/20 rounded-2xl">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Admin Command Center</h1>
            <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-1">Content Moderation Queue</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-30">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest">Scanning Files...</p>
          </div>
        ) : pendingClips.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-20 text-center">
            <p className="text-zinc-500 font-black uppercase tracking-widest">All Clear. No pending clips.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pendingClips.map((clip) => (
              <div key={clip.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col group hover:border-red-500/30 transition-all duration-500">
                <div className="aspect-video bg-black relative">
                  <video 
                    src={clip.video_url} 
                    className="w-full h-full object-contain"
                    controls
                  />
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <div className="mb-6">
                    <span className="text-[9px] font-black bg-blue-500 text-white px-2 py-0.5 rounded uppercase mb-2 inline-block tracking-tighter">
                      {clip.game_title || 'General'}
                    </span>
                    <h3 className="text-lg font-black leading-tight uppercase italic">{clip.title}</h3>
                  </div>
                  
                  <div className="mt-auto flex gap-3">
                    <button 
                      onClick={() => handleApprove(clip.id)}
                      disabled={processingId === clip.id}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs transition-all active:scale-95"
                    >
                      {processingId === clip.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Approve</>}
                    </button>
                    <button 
                      onClick={() => handleReject(clip.id)}
                      disabled={processingId === clip.id}
                      className="w-16 bg-white/5 hover:bg-red-500/20 border border-white/10 flex items-center justify-center rounded-2xl transition-all group/btn"
                    >
                      <X className="w-5 h-5 text-zinc-500 group-hover/btn:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}