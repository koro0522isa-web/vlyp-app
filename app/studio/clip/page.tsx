'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useVideoProcessor } from '@/app/hooks/useVideoProcessor';

interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ['アップロード', 'AI処理', '編集', '投稿'];

export default function ClipEditorPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [editingSubtitleIdx, setEditingSubtitleIdx] = useState<number | null>(null);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [convertVertical, setConvertVertical] = useState(true);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [language, setLanguage] = useState<'ja' | 'en' | 'auto'>('ja');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { load, isLoaded, progress, extractAudio, convertToVertical } = useVideoProcessor();

  // 認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/login');
    };
    checkAuth();
  }, [router]);

  // ファイル選択処理
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('動画ファイルを選択してください (MP4, MOV, WEBM, AVI)');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('ファイルサイズは500MB以下にしてください');
      return;
    }
    setError(null);
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setStep(2);
    processVideo(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setVideoDuration(dur);
      setTrimEnd(dur);
    }
  };

  // AI処理: 音声抽出 → Whisper字幕生成
  const processVideo = async (file: File) => {
    setError(null);
    try {
      setProcessingStatus('AI処理エンジンを読み込み中...');
      setProcessingProgress(10);
      await load();

      setProcessingStatus('音声を抽出中...');
      setProcessingProgress(30);

      let audioBlob: Blob | null = null;
      try {
        audioBlob = await (extractAudio as unknown as (f: File) => Promise<Blob>)(file);
      } catch (e) {
        console.warn('音声抽出失敗:', e);
      }

      if (audioBlob) {
        setProcessingStatus('字幕を生成中... (Whisper AI)');
        setProcessingProgress(60);

        const formData = new FormData();
        formData.append('audioBlob', audioBlob, 'audio.mp3');
        formData.append('language', language);

        try {
          const res = await fetch('/api/generate-subtitles', {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            setSubtitles(data.subtitles || []);
          } else {
            console.warn('字幕API失敗 — 字幕なしで続行');
            setSubtitles([]);
          }
        } catch (e) {
          console.warn('字幕API呼び出し失敗:', e);
          setSubtitles([]);
        }
      }

      setProcessingProgress(100);
      setProcessingStatus('完了');
      setTimeout(() => setStep(3), 400);
    } catch (err) {
      console.error('AI処理エラー:', err);
      setError('処理中にエラーが発生しました。字幕なしで続けます。');
      setProcessingProgress(100);
      setTimeout(() => setStep(3), 800);
    }
  };

  // エクスポート
  const handleExport = async () => {
    if (!videoFile) return;
    setStep(4);
    setError(null);
    setProcessingStatus('動画を書き出し中...');
    setProcessingProgress(20);

    try {
      let outputBlob: Blob;
      if (convertVertical) {
        setProcessingStatus('縦型 (9:16) に変換中...');
        outputBlob = await (convertToVertical as unknown as (f: File, mode: string) => Promise<Blob>)(videoFile, 'pad');
      } else {
        outputBlob = videoFile;
      }
      setProcessedBlob(outputBlob);
      const url = URL.createObjectURL(outputBlob);
      setProcessedUrl(url);
      setProcessingProgress(100);
      setProcessingStatus('完了！');
    } catch (err) {
      console.error('エクスポートエラー:', err);
      setError('動画の書き出しに失敗しました。');
    }
  };

  const handlePostToVLYP = () => {
    if (!processedUrl) return;
    sessionStorage.setItem('clip_editor_url', processedUrl);
    sessionStorage.setItem('clip_editor_filename', videoFile?.name || 'clip.mp4');
    router.push('/post?from=clip_editor');
  };

  const handleDownload = () => {
    if (!processedUrl) return;
    const a = document.createElement('a');
    a.href = processedUrl;
    a.download = `vlyp_${videoFile?.name || 'clip.mp4'}`;
    a.click();
  };

  const updateSubtitle = (idx: number, text: string) => {
    setSubtitles(prev => prev.map((s, i) => i === idx ? { ...s, text } : s));
  };

  // ---- レンダリング ----

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* ヘッダー */}
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white transition-colors text-sm"
          >
            ← 戻る
          </button>
          <h1 className="text-lg font-bold">AI クリップエディタ</h1>
          <span className="text-xs text-violet-400 bg-violet-900/30 px-2 py-0.5 rounded border border-violet-800">
            Beta
          </span>
        </div>
      </div>

      {/* ステップインジケーター */}
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-1 sm:gap-2">
          {STEP_LABELS.map((label, i) => {
            const s = (i + 1) as Step;
            const isActive = step === s;
            const isDone = step > s;
            return (
              <div key={s} className="flex items-center gap-1 sm:gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isDone ? 'bg-violet-600 text-white' :
                  isActive ? 'bg-violet-500 text-white ring-2 ring-violet-400 ring-offset-2 ring-offset-zinc-950' :
                  'bg-zinc-800 text-zinc-500'
                }`}>
                  {isDone ? '✓' : s}
                </div>
                <span className={`text-xs hidden sm:block ${isActive ? 'text-white font-medium' : 'text-zinc-600'}`}>
                  {label}
                </span>
                {i < 3 && <div className="w-4 sm:w-8 h-px bg-zinc-800 mx-1" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {error && (
          <div className="mb-6 p-3 bg-red-950/50 border border-red-800 rounded-lg text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* ── Step 1: アップロード ── */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center min-h-[420px] gap-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-violet-500 bg-violet-900/20 scale-[1.02]'
                  : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/40'
              }`}
            >
              <div className="text-5xl mb-4">🎮</div>
              <p className="text-base font-semibold mb-1">動画をドラッグ&ドロップ</p>
              <p className="text-zinc-500 text-sm mb-4">または クリックしてファイルを選択</p>
              <p className="text-zinc-600 text-xs">MP4 / MOV / WEBM / AVI — 最大 500 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>

            {/* 言語選択 */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">字幕言語:</span>
              {(['ja', 'en', 'auto'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    language === lang
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {lang === 'ja' ? '🇯🇵 日本語' : lang === 'en' ? '🇺🇸 英語' : '🌐 自動検出'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: AI処理 ── */}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center min-h-[420px] gap-6">
            {videoUrl && (
              <video src={videoUrl} className="w-48 h-28 object-cover rounded-xl opacity-60 border border-zinc-800" muted />
            )}
            <div className="text-center">
              <div className="text-3xl mb-3 animate-pulse">✨</div>
              <p className="text-base font-semibold text-white mb-1">{processingStatus || 'AI処理中...'}</p>
              <p className="text-sm text-zinc-500">動画を解析してAIが字幕を生成しています</p>
            </div>
            <div className="w-full max-w-xs">
              <div className="bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-600 to-blue-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <p className="text-right text-xs text-zinc-500 mt-1">{processingProgress}%</p>
            </div>
          </div>
        )}

        {/* ── Step 3: 編集 ── */}
        {step === 3 && videoUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 左: プレビュー + トリム */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">プレビュー</h2>
              <div className="bg-black rounded-xl overflow-hidden aspect-video border border-zinc-800">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  onLoadedMetadata={handleVideoLoaded}
                />
              </div>

              {videoDuration > 0 && (
                <div className="bg-zinc-900 rounded-xl p-4 space-y-3 border border-zinc-800">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">トリム</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 w-20">開始 {trimStart.toFixed(1)}s</span>
                      <input type="range" min={0} max={videoDuration} step={0.1} value={trimStart}
                        onChange={e => setTrimStart(Number(e.target.value))}
                        className="flex-1 accent-violet-500" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 w-20">終了 {trimEnd.toFixed(1)}s</span>
                      <input type="range" min={0} max={videoDuration} step={0.1} value={trimEnd}
                        onChange={e => setTrimEnd(Number(e.target.value))}
                        className="flex-1 accent-violet-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 右: 設定 + 字幕 */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">編集設定</h2>

              {/* 縦型変換トグル */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">縦型変換 (9:16)</p>
                  <p className="text-xs text-zinc-500 mt-0.5">TikTok / YouTube Shorts 対応</p>
                </div>
                <button
                  onClick={() => setConvertVertical(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${convertVertical ? 'bg-violet-600' : 'bg-zinc-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${convertVertical ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* 字幕トグル */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">字幕を表示</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {subtitles.length > 0 ? `${subtitles.length} 行を生成済み` : '字幕なし'}
                  </p>
                </div>
                <button
                  onClick={() => setShowSubtitles(v => !v)}
                  disabled={subtitles.length === 0}
                  className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-40 ${showSubtitles && subtitles.length > 0 ? 'bg-violet-600' : 'bg-zinc-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showSubtitles && subtitles.length > 0 ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* 字幕リスト */}
              {showSubtitles && subtitles.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                    字幕編集 <span className="text-zinc-600 normal-case">（行をクリックで編集）</span>
                  </p>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {subtitles.map((sub, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 cursor-pointer transition-colors"
                        onClick={() => setEditingSubtitleIdx(editingSubtitleIdx === idx ? null : idx)}
                      >
                        <span className="text-xs text-violet-400 w-14 shrink-0 pt-0.5 font-mono">
                          {sub.startTime.toFixed(1)}s
                        </span>
                        {editingSubtitleIdx === idx ? (
                          <input
                            value={sub.text}
                            onChange={e => updateSubtitle(idx, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 bg-zinc-700 rounded px-2 py-0.5 text-sm outline-none border border-violet-500 focus:ring-1 focus:ring-violet-400"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm flex-1 leading-relaxed">{sub.text}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {subtitles.length === 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-sm text-zinc-500">字幕は生成されませんでした</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Vercel に <code className="bg-zinc-800 px-1 rounded">OPENAI_API_KEY</code> を設定すると字幕が使えます
                  </p>
                </div>
              )}

              {/* 書き出しボタン */}
              <button
                onClick={handleExport}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 rounded-xl font-semibold transition-colors text-sm"
              >
                書き出して投稿へ →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: 書き出し & 投稿 ── */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center min-h-[420px] gap-6">
            {processingProgress < 100 ? (
              <>
                <div className="text-4xl animate-spin">🎬</div>
                <p className="text-base font-semibold">{processingStatus}</p>
                <div className="w-full max-w-xs">
                  <div className="bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-violet-600 to-blue-500 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl">🎉</div>
                <div className="text-center">
                  <p className="text-xl font-bold mb-1">書き出し完了！</p>
                  <p className="text-sm text-zinc-500">VLYPに投稿するか、ダウンロードしてください</p>
                </div>

                {processedUrl && (
                  <video
                    src={processedUrl}
                    className="rounded-xl max-h-56 border border-zinc-700 shadow-lg"
                    controls
                  />
                )}

                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={handlePostToVLYP}
                    className="px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-colors text-sm"
                  >
                    🚀 VLYPに投稿
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-semibold transition-colors text-sm"
                  >
                    ⬇️ ダウンロード
                  </button>
     