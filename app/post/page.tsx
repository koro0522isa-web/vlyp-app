"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  UploadCloud, Loader2, ArrowLeft, Crown, Sparkles, 
  Wand2, Check, Zap, Video as VideoIcon, Gamepad2, Info, X, Hash, Image as ImageIcon
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { PROFILE_REFRESH_EVENT } from '@/lib/dm-events';
import { motion, AnimatePresence } from 'framer-motion';

const GAMES = [
  "VALORANT", "Apex Legends", "League of Legends", "Street Fighter 6", 
  "Overwatch 2", "Minecraft", "Fortnite", "Call of Duty", 
  "CS2", "Tekken 8", "Genshin Impact", "Other"
];

function PostContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [gameTitle, setGameTitle] = useState('VALORANT');
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  
  // Pro State
  const [isPro, setIsPro] = useState(false);
  const [monthlyUploads, setMonthlyUploads] = useState(0);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser) { router.push('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro, monthly_uploads')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (profile) {
        setIsPro(profile.is_pro || false);
        setMonthlyUploads(profile.monthly_uploads || 0);
      }
    });
  }, []);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      window.dispatchEvent(new CustomEvent(PROFILE_REFRESH_EVENT));
    }
  }, [searchParams]);

  const handleProUpgrade = async () => {
    if (!user) return;
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId: 'pro', userId: user.id }),
    });
    const data = await response.json();
    if (data.url) window.location.href = data.url;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]?.type.startsWith('video/')) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '').replace(/\s/g, '');
    if (tag && !hashtags.includes(tag) && hashtags.length < 10) {
      setHashtags([...hashtags, tag]);
      setHashtagInput('');
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting || !file || !title.trim()) return;
    
    const maxUploads = isPro ? 999999 : 30;
    if (monthlyUploads >= maxUploads) {
      alert(isPro ? 'Upload limit reached.' : 'Free plan: 30 uploads/month. Upgrade to Pro for unlimited uploads!');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 15, 90));
      }, 300);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, file);
      clearInterval(progressInterval);

      if (uploadError) throw uploadError;
      setUploadProgress(95);

      const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(filePath);

      let thumbnailUrl = null;
      if (thumbnail && isPro) {
        const thumbExt = thumbnail.name.split('.').pop();
        const thumbName = `thumb_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${thumbExt}`;
        const thumbPath = `${user.id}/${thumbName}`;
        const { error: thumbErr } = await supabase.storage.from('videos').upload(thumbPath, thumbnail);
        if (!thumbErr) {
          thumbnailUrl = supabase.storage.from('videos').getPublicUrl(thumbPath).data.publicUrl;
        }
      }

      const { error: insertError } = await supabase.from('clips').insert({
        title: title.trim(),
        url: publicUrl,
        video_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        game_title: gameTitle,
        user_id: user.id,
        user_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Player',
        tags: hashtags.length > 0 ? hashtags : null
      });

      if (insertError) throw insertError;
      
      // Increment monthly uploads
      await supabase.from('profiles').update({ 
        monthly_uploads: (monthlyUploads || 0) + 1 
      }).eq('id', user.id);

      setUploadProgress(100);
      
      setTimeout(() => router.push('/'), 500);
    } catch (err: any) {
      console.error(err);
      alert('Failed to post: ' + (err.message || 'Unknown error'));
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const maxFileSize = isPro ? 500 : 50; // MB
  const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => router.push('/')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">Post Clip</h1>
          <div className="flex items-center gap-2">
            {isPro ? (
              <span className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                <Crown className="w-3 h-3" /> PRO
              </span>
            ) : (
              <button onClick={handleProUpgrade} className="px-3 py-1.5 bg-white/5 hover:bg-purple-500/20 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5 hover:border-purple-500/30 transition-all flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Upgrade
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handlePost} className="space-y-8">
          {/* Drop Zone */}
          <div 
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`relative w-full rounded-[2rem] overflow-hidden transition-all duration-300 border-2 cursor-pointer ${
              file 
                ? 'border-blue-500/30 bg-blue-500/5 aspect-video' 
                : dragActive
                  ? 'border-blue-500 bg-blue-500/10 aspect-[16/9]' 
                  : 'border-dashed border-white/10 hover:border-white/20 bg-white/[0.02] aspect-[16/9]'
            }`}
          >
            <input type="file" ref={fileInputRef} accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            
            {!file ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                <motion.div 
                  animate={dragActive ? { scale: 1.1 } : { scale: 1 }}
                  className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-5"
                >
                  <UploadCloud className={`w-7 h-7 transition-colors ${dragActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                </motion.div>
                <p className="font-black uppercase tracking-widest text-sm mb-1">Drop your clip here</p>
                <p className="text-zinc-500 text-xs font-bold">or click to browse • MP4, WebM • Max {maxFileSize}MB</p>
              </div>
            ) : (
              <>
                <video 
                  src={URL.createObjectURL(file)} 
                  className="w-full h-full object-contain bg-black" 
                  autoPlay muted loop playsInline
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black text-zinc-300">
                    {fileSizeMB} MB
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-red-500/50 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block ml-1">Title</label>
            <input 
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Your best play title..."
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-blue-500/50 outline-none transition-all font-bold text-lg placeholder:text-zinc-700"
            />
            <p className="text-right text-[10px] text-zinc-600 font-bold mt-1 mr-1">{title.length}/120</p>
          </div>

          {/* Pro Feature: Custom Thumbnail */}
          {isPro && (
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block ml-1 flex items-center gap-1.5">
                <Crown className="w-3 h-3 text-purple-500" /> Custom Thumbnail (Optional)
              </label>
              <div 
                onClick={() => thumbnailInputRef.current?.click()}
                className="w-full bg-white/5 border border-dashed border-purple-500/30 hover:border-purple-500/60 p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-colors"
              >
                <input type="file" ref={thumbnailInputRef} accept="image/*" className="hidden" onChange={(e) => setThumbnail(e.target.files?.[0] || null)} />
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-300">{thumbnail ? thumbnail.name : 'Upload Thumbnail Image'}</p>
                  <p className="text-[10px] font-black uppercase text-zinc-600">JPG, PNG, WEBP</p>
                </div>
                {thumbnail && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setThumbnail(null); }} className="ml-auto p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Game + Hashtags Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Game */}
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block ml-1 flex items-center gap-1.5">
                <Gamepad2 className="w-3 h-3" /> Game
              </label>
              <div className="relative">
                <select 
                  value={gameTitle} onChange={(e) => setGameTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none font-bold appearance-none"
                >
                  {GAMES.map(g => <option key={g} value={g} className="bg-[#09090B]">{g}</option>)}
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* Hashtags */}
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block ml-1 flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Tags
              </label>
              <div className="flex gap-2">
                <input 
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                  placeholder="Add tag..."
                  className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl outline-none font-bold placeholder:text-zinc-700 text-sm"
                />
                <button type="button" onClick={addHashtag} className="px-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors text-xs font-black uppercase">+</button>
              </div>
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {hashtags.map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] font-black text-blue-300 flex items-center gap-1.5">
                      #{tag}
                      <button type="button" onClick={() => setHashtags(hashtags.filter(t => t !== tag))} className="hover:text-red-400 transition-colors">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upload Quota */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-zinc-500" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Monthly Uploads</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black">{monthlyUploads}</span>
              <span className="text-xs font-bold text-zinc-600">/ {isPro ? '∞' : '30'}</span>
            </div>
          </div>

          {/* Terms Checkbox */}
          <label className="flex items-start gap-4 cursor-pointer group p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
            <div className="relative mt-0.5">
              <input type="checkbox" className="peer sr-only" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} />
              <div className="w-5 h-5 rounded-lg bg-black/50 border-2 border-zinc-700 peer-checked:bg-blue-600 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                <Check className={`w-3 h-3 text-white transition-transform duration-200 ${agreedTerms ? 'scale-100' : 'scale-0'}`} />
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-zinc-300 uppercase tracking-widest">Copyright Agreement</p>
              <p className="text-[10px] text-zinc-500 font-bold mt-1">No unauthorized music or duplicate content. You own the rights to this clip.</p>
            </div>
          </label>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={isSubmitting || !file || !agreedTerms || !title.trim()}
            className={`relative w-full py-5 rounded-2xl overflow-hidden flex justify-center items-center gap-3 font-black text-sm uppercase tracking-[0.15em] transition-all duration-300 ${
              isSubmitting || !file || !agreedTerms || !title.trim()
                ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5' 
                : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98] shadow-xl shadow-blue-600/20'
            }`}
          >
            {/* Progress bar */}
            {isSubmitting && (
              <div className="absolute left-0 top-0 bottom-0 bg-blue-400/30 transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
            )}
            
            <span className="relative z-10 flex items-center gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploadProgress < 95 ? 'Uploading...' : 'Publishing...'}
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" /> Publish Clip
                </>
              )}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Post() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#09090b]"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>}>
      <PostContent />
    </Suspense>
  );
}