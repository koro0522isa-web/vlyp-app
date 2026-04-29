"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { UploadCloud, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter } from 'next/navigation';

const GAMES = [
  "VALORANT", "Apex Legends", "League of Legends", "Street Fighter 6", 
  "Overwatch 2", "Minecraft", "Fortnite", "Call of Duty", 
  "CS2", "Tekken 8", "Genshin Impact", "Other"
];
const MAX_FILE_SIZE_MB = 200;

// クライアント側でファイルのSHA-256ハッシュを計算する関数
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function Post() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [gameTitle, setGameTitle] = useState('VALORANT');
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) window.location.href = '/';
    });
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting || !file) return;
    setIsSubmitting(true);

    try {
      // 1. ファイルサイズチェック
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(t('post.sizeError') || 'File too large');
        setIsSubmitting(false);
        return;
      }

      // 2. 無断転載防止：ファイルハッシュの計算と重複チェック
      const fileHash = await calculateFileHash(file);
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

      // 3. Supabase Storage へアップロード
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(t('post.uploadError') || 'Upload failed');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      // 4. クリップデータの保存
      const { data: clipData, error: insertError } = await supabase.from('clips').insert({
        title,
        url: null, // YouTube URLは完全廃止
        video_url: publicUrl,
        game_title: gameTitle,
        user_id: user.id,
        user_name: user.email?.split('@')[0],
        views: 0,
        likes: 0
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
    <div className="min-h-screen bg-black text-white p-6 md:p-12 flex items-center justify-center font-sans relative">
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
              Protected by VLYP Anti-Piracy
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

            <div className="pt-6">
              <button 
                type="submit"
                disabled={isSubmitting || !file}
                className={`w-full py-6 rounded-[2rem] flex justify-center items-center gap-3 font-black text-xl uppercase tracking-tighter transition-all shadow-2xl ${
                  isSubmitting || !file ? 'bg-zinc-800 text-zinc-500' : 'bg-cyan-400 text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                }`}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /> ...</>
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
  );
}