"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  UploadCloud, Loader2, ArrowLeft, Crown, Sparkles,
  Wand2, Check, Zap, Video as VideoIcon, Gamepad2, Info, X, Hash, Image as ImageIcon, Lock,
  Smartphone, Calendar, Clock, AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { PROFILE_REFRESH_EVENT } from '@/lib/dm-events';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoProcessor } from '@/app/hooks/useVideoProcessor';

const GAMES = [
  "VALORANT", "Apex Legends", "League of Legends", "Street Fighter 6", 
  "Overwatch 2", "Minecraft", "Fortnite", "Call of Duty", 
  "CS2", "Tekken 8", "Genshin Impact", "Other"
];

function PostContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [gameTitle, setGameTitle] = useState('VALORANT');
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
  // 有料動画設定（Pro限定）
  const [isPaidVideo, setIsPaidVideo] = useState(false);
  const [paidPriceCoins, setPaidPriceCoins] = useState<number>(100);
  const [isMemberOnly, setIsMemberOnly] = useState(false);
  // 縦型変換
  const [isConverting, setIsConverting] = useState(false);
  const [convertMode, setConvertMode] = useState<'pad' | 'crop'>('pad');
  const { convertToVertical, progress: convertProgress } = useVideoProcessor();
  // 予約投稿 (Pro only)
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [useSchedule, setUseSchedule] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    supabase
      .from('profiles')
      .select('is_pro, monthly_uploads')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (profile) {
          setIsPro(profile.is_pro || false);
          setMonthlyUploads(profile.monthly_uploads || 0);
        }
      });
  }, [authLoading, user]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      window.dispatchEvent(new CustomEvent(PROFILE_REFRESH_EVENT));
    }
  }, [searchParams]);

  // ── SaaS流入: /edit から came → sessionStorage に保存された生成動画を自動セット ───
  useEffect(() => {
    if (searchParams.get('from') !== 'ai_edit') return;
    const dataurl = sessionStorage.getItem('ai_edit_result_dataurl');
    if (!dataurl) return;
    (async () => {
      try {
        const res = await fetch(dataurl);
        const blob = await res.blob();
        const f = new File([blob], 'vlyp_highlight.mp4', { type: blob.type || 'video/mp4' });
        setFile(f);
        // 自動でタイトル候補を入れる(ユーザーが書き換え可)
        setTitle((t) => t || 'AIで自動編集したハイライト');
        // 二重セット防止: 一回読んだら捨てる
        sessionStorage.removeItem('ai_edit_result_dataurl');
        // URL から ?from=ai_edit を消す
        window.history.replaceState({}, '', '/post');
      } catch (e) {
        console.error('[post] failed to receive ai_edit blob:', e);
      }
    })();
  }, [searchParams]);

  const handleProUpgrade = async () => {
    if (!user) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ packId: 'pro' }),
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (f: File) => {
    setDurationError(null);
    setFileSizeError(null);
    setVideoDuration(null);
    // ファイルサイズチェック
    const MAX_FREE = 200 * 1024 * 1024; // 200MB
    const MAX_PRO = 500 * 1024 * 1024;  // 500MB
    const limit = isPro ? MAX_PRO : MAX_FREE;
    if (f.size > limit) {
      setFileSizeError(
        isPro
          ? `ファイルサイズが500MBを超えています（${(f.size / 1024 / 1024).toFixed(1)}MB）。Proプランで500MBまでアップロードできます。`
          : `ファイルサイズが200MBを超えています（${(f.size / 1024 / 1024).toFixed(1)}MB）。Proプランにアップグレードすると500MBまでアップロードできます。`
      );
      return;
    }
    const url = URL.createObjectURL(f);
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const dur = vid.duration;
      setVideoDuration(dur);
      if (dur > maxDurationSec) {
        setDurationError(isPro ? `動画は10分以内にしてください（${Math.floor(dur)}秒）` : `無料プランは60秒まで。この動画は${Math.floor(dur)}秒です。`);
      } else {
        setFile(f);
      }
    };
    vid.src = url;
  };

  const handleConvertToVertical = async () => {
    if (!file) return;
    setIsConverting(true);
    try {
      const blob = await convertToVertical(file, { mode: convertMode });
      const converted = new File([blob], file.name.replace(/\.[^.]+$/, '_vertical.mp4'), { type: 'video/mp4' });
      setFile(converted);
    } catch (err: any) {
      alert('縦型変換に失敗しました: ' + err.message);
    } finally {
      setIsConverting(false);
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
    
    if (durationError) return;
    if (fileSizeError) return;
    if (videoDuration !== null && videoDuration > maxDurationSec) return;
    const maxUploads = isPro ? 999999 : 30;
    if (monthlyUploads >= maxUploads) {
      alert(isPro ? 'Upload limit reached.' : 'Free plan: 30 uploads/month. Upgrade to Pro for unlimited uploads!');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const authToken = session?.access_token ?? '';

      // --- Upload video to Cloudflare R2 via presigned URL ---
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 15, 90));
      }, 300);

      const { uploadUrl, publicUrl } = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ filename: file.name, contentType: file.type, type: 'video', fileSize: file.size }),
      }).then(r => r.json());

      if (!uploadUrl) throw new Error('Failed to get upload URL');

      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

      clearInterval(progressInterval);
      setUploadProgress(95);

      // --- Upload thumbnail to R2 (Pro only) ---
      let thumbnailUrl = null;
      if (thumbnail && isPro) {
        const { uploadUrl: thumbUploadUrl, publicUrl: thumbPublicUrl } = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ filename: thumbnail.name, contentType: thumbnail.type, type: 'thumbnail' }),
        }).then(r => r.json());
        if (thumbUploadUrl) {
          await fetch(thumbUploadUrl, { method: 'PUT', body: thumbnail, headers: { 'Content-Type': thumbnail.type } });
          thumbnailUrl = thumbPublicUrl;
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
        tags: hashtags.length > 0 ? hashtags : null,
        is_paid: isPro && isPaidVideo,
        paid_price_coins: isPro && isPaidVideo ? paidPriceCoins : null,
        member_only: isPro && isMemberOnly,
        scheduled_at: isPro && useSchedule && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status: isPro && useSchedule && scheduledAt ? 'scheduled' : 'published',
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

  const maxFileSize = isPro ? 1024 : 200; // MB
  const maxDurationSec = isPro ? 600 : 60;
  const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(1) : '0';

  return (
    <div className="h-[100dvh] overflow-y-auto no-scrollbar bg-[#09090b] text-white font-sans relative">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <motion.button
            onClick={() => router.push('\/')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">Post Clip</h1>
          <div className="flex items-center gap-2">
            {isPro ? (
              <motion.span
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Crown className="w-3 h-3" /> PRO
              </motion.span>
            ) : (
              <motion.button
                onClick={handleProUpgrade}
                className="px-3 py-1.5 bg-white/5 hover:bg-purple-500/20 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5 hover:border-purple-500/30 transition-all flex items-center gap-1"
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="w-3 h-3" /> Upgrade
              </motion.button>
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
            <input type="file" ref={fileInputRef} accept="video/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }} />
            
            {!file ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                <motion.div 
                  animate={dragActive ? { scale: 1.1 } : { scale: 1 }}
                  className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-5"
                >
                  <UploadCloud className={`w-7 h-7 transition-colors ${dragActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                </motion.div>
                <p className="font-black uppercase tracking-widest text-sm mb-1">Drop your clip here</p>
                <p className="text-zinc-500 text-xs font-bold">or click to browse • MP4, WebM • Max {maxFileSize}MB • {isPro ? '10分' : '60秒'}以内</p>
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
                  {videoDuration !== null && (
                    <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black text-zinc-300">
                      {videoDuration >= 60 ? `${Math.floor(videoDuration/60)}m${Math.floor(videoDuration%60)}s` : `${Math.floor(videoDuration)}s`}
                    </div>
                  )}
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-red-500/50 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ファイルサイズエラー表示 */}
          {fileSizeError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-red-400">{fileSizeError}</p>
                {!isPro && (
                  <button
                    type="button"
                    onClick={handleProUpgrade}
                    className="mt-2 text-[10px] font-black text-purple-400 hover:text-purple-300 underline"
                  >
                    Proプランにアップグレード →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 縦型変換ツール (動画選択後に表示) */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">縦型変換 (9:16)</span>
                  </div>
                  <div className="flex items-center gap-1 p-0.5 bg-white/5 rounded-lg border border-white/10">
                    {(['pad', 'crop'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setConvertMode(m)}
                        className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${convertMode === m ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                      >
                        {m === 'pad' ? '黒帯' : 'クロップ'}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 font-bold">
                  {convertMode === 'pad' ? '黒帯付きで全体を表示 — コンテンツが切れない' : '中央クロップで全画面表示 — 端が切れる場合あり'}
                </p>
                <button
                  type="button"
                  onClick={handleConvertToVertical}
                  disabled={isConverting}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-xs font-black text-blue-400 transition-all disabled:opacity-50"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      変換中... {convertProgress > 0 ? `${Math.round(convertProgress)}%` : ''}
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      縦型に変換する
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Pro Feature: Paid Video / Member Only */}
          {isPro && (
            <div className="space-y-3">
              {/* 有料動画トグル */}
              <div className="border border-yellow-500/20 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsPaidVideo(!isPaidVideo)}
                  className={`w-full flex items-center justify-between p-4 transition-all ${isPaidVideo ? 'bg-yellow-500/10' : 'bg-white/[0.02] hover:bg-white/[0.04]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isPaidVideo ? 'bg-yellow-500/20' : 'bg-white/5'}`}>
                      <Lock className={`w-4 h-4 ${isPaidVideo ? 'text-yellow-400' : 'text-zinc-500'}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-white flex items-center gap-1.5">
                        <Crown className="w-3 h-3 text-yellow-400" /> 有料動画（コイン解放）
                      </p>
                      <p className="text-[10px] font-bold text-zinc-500">視聴者がコインを払って視聴</p>
                    </div>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-all ${isPaidVideo ? 'bg-yellow-500' : 'bg-zinc-700'} relative`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isPaidVideo ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </button>
                {isPaidVideo && (
                  <div className="px-4 pb-4 pt-2 bg-yellow-500/5">
                    <label className="text-[9px] font-black text-yellow-400 uppercase tracking-widest mb-2 block">
                      解放価格（コイン）
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[50, 100, 300, 500, 1000].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setPaidPriceCoins(c)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${paidPriceCoins === c ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10'}`}
                        >
                          {c}C
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-yellow-300/60 mt-2">あなたに入る: {Math.floor(paidPriceCoins * 0.7)}C（30%手数料）</p>
                  </div>
                )}
              </div>

              {/* メンバー限定トグル */}
              <button
                type="button"
                onClick={() => setIsMemberOnly(!isMemberOnly)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isMemberOnly ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isMemberOnly ? 'bg-purple-500/20' : 'bg-white/5'}`}>
                    <Crown className={`w-4 h-4 ${isMemberOnly ? 'text-purple-400' : 'text-zinc-500'}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-white">ファンクラブ限定</p>
                    <p className="text-[10px] font-bold text-zinc-500">メンバーだけが視聴可能</p>
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full transition-all ${isMemberOnly ? 'bg-purple-500' : 'bg-zinc-700'} relative`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isMemberOnly ? 'left-5' : 'left-0.5'}`} />
                </div>
              </button>
            </div>
          )}

          {/* Pro Feature: Schedule Post */}
          {isPro && (
            <div>
              <button
                type="button"
                onClick={() => setUseSchedule(!useSchedule)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${useSchedule ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${useSchedule ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                    <Calendar className={`w-4 h-4 ${useSchedule ? 'text-blue-400' : 'text-zinc-500'}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-white flex items-center gap-1.5">
                      <Crown className="w-3 h-3 text-blue-400" /> 予約投稿
                    </p>
                    <p className="text-[10px] font-bold text-zinc-500">指定した日時に自動公開</p>
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full transition-all ${useSchedule ? 'bg-blue-500' : 'bg-zinc-700'} relative`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${useSchedule ? 'left-5' : 'left-0.5'}`} />
                </div>
              </button>
              {useSchedule && (
                <div className="mt-2 px-1">
                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> 公開日時
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                    className="w-full bg-white/5 border border-blue-500/30 focus:border-blue-500/60 p-3 rounded-2xl outline-none font-bold text-sm text-zinc-300"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              )}
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
                <motion.button
                  type="button"
                  onClick={addHashtag}
                  className="px-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors text-xs font-black uppercase"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >+</motion.button>
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
          <motion.button
            type="submit"
            disabled={isSubmitting || !file || !agreedTerms || !title.trim()}
            className={`relative w-full py-5 rounded-2xl overflow-hidden flex justify-center items-center gap-3 font-black text-sm uppercase tracking-[0.15em] transition-all duration-300 ${
              isSubmitting || !file || !agreedTerms || !title.trim()
                ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5' 
                : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98] shadow-xl shadow-blue-600/20'
            }`}
            whileHover={isSubmitting || !file || !agreedTerms || !title.trim() ? {} : { scale: 1.02 }}
            whileTap={isSubmitting || !file || !agreedTerms || !title.trim() ? {} : { scale: 0.98 }}
          >
            {/* Progress bar */}
            {isSubmitting && (
              <div className="absolute left-0 top-0 bottom-0 bg-blue-400/30 transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
            )}
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Uploading...</span></>
            ) : isPro && useSchedule && scheduledAt ? (
              <><Calendar className="w-5 h-5" /><span>Schedule Clip</span></>
            ) : (
              <><UploadCloud className="w-5 h-5" /><span>Post Clip</span></>
            )}
          </motion.button>
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
