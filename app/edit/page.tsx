'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Wand2,
  Upload,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Crown,
  Sparkles,
  Zap,
  Volume2,
  Scissors,
  Film,
  ChevronRight,
  Lock,
  RotateCcw,
  Download,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ProcessStep =
  | 'idle'
  | 'loading_ffmpeg'
  | 'analyzing_audio'
  | 'detecting_highlights'
  | 'cutting_clips'
  | 'compositing'
  | 'done'
  | 'error';

interface HighlightClip {
  start: number;
  end: number;
  peakVolume: number;
}

const STEP_LABELS: Record<ProcessStep, string> = {
  idle: '',
  loading_ffmpeg: 'エンジン初期化中...',
  analyzing_audio: '音声解析中...',
  detecting_highlights: 'ハイライト検出中...',
  cutting_clips: 'クリップ切り出し中...',
  compositing: '縦型に変換・合成中...',
  done: '完成！',
  error: 'エラー',
};

const STEP_ORDER: ProcessStep[] = [
  'loading_ffmpeg',
  'analyzing_audio',
  'detecting_highlights',
  'cutting_clips',
  'compositing',
  'done',
];

// ---------------------------------------------------------------------------
// Audio analysis helpers (pure browser, no FFmpeg)
// ---------------------------------------------------------------------------
async function analyzeAudioPeaks(file: File): Promise<HighlightClip[]> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await audioCtx.close();
  }

  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // RMS over 500ms windows
  const windowSamples = Math.floor(sampleRate * 0.5);
  const rmsValues: { time: number; rms: number }[] = [];

  for (let i = 0; i + windowSamples < channelData.length; i += windowSamples) {
    let sum = 0;
    for (let j = i; j < i + windowSamples; j++) {
      sum += channelData[j] * channelData[j];
    }
    const rms = Math.sqrt(sum / windowSamples);
    rmsValues.push({ time: i / sampleRate, rms });
  }

  // Sort by RMS descending, pick top peaks with minimum 8s spacing
  const sorted = [...rmsValues].sort((a, b) => b.rms - a.rms);
  const peaks: { time: number; rms: number }[] = [];
  const MIN_SPACING = 8;

  for (const candidate of sorted) {
    if (peaks.length >= 5) break;
    const tooClose = peaks.some((p) => Math.abs(p.time - candidate.time) < MIN_SPACING);
    if (!tooClose) peaks.push(candidate);
  }

  peaks.sort((a, b) => a.time - b.time);

  const CLIP_RADIUS = 5;
  return peaks.map((p) => ({
    start: Math.max(0, p.time - CLIP_RADIUS),
    end: Math.min(duration, p.time + CLIP_RADIUS),
    peakVolume: p.rms,
  }));
}

