"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Eye, 
  Loader2, 
  Film, 
  MoreVertical, 
  Search,
  Filter,
  AlertCircle,
  BarChart2
} from 'lucide-react';

export default function ContentManagerPage() {
  const [clips, setClips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMyClips();
  }, []);

  const fetchMyClips = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login';
      return;
    }
    setUser(session.user);

    const { data, error } = await supabase
      .from('clips')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setClips(data || []);
    setIsLoading(false);
  };

  const handleDelete = async (clip: any) => {
    if (!confirm(`「${clip.title}」を削除しますか？\nこの操作は取り消せません。`)) return;

    try {
      // 1. データベースから削除
      const { error: dbError } = await supabase
        .from('clips')
        .delete()
        .eq('id', clip.id);
      
      if (dbError) throw dbError;

      // 2. ストレージからファイルを削除（Supabase旧URL / R2新URL 両対応）
      if (clip.video_url) {
        try {
          if (clip.video_url.includes('/storage/')) {
            // 旧Supabaseストレージ
            const url = new URL(clip.video_url);
            const pathParts = url.pathname.split('/object/public/videos/');
            if (pathParts[1]) {
              await supabase.storage.from('videos').remove([decodeURIComponent(pathParts[1])]);
            }
          } else if (clip.video_url.includes('r2.dev') || clip.video_url.includes('/video/')) {
            // 新R2ストレージ
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              await fetch('/api/r2-delete', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ url: clip.video_url }),
              });
            }
          }
        } catch (e) {
          console.error('Storage delete error:', e);
        }
      }

      setClips(prev => prev.filter(c => c.id !== clip.id));
      alert("削除が完了しました。");
    } catch (e) {
      console.error(e);
      alert("削除中にエラーが発生しました。");
    }
  };

  const filteredClips = clips.filter(c => 
    c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.game_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="flex h-screen bg-black items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>;

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-20 md:pb-0 p-6 md:p-12 relative">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
              <Link href="/studio" className="p-3 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Content Manager</h1>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Manage your uploads</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search clips..." 
                  className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-blue-500/50 transition-all w-full md:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Clips List */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Video</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Details</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredClips.length > 0 ? filteredClips.map((clip) => (
                    <tr key={clip.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-6 w-48">
                        <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 group-hover:border-blue-500/30 transition-colors">
                          {clip.video_url ? (
                            <video src={clip.video_url} className="w-full h-full object-cover opacity-50" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-20"><Film /></div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                            <Link href={`/clip/${clip.id}`} className="p-2 bg-blue-600 rounded-full"><Eye className="w-4 h-4 text-white" /></Link>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <p className="font-bold text-zinc-200 mb-1 line-clamp-1">{clip.title || 'Untitled'}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{clip.game_title || 'General'}</span>
                          <span className="text-zinc-600 font-bold text-[10px]">{new Date(clip.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-zinc-500">
                          <div className="flex items-center gap-1"><BarChart2 className="w-3 h-3" /><span className="text-[10px] font-bold">{clip.views || 0}</span></div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-tighter ${
                          clip.status === 'banned' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
                        }`}>
                          {clip.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/studio/content/edit/${clip.id}`}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-zinc-400 hover:text-white transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(clip)}
                            className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-20 text-center text-zinc-600 font-bold uppercase tracking-widest text-sm">
                        No clips found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
