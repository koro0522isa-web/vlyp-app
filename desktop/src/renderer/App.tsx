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

const VLYP_API = 'https://vlyp.app/api/desktop-upload';
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

function UploadModal({
  clip,
  onClose,
  accessToken,
}: {
  clip: ClipInfo;
  onClose: () => void;
  accessToken: string;
}) {
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
      form.append('video', file);
      form.append('title', state.title.trim());
      form.append('game_title', state.game);
      form.append('description', state.description.trim());

      const progressInterval = setInterval(() => {
        setState((s) =>
          s.progress < 85 ? { ...s, progress: s.progress + 4 } : s
        );
      }, 400);

      const uploadRes = await fetch(VLYP_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
              <p className="font-bold text-red-400">アップロード失敗</p>
              <p className="text-zinc-400 text-sm break-all">{state.error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setState((s) => ({ ...s, phase: 'form', error: undefined }))}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-semibold transition-colors"
                >
                  再試行
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-semibold transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── メインアプリ ─────────────────────────────────────────────────

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [clips, setClips] = useState<ClipInfo[]>([]);
  const [selectedClip, setSelectedClip] = useState<ClipInfo | null>(null);
  const [newClipAlert, setNewClipAlert] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isClipping, setIsClipping] = useState(false);
  const [session, setSession] = useState<{ accessToken: string; email?: string } | null>(null);

  useEffect(() => {
    // 認証セッション復元
    window.electronAPI?.getSession().then((s) => {
      if (s) setSession(s);
    });
    window.electronAPI?.onAuthSession((s) => {
      setSession(s);
    });

    const loadClips = async () => {
      try {
        const list = await window.electronAPI?.listClips();
        setClips(list || []);
      } catch (e) {
        console.error('Failed to load clips:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadClips();

    window.electronAPI?.onClipCreated((data) => {
      const info: ClipInfo = {
        rawPath: data.rawPath,
        editedPath: data.editedPath,
        timestamp: Date.now(),
        event: data.event,
        editing: data.editing,
      };
      setClips((prev) => [info, ...prev]);
      setNewClipAlert(true);
      setIsClipping(false);
      setTimeout(() => setNewClipAlert(false), 4000);
    });

    window.electronAPI?.onClipEditComplete((data) => {
      setClips((prev) =>
        prev.map((c) =>
          c.rawPath === data.rawPath
            ? { ...c, editedPath: data.editedPath, editing: false }
            : c
        )
      );
      setSelectedClip((sel) =>
        sel?.rawPath === data.rawPath
          ? { ...sel, editedPath: data.editedPath, editing: false }
          : sel
      );
    });

    window.electronAPI?.onRecordingStatus((data) => {
      setIsRecording(data.isRecording);
    });

    return () => {
      window.electronAPI?.removeAllListeners('clip:created');
      window.electronAPI?.removeAllListeners('clip:edit_complete');
      window.electronAPI?.removeAllListeners('recording:status');
    };
  }, []);

  const toggleRecording = async () => {
    try {
      if (isRecording) {
        await window.electronAPI?.stopRecording();
        setIsRecording(false);
      } else {
        const result = await window.electronAPI?.startRecording();
        if (result?.success !== false) setIsRecording(true);
      }
    } catch (e) {
      console.error('Recording toggle failed:', e);
    }
  };

  const handleManualClip = async () => {
    if (!isRecording || isClipping) return;
    setIsClipping(true);
    try {
      await window.electronAPI?.manualClip();
    } catch (e) {
      console.error('Manual clip failed:', e);
      setIsClipping(false);
    }
  };

  const handleDelete = async (rawPath: string) => {
    try {
      await window.electronAPI?.deleteClip(rawPath);
      setClips((prev) => prev.filter((c) => c.rawPath !== rawPath));
      if (selectedClip?.rawPath === rawPath) setSelectedClip(null);
    } catch (e) {
      console.error('Failed to delete clip:', e);
    }
  };

  const handleEdit = async (rawPath: string) => {
    setClips((prev) =>
      prev.map((c) => (c.rawPath === rawPath ? { ...c, editing: true } : c))
    );
    await window.electronAPI?.editClip(rawPath);
  };

  const handleReveal = (clipPath: string) => {
    window.electronAPI?.revealClip(clipPath);
  };

  const playPath = selectedClip?.editedPath || selectedClip?.rawPath;

  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 text-white flex flex-col">
        <TitleBar isRecording={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-2xl font-bold text-violet-400">VLYP Clips</p>
            <p className="text-zinc-400 text-sm">起動中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 未ログイン → ログイン画面
  if (!session) {
    return (
      <div className="h-screen bg-zinc-950 text-white flex flex-col">
        <TitleBar isRecording={false} />
        <LoginScreen onLogin={() => window.electronAPI?.login()} />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="h-screen bg-zinc-950 text-white flex flex-col">
        <TitleBar isRecording={isRecording} />
        <div className="flex-1 overflow-hidden">
          <Settings onClose={() => setShowSettings(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col select-none overflow-hidden">
      {showUpload && selectedClip && session && (
        <UploadModal
          clip={selectedClip}
          onClose={() => setShowUpload(false)}
          accessToken={session.accessToken}
        />
      )}

      <TitleBar isRecording={isRecording} />
      <StatusBar isRecording={isRecording} />

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              クリップ ({clips.length})
            </span>
            {newClipAlert && (
              <span className="text-xs bg-violet-600 px-2 py-0.5 rounded-full font-bold animate-pulse">
                NEW!
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <ClipList
              clips={clips.map((c) => c.rawPath)}
              selected={selectedClip?.rawPath ?? null}
              onSelect={(path) =>
                setSelectedClip(clips.find((c) => c.rawPath === path) ?? null)
              }
              onDelete={handleDelete}
              editingPaths={clips.filter((c) => c.editing).map((c) => c.rawPath)}
              editedPaths={clips.filter((c) => !!c.editedPath).map((c) => c.rawPath)}
            />
          </div>
        </aside>

        {/* メインエリア */}
        <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8 overflow-y-auto">
          {selectedClip ? (
            <div className="w-full max-w-2xl space-y-4">
              {selectedClip.editing && (
                <div className="bg-amber-900/40 border border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
                  <span className="animate-spin inline-block">⏳</span>
                  自動編集中... (縦型変換 + AI字幕)
                </div>
              )}
              {selectedClip.editedPath && !selectedClip.editing && (
                <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl px-4 py-3 text-sm text-emerald-300 flex items-center justify-between">
                  <span>✓ 編集済み (縦型 + AI字幕)</span>
                  <span className="text-xs text-emerald-500">編集済みを再生中</span>
                </div>
              )}
              <video
                key={playPath}
                src={playPath ? `file://${playPath}` : undefined}
                className="w-full rounded-xl border border-zinc-800 bg-black"
                controls
                autoPlay
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg font-bold text-sm transition-colors"
                >
                  🚀 VLYPに投稿
                </button>
                {!selectedClip.editedPath && !selectedClip.editing && (
                  <button
                    onClick={() => handleEdit(selectedClip.rawPath)}
                    className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold text-sm transition-colors"
                  >
                    ✨ AI編集
                  </button>
                )}
                <button
                  onClick={() => handleReveal(selectedClip.editedPath || selectedClip.rawPath)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold text-sm transition-colors"
                  title="フォルダを開く"
                >
                  📂
                </button>
                <button
                  onClick={() => handleDelete(selectedClip.rawPath)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold text-sm transition-colors text-zinc-400"
                  title="削除"
                >
                  🗑️
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-sm">
              <div className="text-6xl">🎮</div>
              <p className="text-zinc-300 font-semibold text-lg">録画を開始してください</p>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Valorant / LoL でキルが検知されると自動でクリップが保存され、
                縦型変換 + AI字幕付きで編集されます
              </p>
              {clips.length > 0 && (
                <p className="text-zinc-600 text-xs">
                  左のリストからクリップを選択して再生できます
                </p>
              )}
            </div>
          )}
        </main>
      </div>

      {/* フッター */}
      <footer className="border-t border-zinc-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold text-sm transition-colors text-zinc-300 flex items-center gap-2"
          >
            ⚙️ 設定
          </button>
          {session?.email && (
            <span className="text-xs text-zinc-600 truncate max-w-[120px]" title={session.email}>
              {session.email}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 手動クリップボタン */}
          <button
            onClick={handleManualClip}
            disabled={!isRecording || isClipping}
            title="手動クリップ保存 (Ctrl+F9)"
            className={`px-5 py-2.5 rounded-full font-semibold text-xs transition-all border ${
              isRecording && !isClipping
                ? 'border-zinc-600 bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                : 'border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed'
            }`}
          >
            {isClipping ? '⏳ 保存中...' : '✂️ Ctrl+F9'}
          </button>

          {/* 録画トグル */}
          <button
            onClick={toggleRecording}
            className={`px-12 py-3 rounded-full font-bold text-sm transition-all shadow-lg ${
              isRecording
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/50'
                : 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/50'
            }`}
          >
            {isRecording ? '⏹ 録画停止' : '⏺ 録画開始'}
          </button>
        </div>

        <div className="w-28 flex justify-end">
          {isRecording && (
            <span className="flex items-center gap-1.5 text-xs