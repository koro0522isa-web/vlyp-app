"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  UploadCloud, Loader2, ShieldCheck, ArrowLeft, Crown, Sparkles, 
  Lock, Mic, Music, Scissors, Wand2, Palette, Check, Zap
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { PROFILE_REFRESH_EVENT } from '@/lib/dm-events';
import { generateEmbedding, generateVoiceover } from '../lib/ai';
import { useVideoProcessor, VideoFilter } from '../hooks/useVideoProcessor';
import { motion, AnimatePresence } from 'framer-motion';

const GAMES = [
  "VALORANT", "Apex Legends", "League of Legends", "Street Fighter 6", 
  "Overwatch 2", "Minecraft", "Fortnite", "Call of Duty", 
  "CS2", "Tekken 8", "Genshin Impact", "Other"
];

const BGM_GENRES = [
  { id: 'chill', label: 'Chill & Relax', icon: '🌊' },
  { id: 'epic', label: 'Epic & Hype', icon: '🔥' },
  { id: 'phonk', label: 'Phonk / Drift', icon: '🏎️' },
  { id: 'hyperpop', label: 'Hyperpop', icon: '⚡' },
];

const FILTERS: { id: VideoFilter; label: string; color: string }[] = [
  { id: 'none', label: 'Original', color: 'bg-zinc-500' },
  { id: 'cyberpunk', label: 'Cyberpunk', color: 'bg-blue-600' },
  { id: 'vintage', label: 'Vintage', color: 'bg-orange-800' },
  { id: 'grayscale', label: 'Noir', color: 'bg-zinc-800' },
  { id: 'warm', label: 'Warm', color: 'bg-orange-400' },
];