// ---------------------------------------------------------------------------
// FFmpeg processing
// ---------------------------------------------------------------------------
async function loadFFmpeg(onProgress: (n: number) => void) {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');

  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }: { progress: number }) => {
    onProgress(Math.round(progress * 100));
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

async function buildHighlightReel(
  ffmpeg: any,
  videoFile: File,
  clips: HighlightClip[],
  onProgress: (n: number) => void
): Promise<Blob> {
  const { fetchFile } = await import('@ffmpeg/util');

  await ffmpeg.writeFile('source.mp4', await fetchFile(videoFile));

  const segmentFiles: string[] = [];
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const dur = clip.end - clip.start;
    const outName = `seg${i}.mp4`;

    const vf = [
      `scale=1080:1920:force_original_aspect_ratio=increase`,
      `crop=1080:1920`,
      `fade=t=in:st=0:d=0.4`,
      `fade=t=out:st=${Math.max(0, dur - 0.4).toFixed(2)}:d=0.4`,
    ].join(',');

    const af = [
      `afade=t=in:ss=0:d=0.4`,
      `afade=t=out:st=${Math.max(0, dur - 0.4).toFixed(2)}:d=0.4`,
    ].join(',');

    await ffmpeg.exec([
      '-ss', clip.start.toFixed(2),
      '-t', dur.toFixed(2),
      '-i', 'source.mp4',
      '-vf', vf,
      '-af', af,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'ultrafast',
      '-crf', '26',
      '-r', '30',
      outName,
    ]);

    segmentFiles.push(outName);
    onProgress(Math.round(((i + 1) / clips.length) * 60));
  }

  const concatList = segmentFiles.map((f) => `file '${f}'`).join('\n');
  const encoder = new TextEncoder();
  await ffmpeg.writeFile('concat.txt', encoder.encode(concatList));

  await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'ultrafast',
    '-crf', '24',
    'highlight_raw.mp4',
  ]);

  onProgress(80);

  await ffmpeg.exec([
    '-i', 'highlight_raw.mp4',
    '-vf',
    `drawtext=text='HIGHLIGHT':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=80:box=1:boxcolor=black@0.45:boxborderw=12:font=sans-bold`,
    '-c:v', 'libx264',
    '-c:a', 'copy',
    '-preset', 'ultrafast',
    '-crf', '24',
    'output_final.mp4',
  ]);

  onProgress(100);

  const data = await ffmpeg.readFile('output_final.mp4');
  return new Blob([data as any], { type: 'video/mp4' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AIEditPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const [freeUsed, setFreeUsed] = useState(false);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [step, setStep] = useState<ProcessStep>('idle');
  const [subProgress, setSubProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [detectedClips, setDetectedClips] = useState<HighlightClip[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const resultVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_pro')
          .eq('id', u.id)
          .maybeSingle();
        setIsPro(profile?.is_pro ?? false);
        const usedKey = `ai_edit_free_used_${u.id}`;
        setFreeUsed(!!localStorage.getItem(usedKey));
      }
    });
  }, []);

  const canUse = isPro || !freeUsed;

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) return;
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    setResultBlob(null);
    setResultUrl(null);
    setStep('idle');
    setDetectedClips([]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleProcess = async () => {
    if (!videoFile) return;
    if (!canUse) return;

    setStep('loading_ffmpeg');
    setSubProgress(0);
    setErrorMsg('');

    try {
      const ffmpeg = await loadFFmpeg((p) => setSubProgress(p));
      setStep('analyzing_audio');
      setSubProgress(0);

      const clips = await analyzeAudioPeaks(videoFile);
      setDetectedClips(clips);
      setStep('detecting_highlights');
      setSubProgress(100);

      if (clips.length === 0) {
        throw new Error('ハイライトシーンが検出できませんでした。音声があるゲーム動画を使用してください。');
      }

      setStep('cutting_clips');
      setSubProgress(0);

      const result = await buildHighlightReel(ffmpeg, videoFile, clips, (p) => {
        if (p <= 60) {
          setStep('cutting_clips');
          setSubProgress(p);
        } else {
          setStep('compositing');
          setSubProgress(p - 60);
        }
      });

      if (!isPro && user) {
        localStorage.setItem(`ai_edit_free_used_${user.id}`, '1');
        setFreeUsed(true);
      }

      const url = URL.createObjectURL(result);
      setResultBlob(result);
      setResultUrl(url);
      setStep('done');
      setSubProgress(100);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? '不明なエラーが発生しました');
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('idle');
    setSubProgress(0);
    setResultBlob(null);
    setResultUrl(null);
    setDetectedClips([]);
    setVideoFile(null);
    setVideoPreviewUrl(null);
  };

  const handlePostToVLYP = () => {
    if (!resultBlob) return;
    const reader = new FileReader();
    reader.onload = () => {
      sessionStorage.setItem('ai_edit_result_dataurl', reader.result as string);
      router.push('/post?from=ai_edit');
    };
    reader.readAsDataURL(resultBlob);
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'vlyp_highlight.mp4';
    a.click();
  };

  const togglePlayPause = () => {
    if (!resultVideoRef.current) return;
    if (resultVideoRef.current.paused) {
      resultVideoRef.current.play();
      setIsPlaying(true);
    } else {
      resultVideoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const currentStepIndex = STEP_ORDER.indexOf(step);
  const isProcessing = step !== 'idle' && step !== 'done' && step !== 'error';

  return (
    <div className="min-h-screen bg-[#06060A] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-5 border-b border-white/5">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors text-sm font-black uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">AI Auto Edit</h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">
              ゲーム動画 → ハイライトクリップ
            </p>
          </div>
        </div>
        {isPro ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">Pro</span>
          </div>
        ) : (
          <Link
            href="/membership"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-full hover:border-purple-400/50 transition-colors"
          >
            <Crown className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Pro限定</span>
          </Link>
        )}
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left column: Upload + controls */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Free trial notice */}
          {!isPro && (
            <div
              className={`flex items-start gap-3 p-4 rounded-2xl border text-sm ${
                freeUsed
                  ? 'bg-red-500/10 border-red-500/20 text-red-300'
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
              }`}
            >
              {freeUsed ? (
                <>
                  <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="font-black text-xs leading-relaxed">
                    無料体験は使用済みです。{' '}
                    <Link href="/membership" className="underline hover:text-yellow-100">
                      Proにアップグレード
                    </Link>
                    すると無制限で使えます。
                  </span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="font-black text-xs leading-relaxed">
                    初回1回無料で体験できます。2回目以降は{' '}
                    <Link href="/membership" className="underline hover:text-yellow-100">
                      Proプラン
                    </Link>
                    が必要です。
                  </span>
                </>
              )}
            </div>
          )}

          {/* Drop zone */}
          {step === 'idle' && !videoFile && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-300 min-h-[340px]
                ${dragOver
                  ? 'border-violet-500 bg-violet-500/10 scale-[1.01]'
                  : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
                }
              `}
            >
              <div
                className={`absolute inset-0 rounded-3xl transition-opacity duration-300 ${dragOver ? 'opacity-100' : 'opacity-0'}`}
                style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)' }}
              />

              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${dragOver ? 'bg-violet-600/30 scale-110' : 'bg-white/5'}`}>
                  <Upload className={`w-9 h-9 transition-colors ${dragOver ? 'text-violet-400' : 'text-zinc-500'}`} />
                </div>
                <div className="text-center">
                  <p className="text-base font-black text-zinc-200">ゲーム動画をドロップ</p>
                  <p className="text-xs text-zinc-600 mt-1 font-medium">または クリックしてファイルを選択</p>
                  <p className="text-[10px] text-zinc-700 mt-3 font-black uppercase tracking-widest">
                    MP4 / MOV / AVI · 最大 2GB
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
              />
            </div>
          )}

          {/* Source video preview */}
          {videoFile && step === 'idle' && (
            <div className="rounded-3xl overflow-hidden bg-black border border-white/10">
              <video
                src={videoPreviewUrl ?? undefined}
                controls
                className="w-full max-h-[280px] object-contain"
              />
              <div className="px-5 py-4 flex items-center justify-between border-t border-white/5">
                <div>
                  <p className="text-sm font-black text-zinc-200 truncate">{videoFile.name}</p>
                  <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">
                    {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors"
                  title="別の動画を選ぶ"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Start button */}
          {videoFile && step === 'idle' && (
            <button
              onClick={handleProcess}
              disabled={!canUse}
              className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden group
                ${canUse
                  ? 'bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] active:scale-95'
                  : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                }
              `}
            >
              {canUse && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              )}
              {canUse ? (
                <>
                  <Wand2 className="w-5 h-5" />
                  AIでハイライト生成
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Pro限定機能
                </>
              )}
            </button>
          )}

          {/* Processing UI */}
          {isProcessing && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center animate-pulse">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-200">{STEP_LABELS[step]}</p>
                  <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">
                    ブラウザ上で処理中 — 閉じないでください
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-300"
                    style={{ width: `${subProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-600 font-black text-right">{subProgress}%</p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {STEP_ORDER.filter((s) => s !== 'done').map((s) => {
                  const idx = STEP_ORDER.indexOf(s);
                  const current = STEP_ORDER.indexOf(step);
                  const state = idx < current ? 'done' : idx === current ? 'active' : 'pending';
                  return (
                    <div key={s} className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full transition-all ${
                      state === 'done' ? 'bg-green-500/15 text-green-400' :
                      state === 'active' ? 'bg-violet-500/20 text-violet-300 animate-pulse' :
                      'bg-white/5 text-zinc-700'
                    }`}>
                      {state === 'done' && <CheckCircle2 className="w-2.5 h-2.5" />}
                      {STEP_LABELS[s].replace('...', '')}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-red-300">処理に失敗しました</p>
                  <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="self-start px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-black text-xs uppercase tracking-widest text-zinc-300 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                やり直す
              </button>
            </div>
          )}

          {/* Detected clips info */}
          {detectedClips.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                <Volume2 className="w-3 h-3" />
                検出されたハイライト ({detectedClips.length}箇所)
              </p>
              <div className="flex flex-wrap gap-2">
                {detectedClips.map((c, i) => (
                  <div key={i} className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full flex items-center gap-2">
                    <Scissors className="w-3 h-3 text-violet-400" />
                    <span className="text-[10px] font-black text-violet-300">
                      {Math.floor(c.start / 60)}:{String(Math.floor(c.start % 60)).padStart(2, '0')}
                      {' - '}
                      {Math.floor(c.end / 60)}:{String(Math.floor(c.end % 60)).padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Result preview */}
        <div className="lg:w-[340px] flex flex-col gap-5">
          {step === 'done' && resultUrl ? (
            <>
              <div className="rounded-3xl overflow-hidden border border-violet-500/30 bg-black shadow-[0_0_40px_rgba(139,92,246,0.15)] relative">
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full backdrop-blur-sm">
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-green-300">完成</span>
                </div>

                <video
                  ref={resultVideoRef}
                  src={resultUrl}
                  className="w-full"
                  style={{ aspectRatio: '9/16', objectFit: 'cover' }}
                  loop
                  playsInline
                  onEnded={() => setIsPlaying(false)}
                />

                <button
                  onClick={togglePlayPause}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
                >
                  <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isPlaying ? (
                      <Pause className="w-6 h-6 text-white" />
                    ) : (
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    )}
                  </div>
                </button>
              </div>

              <button
                onClick={handlePostToVLYP}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] active:scale-95 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <Zap className="w-4 h-4" />
                VLYPに投稿
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleDownload}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all text-zinc-300"
              >
                <Download className="w-4 h-4" />
                ダウンロード
              </button>

              <button
                onClick={handleReset}
                className="w-full py-3 text-zinc-600 hover:text-zinc-400 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                別の動画で試す
              </button>
            </>
          ) : (
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-5 p-10 min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <Film className="w-8 h-8 text-zinc-700" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-zinc-600">プレビュー</p>
                <p className="text-[10px] text-zinc-700 mt-1 font-medium leading-relaxed">
                  生成完了後ここに
                  <br />
                  縦型クリップが表示されます
                </p>
              </div>

              <div className="w-full space-y-2.5 mt-2">
                {[
                  { icon: Volume2, text: '音声ピーク自動検出' },
                  { icon: Scissors, text: '最大5シーン切り出し' },
                  { icon: Wand2, text: '縦型(9:16)変換' },
                  { icon: Sparkles, text: 'フェード + バナー合成' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 px-3 py-2 bg-white/[0.03] rounded-xl">
                    <Icon className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
