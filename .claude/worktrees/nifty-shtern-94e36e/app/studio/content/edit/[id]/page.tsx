"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { ArrowLeft, Save, Loader2, Film, Gamepad2, Type } from 'lucide-react';

export default function EditClipPage() {
  const { id } = useParams();
  const router = useRouter();
  const [clip, setClip] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [gameTitle, setGameTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchClip();
  }, [id]);

  const fetchClip = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');

    const { data, error } = await supabase
      .from('clips')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id) // 自分の動画のみ
      .single();

    if (error || !data) {
      alert("動画が見つからないか、権限がありません。");
      return router.push('/studio/content');
    }

    setClip(data);
    setTitle(data.title || '');
    setGameTitle(data.game_title || '');
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim()) return alert("タイトルを入力してください。");
    setIsSaving(true);

    const { error } = await supabase
      .from('clips')
      .update({
        title: title.trim(),
        game_title: gameTitle.trim()
      })
      .eq('id', id);

    if (error) {
      alert("更新に失敗しました。");
    } else {
      alert("更新が完了しました！");
      router.push('/studio/content');
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="flex h-screen bg-black items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>;

  return (
    <div className="flex h-[100dvh] bg-[#09090B] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-20 md:pb-0 p-6 md:p-12 relative">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-12">
            <button onClick={() => router.back()} className="p-3 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Edit Clip</h1>
          </div>

          <div className="space-y-8">
            {/* Preview Card */}
            <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 flex items-center gap-6">
              <div className="w-32 aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                {clip.video_url && <video src={clip.video_url} className="w-full h-full object-cover opacity-60" />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Preview</p>
                <p className="font-bold text-zinc-300 truncate italic">"{clip.title}"</p>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 space-y-10">
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                  <Type className="w-4 h-4 text-blue-500" /> Title
                </label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Catchy title..."
                  className="w-full bg-black/50 border border-white/10 rounded-2xl py-5 px-6 text-lg font-bold focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                  <Gamepad2 className="w-4 h-4 text-emerald-500" /> Game Title
                </label>
                <input 
                  type="text" 
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder="e.g. VALORANT"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl py-5 px-6 text-lg font-bold focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-white text-black font-black uppercase text-sm py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