function PostContent() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [gameTitle, setGameTitle] = useState('VALORANT');
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bgms, setBgms] = useState<any[]>([]);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Pro SaaS State
  const [isPro, setIsPro] = useState(false);
  const [monthlyUploads, setMonthlyUploads] = useState(0);
  const [voiceoverText, setVoiceoverText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<'male' | 'female'>('female');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<VideoFilter>('none');
  const [startTime, setStartTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [bgmStartTime, setBgmStartTime] = useState(0);
  const [bgmDuration, setBgmDuration] = useState(0);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const { processVideoPro, progress: processingProgress } = useVideoProcessor();

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
    
    supabase.from('bgm_library').select('*').then(({ data }) => {
      if (data) setBgms(data);
    });
  }, []);

  // Stripe Checkout 成功リダイレクト後に Pro 状態を Sidebar / 本ページで再取得
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      window.dispatchEvent(new CustomEvent(PROFILE_REFRESH_EVENT));
    }
  }, [searchParams]);

  useEffect(() => {
    const refreshPro = () => {
      void (async () => {
        if (!user?.id) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_pro, monthly_uploads')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          setIsPro(profile.is_pro || false);
          setMonthlyUploads(profile.monthly_uploads || 0);
        }
      })();
    };
    window.addEventListener(PROFILE_REFRESH_EVENT, refreshPro);
    return () => window.removeEventListener(PROFILE_REFRESH_EVENT, refreshPro);
  }, [user?.id]);

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

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting || !file) return;
    
    if (!isPro && monthlyUploads >= 30) {
      alert('Free users are limited to 30 uploads. Upgrade to Pro!');
      return;
    }

    setIsSubmitting(true);

    try {
      let fileToUpload = file;

      // PRO Processing
      if (isPro && (selectedGenre || voiceoverText || selectedFilter !== 'none' || startTime > 0)) {
        setIsProcessing(true);
        
        // Find BGM from genre
        let bgmUrl = '';
        if (selectedGenre) {
          const genreBgms = bgms.filter(b => b.genre?.toLowerCase() === selectedGenre || b.tags?.includes(selectedGenre));
          if (genreBgms.length > 0) {
            bgmUrl = genreBgms[Math.floor(Math.random() * genreBgms.length)].url;
          } else if (bgms.length > 0) {
            bgmUrl = bgms[0].url; // Fallback
          }
        }

        let narrationUrl = '';
        if (voiceoverText) {
          const narrationBlob = await generateVoiceover(voiceoverText, selectedVoice);
          if (narrationBlob) {
            narrationUrl = URL.createObjectURL(narrationBlob);
          }
        }

        const processedBlob = await processVideoPro(file, {
          bgmUrl,
          narrationUrl,
          filter: selectedFilter,
          startTime,
          playbackSpeed,
          bgmStartTime,
          bgmDuration: bgmDuration > 0 ? bgmDuration : undefined,
          volumeBgm: 0.4,
          volumeVideo: 0.8
        });

        fileToUpload = new File([processedBlob], `vlyp_pro_${file.name}`, { type: 'video/mp4' });
        if (narrationUrl) URL.revokeObjectURL(narrationUrl);
        setIsProcessing(false);
      }

      // Upload Logic
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, fileToUpload);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(filePath);
      const embedding = await generateEmbedding(`${title} ${gameTitle}`);

      const { error: insertError } = await supabase.from('clips').insert({
        title,
        video_url: publicUrl,
        game_title: gameTitle,
        user_id: user.id,
        embedding: embedding,
        tags: hashtags
      });

      if (insertError) throw insertError;

      alert('Clip Published! 🚀');
      router.push('/');
    } catch (err: any) {
      console.error(err);
      alert('Failed to post: ' + (err.message || err.toString() || 'Unknown error'));
      setIsSubmitting(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className={`h-screen overflow-y-auto w-full bg-[#09090B] text-white p-4 md:p-10 font-sans transition-all duration-700 ${isPro ? 'bg-pro-gradient' : ''}`}>
      <style jsx global>{`
        .bg-pro-gradient {
          background: radial-gradient(circle at 50% -20%, #1e1b4b 0%, #09090b 100%);
        }
        .pro-border {
          position: relative;
          border-radius: 3rem;
          background: rgba(15, 15, 18, 0.8);
          padding: 2px;
          overflow: hidden;
        }
        .pro-border::before {
          content: '';
          position: absolute;
          inset: -50%;
          background: conic-gradient(from 0deg, transparent, #3b82f6, #a855f7, #ec4899, #ef4444, #f59e0b, transparent);
          animation: rotate 4s linear infinite;
          z-index: -1;
        }
        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }
        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>

      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button onClick={() => router.push('/')} className="mb-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 flex items-center gap-2 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest hidden md:block">Back to Feed</span>
        </button>

        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start`}>
          {/* Main Form */}
          <div className={`lg:col-span-7 ${isPro ? 'pro-border shadow-2xl shadow-purple-500/10' : 'bg-zinc-900/30 border border-zinc-800 rounded-[3rem] p-8'}`}>
            <div className={`relative z-10 ${isPro ? 'bg-[#0f0f12] rounded-[2.9rem] p-8' : ''}`}>
              <header className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-black italic tracking-tighter uppercase">Post Clip</h1>
                  {isPro && <span className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full text-[10px] font-black text-white flex items-center gap-1 shadow-lg shadow-purple-500/30"><Crown className="w-3 h-3" /> PRO</span>}
                </div>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Share your best gaming moments</p>
              </header>

              <form onSubmit={handlePost} className="space-y-8">
                {/* Title & Game */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Title</label>
                    <input 
                      required
                      className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl focus:border-blue-500/50 outline-none transition-all font-bold"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Best play of the week..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Game</label>
                    <select 
                      className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl focus:border-blue-500/50 outline-none font-bold"
                      value={gameTitle}
                      onChange={(e) => setGameTitle(e.target.value)}
                    >
                      {GAMES.map(g => <option key={g} value={g} className="bg-[#09090B]">{g}</option>)}
                    </select>
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Video File</label>
                  <div 
                    className={`relative w-full aspect-video border-2 border-dashed ${file ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-800 bg-white/5 hover:bg-white/10 hover:border-zinc-600'} rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 overflow-hidden group`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} accept="video/*" required className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    {file ? (
                      <div className="absolute inset-0 z-10">
                        <video 
                          src={URL.createObjectURL(file)} 
                          className="w-full h-full object-cover opacity-80" 
                          autoPlay 
                          muted 
                          loop 
                          style={{
                            filter: 
                              selectedFilter === 'grayscale' ? 'grayscale(1)' :
                              selectedFilter === 'sepia' ? 'sepia(1)' :
                              selectedFilter === 'cyberpunk' ? 'contrast(1.2) brightness(1.1) saturate(1.5) hue-rotate(290deg)' :
                              selectedFilter === 'vintage' ? 'sepia(0.5) contrast(0.8) brightness(0.9) blur(0.2px)' :
                              selectedFilter === 'warm' ? 'sepia(0.3) saturate(1.3) hue-rotate(-10deg)' : 'none'
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                          <Check className="w-12 h-12 text-blue-500 mb-2" />
                          <p className="text-white font-black text-sm uppercase tracking-widest">{file.name}</p>
                          <p className="text-zinc-400 text-[10px] uppercase font-bold">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <UploadCloud className="w-12 h-12 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Click to select video</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms */}
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 checked:bg-blue-600"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-200 transition-colors">Agree to Copyright Policy</p>
                      <p className="text-[9px] text-zinc-600 font-bold mt-1">No unauthorized music or duplicate content allowed.</p>
                    </div>
                  </label>
                </div>

                {/* Post Button */}
                <button 
                  type="submit"
                  disabled={isSubmitting || !file || !agreedTerms}
                  className={`w-full py-5 rounded-2xl flex justify-center items-center gap-3 font-black text-lg uppercase tracking-widest transition-all shadow-xl ${
                    isSubmitting || !file || !agreedTerms ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:scale-[1.02] active:scale-95 shadow-blue-600/30'
                  }`}
                >
                  {isSubmitting || isProcessing ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{isProcessing ? 'AI Editing...' : 'Posting...'}</span>
                      </div>
                      {isProcessing && <div className="text-[10px] opacity-60">Mixing {Math.round(processingProgress)}%</div>}
                    </div>
                  ) : (
                    <><Zap className="w-5 h-5" /> {t('post.uploadBtn')}</>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Pro Sidebar Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className={`glass rounded-[2.5rem] p-8 border ${isPro ? 'border-purple-500/30 bg-purple-500/5' : 'border-zinc-800'}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-5 h-5 ${isPro ? 'text-purple-400' : 'text-zinc-600'}`} />
                  <h3 className={`text-xs font-black uppercase tracking-widest ${isPro ? 'text-white' : 'text-zinc-500'}`}>Pro Tools</h3>
                </div>
                {!isPro && <Lock className="w-4 h-4 text-zinc-700" />}
              </div>

              {isPro ? (
                <div className="space-y-8">
                  {/* BGM Genre Selection */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                      <Music className="w-3 h-3" /> Auto Music Insertion
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {BGM_GENRES.map(genre => (
                        <button
                          key={genre.id}
                          type="button"
                          onClick={() => setSelectedGenre(selectedGenre === genre.id ? '' : genre.id)}
                          className={`p-4 rounded-2xl border text-left transition-all ${selectedGenre === genre.id ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}
                        >
                          <span className="text-xl block mb-1">{genre.icon}</span>
                          <span className="text-[10px] font-black uppercase truncate">{genre.label}</span>
                        </button>
                      ))}
                    </div>

                    {selectedGenre && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pt-4 border-t border-white/5"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Music Part (Start Sec)</label>
                          <input 
                            type="number" 
                            className="bg-white/5 border border-white/10 rounded-lg w-16 p-2 text-xs font-bold text-center"
                            value={bgmStartTime}
                            onChange={(e) => setBgmStartTime(Number(e.target.value))}
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Video Filters */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                      <Palette className="w-3 h-3" /> Cinematic Filters
                    </label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                      {FILTERS.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFilter(f.id)}
                          className={`flex-shrink-0 w-20 h-24 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${selectedFilter === f.id ? 'border-purple-500 bg-purple-500/20' : 'border-transparent bg-white/5'}`}
                        >
                          <div className={`w-10 h-10 rounded-full ${f.color} shadow-lg`} />
                          <span className="text-[8px] font-black uppercase text-center">{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trimming & Speed */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                        <Scissors className="w-3 h-3" /> Quick Trim
                      </label>
                      <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                        <span className="text-[9px] font-black text-zinc-500 uppercase">Start (s)</span>
                        <input 
                          type="number"
                          className="w-12 bg-transparent text-center font-black outline-none"
                          value={startTime}
                          onChange={(e) => setStartTime(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3" /> Playback Speed
                      </label>
                      <select 
                        className="w-full bg-white/5 p-4 rounded-2xl font-black text-[10px] outline-none"
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      >
                        <option value="0.5" className="bg-[#09090B]">0.5x</option>
                        <option value="1.0" className="bg-[#09090B]">1.0x</option>
                        <option value="1.5" className="bg-[#09090B]">1.5x</option>
                        <option value="2.0" className="bg-[#09090B]">2.0x</option>
                      </select>
                    </div>
                  </div>

                  {/* AI Smart Tags */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> AI Smart Tags
                      </label>
                      <button 
                        type="button"
                        onClick={() => {
                          const tags = ['gaming', gameTitle.toLowerCase(), 'epic', 'clutch', 'pro'];
                          if (title.length > 5) tags.push(title.split(' ')[0].toLowerCase());
                          setHashtags([...new Set(tags)]);
                        }}
                        className="text-[8px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                      >
                        Auto Generate
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map(t => (
                        <span key={t} className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[9px] font-bold text-zinc-400">#{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* AI Voiceover */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                      <Mic className="w-3 h-3" /> AI Narration
                    </label>
                    <textarea 
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-purple-500 outline-none text-xs text-zinc-300 min-h-[80px]"
                      placeholder="Enter text for AI voiceover..."
                      value={voiceoverText}
                      onChange={(e) => setVoiceoverText(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-zinc-500 font-bold mb-6">Unlock AI Auto-Editor, Custom Filters, and BGM Injection with VLYP PRO.</p>
                  <button onClick={handleProUpgrade} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-purple-600/20 hover:scale-105 transition-transform">
                    Upgrade to Pro — $9.99/mo
                  </button>
                </div>
              )}
            </div>

            {/* Plan Info */}
            <div className="glass rounded-[2.5rem] p-6 border border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Upload Usage</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black">{monthlyUploads}</span>
                  <span className="text-xs font-bold text-zinc-600">/ {isPro ? '∞' : '30'}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                <Wand2 className={`w-5 h-5 ${isPro ? 'text-purple-400' : 'text-zinc-700'}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Post() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>}>
      <PostContent />
    </Suspense>
  );
}