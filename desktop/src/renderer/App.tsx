import { useState, useEffect, useRef } from 'react';
import { ClipList } from './components/ClipList';
import { StatusBar } from './components/StatusBar';
import { Settings } from './components/Settings';
import { LoginScreen } from './components/LoginScreen';

interface ClipInfo {
  rawPath: string;
  editedPath?: string;
  timestamp: number;
  event: { type: string; killCount: number };
  editing: boolean;
}

interface UploadState {
  phase: 'idle' | 'form' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  title: string;
  description: string;
  game: string;
}

declare global {
  interface Window {
    electronAPI?: {
      startRecording: () => Promise<any>;
      stopRecording: () => Promise<any>;
      manualClip: () => Promise<any>;
      listClips: () => Promise<ClipInfo[]>;
      deleteClip: (rawPath: string) => Promise<any>;
      editClip: (rawPath: string) => Promise<any>;
      revealClip: (clipPath: string) => Promise<any>;
      getSettings: () => Promise<any>;
      setSettings: (settings: any) => Promise<any>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      login: () => Promise<any>;
      logout: () => Promise<any>;
      getSession: () => Promise<{ accessToken: string; refreshToken: string; email?: string } | null>;
      onAuthSession: (callback: (session: any) => void) => void;
      onClipCreated: (callback: (data: any) => void) => void;
      onClipEditComplete: (callback: (data: any) => void) => void;
      onRecordingStatus: (callback: (data: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

const VLYP_API = 'https://vlyp-app.vercel.app/api/desktop-upload';
const GAMES = ['Valorant', 'League of Legends', 'Apex Legends', 'Fortnite', 'その他'];

// ─── タイトルバー ─────────────────────────────────────────────────

function TitleBar({ isRecording }: { isRecording: boolean }) {
  return (
    <div
      className="flex items-center justify-between bg-zinc-950 border-b border-zinc-900 px-4 h-9 select-none"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-violet-400 tracking-widest">VLYP</span>
        <span className="text-xs text-zinc-600">Clips</span>
        {isRecording && (
          <div className="flex items-center gap-1 ml-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-500 font-semibold">REC</span>
          </div>
        )}
      </div>
      <div
        className="flex items-center gap-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-200 transition-colors text-xs"
          title="最小化"
        >
          ─
        </button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-200 transition-colors text-xs"
          title="最大化"
        >
          □
        </button>
        <button
          onClick={() => window.electronAPI?.close()}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-red-600 text-zinc-600 hover:text-white transition-colors text-xs"
          title="閉じる (トレイに最小化)"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── アップロードモーダル ─────────────────────────────────────────

function UploadModal({ clip, onClose }: { clip: ClipInfo; onClose: () => void }) {
  const [state, setState] = useState<UploadState>({
    phase: 'form',
    progress: 0,
    title: '',
    description: '',
    game: 'Valorant',
  });
  const abortRef = useRef<AbortController | null>(null);

  const handleUpload = async () => {
    if (!state.title.trim()) return;
    setState((s) => ({ ...s, phase: 'uploading', progress: 0 }));

    const filePath = clip.editedPath || clip.rawPath;
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`file://${filePath}`);
      const blob = await res.blob();
      const fileName = filePath.split(/[\\/]/).pop() || 'clip.mp4';
      const file = new File([blob], fileName, { type: 'video/mp4' });

      const form = new FormData();
      form.append('file', file);
      form.append('title', state.title.trim());
      form.append('description', state.description.trim());
      form.append('game', state.game);

      const progressInterval = setInterval(() => {
        setState((s) =>
          s.progress < 85 ? { ...s, progress: s.progress + 4 } : s
        );
      }, 400);

      const uploadRes = await fetch(VLYP_API, {
        method: 'POST',
        body: form,
        signal: abortRef.current.signal,
      });

      clearInterval(progressInterval);

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error(err || `HTTP ${uploadRes.status}`);
      }

      setState((s) => ({ ...s, phase: 'done', progress: 100 }));
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setState((s) => ({ ...s, phase: 'error', error: e.message || '不明なエラー' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-6">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="font-bold text-lg">🚀 VLYPに投稿</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {state.phase === 'form' && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1.5 uppercase tracking-wide">
                  タイトル *
                </label>
                <input
                  type="text"
                  value={state.title}
                  onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
                  placeholder="例: ヴァロラントでエース!"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1.5 uppercase tracking-wide">
                  説明 (任意)
                </label>
                <textarea
                  value={state.description}
                  onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
                  placeholder="コメントを追加..."
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1.5 uppercase tracking-wide">
                  ゲーム
                </label>
                <select
                  value={state.game}
                  onChange={(e) => setState((s) => ({ ...s, game: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  {GAMES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="bg-zinc-800/60 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-zinc-400">
                <span>📹</span>
                <span className="truncate">
                  {clip.editedPath ? '編集済みバージョンを投稿' : '元動画を投稿'}
                </span>
              </div>
              <button
                onClick={handleUpload}
                disabled={!state.title.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl font-bold text-sm transition-colors"
              >
                投稿する
              </button>
            </>
          )}

          {state.phase === 'uploading' && (
            <div className="space-y-4 py-6">
              <p className="text-center text-zinc-300 font-semibold">アップロード中...</p>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <p className="text-center text-zinc-500 text-sm">{state.progress}%</p>
            </div>
          )}

          {state.phase === 'done' && (
            <div className="space-y-4 py-6 text-center">
              <div className="text-5xl">🎉</div>
              <p className="font-bold text-lg text-emerald-400">投稿完了！</p>
              <p className="text-zinc-400 text-sm">VLYPに投稿されました</p>
              <button
                onClick={onClose}
                className="px-8 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-semibold transition-colors"
              >
                閉じる
              </button>
            </div>
          )}

          {state.phase === 'error' && (
            <div className="space-y-4 py-6 text-center">
              <div className="text-4xl">⚠️</div>
              <p className="font-bold text-red