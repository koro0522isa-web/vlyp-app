"use client";
import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { UploadCloud, Loader2, ShieldCheck, ArrowLeft, Crown, Sparkles, Lock, Mic } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { generateEmbedding, generateVoiceover } from '../lib/ai';
import { useVideoProcessor } from '../hooks/useVideoProcessor';

const GAMES = [
  "VALORANT", "Apex Legends", "League of Legends", "Street Fighter 6", 
  "Overwatch 2", "Minecraft", "Fortnite", "Call of Duty", 
  "CS2", "Tekken 8", "Genshin Impact", "Other"
];
const MAX_FILE_SIZE_MB = 50;

// クライアント側でファイルのSHA-256ハッシュを計算する関数
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function PostContent() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [gameTitle, setGameTitle] = useState('VALORANT');
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bgms, setBgms] = useState<any[]>([]);
  const [selectedBgm, setSelectedBgm] = useState<string>('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // SaaS State
  const [isPro, setIsPro] = useState(false);
  const [monthlyUploads, setMonthlyUploads] = useState(0);
  const [useAI, setUseAI] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceoverText, setVoiceoverText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<'male' | 'female'>('female');
  const { mixVideoWithBgm, progress: processingProgress } = useVideoProcessor();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser) {
        window.location.href = '/';
        return;
      }

      // Fetch SaaS profile data
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
    
    // BGMライブラリの取得
    supabase.from('bgm_library').select('*').then(({ data }) => {
      if (data) setBgms(data);
    });
  }, []);

  const handleProUpgrade = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: 'pro', userId: user.id }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (error: any) {
      console.error(error);
      alert(`エラー: ${error.message}`);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting || !file) return;
    setIsSubmitting(true);

    try {
      // 0. SaaS Limits Check
      if (!isPro && monthlyUploads >= 30) {
        alert('You have reached the monthly upload limit for Free users. Please upgrade to Pro!');
        setIsSubmitting(false);
        return;
      }

      let fileToUpload = file;

      // 1. Pro機能: BGM & Voiceoverミックス
      if (isPro && (selectedBgm || voiceoverText)) {
        setIsProcessing(true);
        try {
          const bgm = selectedBgm ? bgms.find(b => b.id === selectedBgm) : null;
          
          // ナレーション音声の生成
          let narrationBlob = null;
          if (voiceoverText) {
            narrationBlob = await generateVoiceover(voiceoverText, selectedVoice);
          }
          
          const narrationUrl = narrationBlob ? URL.createObjectURL(narrationBlob) : undefined;
          const mixedBlob = await mixVideoWithBgm(file, bgm?.url || '', narrationUrl);
          fileToUpload = new File([mixedBlob], `processed_${file.name}`, { type: 'video/mp4' });
          
          if (narrationUrl) URL.revokeObjectURL(narrationUrl);
        } catch (mixErr) {
          console.error('Processing failed:', mixErr);
          alert('動画の加工に失敗しました。元の動画でアップロードを継続します。');
        } finally {
          setIsProcessing(false);
        }
      }

      // 2. ファイルサイズチェック
      if (fileToUpload.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(t('post.sizeError') || 'File too large');
        setIsSubmitting(false);
        return;
      }

      // 3. 無断転載防止：ファイルハッシュの計算と重複チェック
      const fileHash = await calculateFileHash(fileToUpload);
      const { data: duplicateCheck } = await supabase
        .from('file_hashes')
        .select('id')
        .eq('hash', fileHash)
        .maybeSingle();

      if (duplicateCheck) {
        alert(t('post.duplicateError') || 'This video was already posted');
        setIsSubmitting(false);
        return;
      }

      // 4. Supabase Storage へアップロード
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, fileToUpload);

      if (uploadError) {
        throw new Error(t('post.uploadError') || 'Upload failed');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      // 4. AIによるタイトルベクトルの生成 (推奨エンジン用)
      const embedding = await generateEmbedding(`${title} ${gameTitle}`);

      // 5. Fetch display name from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .maybeSingle();
      const displayName = profileData?.display_name || profileData?.username || user.email?.split('@')[0] || 'Player';

      // 6. クリップデータの保存
      const { data: clipData, error: insertError } = await supabase.from('clips').insert({
        title,
        url: null, 
        video_url: publicUrl,
        game_title: gameTitle,
        user_id: user.id,
        user_name: displayName,
        views: 0,
        likes: 0,
        embedding: embedding
      }).select().single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // 5. ハッシュ値を保存して今後の重複アップロードを防止
      if (clipData) {
        await supabase.from('file_hashes').insert({
          hash: fileHash,
          clip_id: clipData.id,
          uploader_id: user.id
        });
      }

      alert(t('post.success') || 'Posted!');
      router.push('/');
      
    } catch (err: any) {
      console.error('Full upload error:', err);
      // 詳細なエラーメッセージを表示するように強化
      const errMsg = err.message || 'Unknown error';
      alert(`Error: ${errMsg}\n\n${t('post.uploadError')}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-black text-white p-6 md:p-12 overflow-y-auto font-sans relative">
      <div className="min-h-full flex items-center justify-center py-10">
      <div className="absolute top-8 left-8">
        <button onClick={() => router.push('/')} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full max-w-2xl bg-zinc-900/30 border border-zinc-800 p-8 md:p-12 rounded-[3rem] glass relative overflow-hidden">
        <div className="relative z-10">
          <header className="mb-10">
            <h1 className="text-4xl font-black italic text-cyan-400 tracking-tighter uppercase neon-glow mb-2">{t('post.title')}</h1>
            <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              {t('post.sizeLimitMsg')}
            </p>
          </header>

          <form onSubmit={handlePost} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-cyan-400/60 uppercase tracking-[0.2em] mb-3">{t('post.titleLabel') || 'Clip Title'}</label>
              <input 
                required
                className="w-full bg-white/5 border border-zinc-800 p-5 rounded-2xl focus:border-cyan-400 outline-none transition-all text-lg font-bold"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="1v5 Clutch in Radiant!"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">{t('post.fileLabel') || 'Video File'}</label>
              <div 
                className={`w-full border-2 border-dashed ${file ? 'border-cyan-500 bg-cyan-500/5' : 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-500'} rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  accept="video/mp4,video/quicktime,video/webm"
                  required
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <UploadCloud className={`w-10 h-10 ${file ? 'text-cyan-500' : 'text-zinc-600'}`} />
                {file ? (
                  <div>
                    <p className="text-cyan-400 font-bold text-sm mb-1">{file.name}</p>
                    <p className="text-zinc-500 text-xs">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm font-bold">{t('post.fileLabel')}</p>
                )}
              </div>
              <p className="text-[9px] text-zinc-600 font-bold mt-3 ml-2 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500/50" />
                {lang === 'JP' ? 'アップロード時に指紋をチェックし、無断転載を防止します。' : 'Protected by VLYP Anti-Piracy system.'}
              </p>
            </div>

            {/* SaaS Tier Status & AI Features */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1">Your Plan</h3>
                  {isPro ? (
                    <div className="flex items-center gap-2 text-pink-500">
                      <Crown className="w-5 h-5" />
                      <span className="font-black tracking-widest">VLYP PRO</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <span className="font-black tracking-widest">FREE TIER</span>
                      <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">{monthlyUploads} / 30 Uploads</span>
                    </div>
                  )}
                </div>
                {!isPro && (
                  <button type="button" onClick={handleProUpgrade} className="text-[10px] bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform">
                    Upgrade
                  </button>
                )}
              </div>

              <div className={`p-4 rounded-xl border ${isPro ? 'border-pink-500/30 bg-pink-500/5' : 'border-zinc-800 bg-zinc-800/30'} flex justify-between items-center transition-colors`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isPro ? 'bg-pink-500/20 text-pink-500' : 'bg-zinc-800 text-zinc-500'}`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`font-black text-sm ${isPro ? 'text-pink-400' : 'text-zinc-400'}`}>AI Auto-Highlight (Beta)</h4>
                    <p className="text-[10px] text-zinc-500">Automatically cut to the best moments</p>
                  </div>
                </div>
                {isPro ? (
                  <div className="space-y-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={useAI} onChange={() => setUseAI(!useAI)} />
                      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                    </label>

                    <div className="pt-4 border-t border-white/5">
                      <label className="block text-[10px] font-black text-pink-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Mic className="w-3 h-3" /> AI Voiceover (Pro Only)
                      </label>
                      <textarea 
                        className="w-full bg-white/5 border border-zinc-800 p-3 rounded-xl focus:border-pink-500 outline-none text-xs text-zinc-300 min-h-[60px]"
                        placeholder="Enter text for AI to read over your video..."
                        value={voiceoverText}
                        onChange={(e) => setVoiceoverText(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        {['female', 'male'].map((v: any) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setSelectedVoice(v)}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${selectedVoice === v ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-zinc-600 text-xs font-bold uppercase tracking-widest">
                    <Lock className="w-3 h-3" /> PRO
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">{t('post.gameLabel') || 'Game Title'}</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-2xl focus:border-cyan-400 outline-none appearance-none font-bold"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
              >
                {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">Add Royalty-Free BGM (Optional)</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-2xl focus:border-cyan-400 outline-none appearance-none font-bold text-zinc-300"
                value={selectedBgm}
                onChange={(e) => setSelectedBgm(e.target.value)}
              >
                <option value="">No BGM / Already edited</option>
                {bgms.map(b => <option key={b.id} value={b.id}>{b.title} - {b.artist}</option>)}
              </select>
              <p className="text-[9px] text-emerald-500/70 font-bold mt-2 ml-2 italic">※ These tracks are safe for copyright and won't be flagged by AI.</p>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2 text-red-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Copyright Policy</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-bold">
                {lang === 'JP' ? '動画内で無断の音楽使用がAIによって検知された場合、動画は自動的に非公開になります。' : 'Videos with unauthorized music detected by AI will be automatically set to private.'}
              </p>
              <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded bg-zinc-800 border-zinc-700 checked:bg-cyan-400"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                />
                <span className="text-[10px] font-black text-zinc-400 group-hover:text-white transition-colors uppercase tracking-widest">I agree to the copyright terms</span>
              </label>
            </div>


            <div className="pt-6">
              <button 
                type="submit"
                disabled={isSubmitting || !file || !agreedTerms}
                className={`w-full py-6 rounded-[2rem] flex justify-center items-center gap-3 font-black text-xl uppercase tracking-tighter transition-all shadow-2xl ${
                  isSubmitting || !file || !agreedTerms ? 'bg-zinc-800 text-zinc-500' : 'bg-cyan-400 text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                }`}
              >
                {isSubmitting || isProcessing ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>{isProcessing ? `Processing Video (${Math.round(processingProgress)}%)` : 'Uploading...'}</span>
                    </div>
                    {isProcessing && (
                      <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-400 transition-all duration-300" 
                          style={{ width: `${processingProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  t('post.uploadBtn')
                )}
              </button>
              <button 
                type="button"
                onClick={() => window.location.href = '/'}
                className="w-full mt-4 text-[10px] font-black text-zinc-600 hover:text-white uppercase tracking-widest transition-colors"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function Post() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    }>
      <PostContent />
    </Suspense>
  );
}