import { useState, useEffect, useRef } from 'react';
import {
  Upload, FolderOpen, Trash2, Sparkles, Settings as SettingsIcon, Play, Square,
  Loader2, Check, AlertTriangle, LogOut, LogIn,
} from 'lucide-react';
import { ClipList, ClipMeta } from './components/ClipList';
import { StatusBar } from './components/StatusBar';
import { Settings } from './components/Settings';
import { GameStatusHero } from './components/GameStatusHero';
import { ToastStack, ToastItem } from './components/Toast';
import { useT, useI18n } from './i18n';

interface ClipInfo extends ClipMeta {
  editedPath?: string;
  editing: boolean;
  event: { type: string; killCount?: number };
}

declare global {
  interface Window {
    electronAPI?: {
      startRecording: () => Promise<any>;
      stopRecording: () => Promise<any>;
      manualClip?: (args?: { lengthSeconds?: number }) => Promise<any>;
      listClips: () => Promise<ClipInfo[]>;
      deleteClip: (rawPath: string) => Promise<any>;
      editClip: (rawPath: string) => Promise<any>;
      revealClip: (clipPath: string) => Promise<any>;
      uploadClip: (args: { clipPath: string; title?: string; gameTitle?: string }) =>
        Promise<{ success: boolean; error?: string; clip?: any }>;
      getSettings: () => Promise<any>;
      setSettings: (settings: any) => Promise<any>;
      login: () => Promise<any>;
      logout: () => Promise<any>;
      getSession: () => Promise<{ accessToken: string; email?: string } | null>;
      onAuthSession: (callback: (s: any) => void) => void;
      onClipCreated: (callback: (data: any) => void) => void;
      onClipEditComplete: (callback: (data: any) => void) => void;
      onRecordingStatus: (callback: (data: any) => void) => void;
      onGameStatus: (callback: (data: { game: string; running: boolean }) => void) => void;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      removeAllListeners?: (channel: string) => void;
    };
  }
}

export default function App() {
  const t = useT();
  const { locale, setLocale } = useI18n();
  const [isRecording, setIsRecording] = useState(false);
  const [clips, setClips] = useState<ClipInfo[]>([]);
  const [selectedClip, setSelectedClip] = useState<ClipInfo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'failed'>('idle');
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = (toast: Omit<ToastItem, 'id'>) => {
    toastIdRef.current++;
    const id = toastIdRef.current;
    setToasts((prev) => [...prev, { ...toast, id }]);
  };
  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const loadClips = async () => {
      try {
        const list = await window.electronAPI?.listClips();
        setClips((list as ClipInfo[]) || []);
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
        thumbPath: data.thumbPath,
        timestamp: Date.now(),
        event: data.event,
        editing: data.editing,
      };
      setClips((prev) => [info, ...prev]);
      const evt = data.event?.type || 'unknown';
      const evtLabel = ({ kill: 'キル', multikill: 'マルチキル', ace: 'エース', manual: '手動' } as any)[evt] || 'クリップ';
      pushToast({
        message: locale === 'ja' ? `${evtLabel}クリップ保存` : `${evt.toUpperCase()} clip saved`,
        subMessage: data.editing
          ? (locale === 'ja' ? 'AI 編集中…' : 'AI editing…')
          : (locale === 'ja' ? '左パネルに追加' : 'Added to sidebar'),
        type: 'clip',
        eventType: evt,
      });
    });

    window.electronAPI?.onClipEditComplete((data) => {
      setClips((prev) =>
        prev.map((c) =>
          c.rawPath === data.rawPath
            ? { ...c, editedPath: data.editedPath, editing: false }
            : c
        )
      );
      setSelectedClip((sel: ClipInfo | null) =>
        sel && sel.rawPath === data.rawPath
          ? { ...sel, editedPath: data.editedPath, editing: false }
          : sel
      );
      pushToast({
        message: locale === 'ja' ? 'AI 編集完了' : 'AI Edit Complete',
        subMessage: locale === 'ja' ? '縦型 + 字幕入り版を生成' : 'Vertical + captions ready',
        type: 'edit',
      });
    });

    window.electronAPI?.onRecordingStatus?.((data) => {
      if (typeof data?.isRecording === 'boolean') {
        setIsRecording(data.isRecording);
      }
    });

    window.electronAPI?.onGameStatus?.((data) => {
      if (data?.running) {
        setCurrentGame(data.game);
        pushToast({
          message: locale === 'ja' ? `${data.game.toUpperCase()} 検知` : `${data.game.toUpperCase()} Detected`,
          subMessage: locale === 'ja' ? '自動録画開始' : 'Auto-recording started',
          type: 'clip',
        });
      } else if (currentGame === data?.game) {
        setCurrentGame(null);
      }
    });

    window.electronAPI?.getSession?.().then((s) => {
      if (s?.email) setAuthedEmail(s.email);
    });
    window.electronAPI?.onAuthSession?.((s) => {
      if (s?.email) setAuthedEmail(s.email);
    });

    return () => {
      window.electronAPI?.removeAllListeners?.('clip:created');
      window.electronAPI?.removeAllListeners?.('clip:edit-complete');
      window.electronAPI?.removeAllListeners?.('recording:status');
      window.electronAPI?.removeAllListeners?.('game:status');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setUploadState('idle');
  }, [selectedClip?.rawPath]);

  const toggleRecording = async () => {
    try {
      if (isRecording) {
        await window.electronAPI?.stopRecording();
      } else {
        await window.electronAPI?.startRecording();
      }
      setIsRecording(!isRecording);
    } catch (e) {
      console.error('Recording toggle failed:', e);
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
    pushToast({
      message: locale === 'ja' ? 'AI 編集開始' : 'AI Edit Started',
      subMessage: locale === 'ja' ? '縦型変換 + 字幕生成中' : 'Vertical + captions',
      type: 'edit',
    });
    await window.electronAPI?.editClip(rawPath);
  };

  const handleReveal = (clipPath: string) => {
    window.electronAPI?.revealClip(clipPath);
  };

  const handleUpload = async () => {
    if (!selectedClip) return;
    if (!authedEmail) {
      window.electronAPI?.login?.();
      return;
    }
    const clipPath = selectedClip.editedPath || selectedClip.rawPath;
    setUploadState('uploading');
    try {
      const res = await window.electronAPI?.uploadClip?.({
        clipPath,
        title: undefined,
        gameTitle: selectedClip.event?.type || 'Desktop Recording',
      });
      if (res?.success) {
        setUploadState('success');
        pushToast({
          message: locale === 'ja' ? 'VLYP に投稿完了' : 'Posted to VLYP',
          subMessage: locale === 'ja' ? 'クリップ公開済み' : 'Live now',
          type: 'upload',
        });
      } else if (res?.error === 'NOT_LOGGED_IN') {
        setAuthedEmail(null);
        setUploadState('idle');
        window.electronAPI?.login?.();
      } else {
        setUploadState('failed');
        pushToast({
          message: locale === 'ja' ? '投稿失敗' : 'Upload failed',
          subMessage: res?.error || 'Try again',
          type: 'error',
        });
      }
    } catch (e) {
      console.error(e);
      setUploadState('failed');
    }
  };

  const playPath = selectedClip?.editedPath || selectedClip?.rawPath;

  if (isLoading) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 via-violet-600 to-pink-600 mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.4)] animate-pulse">
            <span className="text-2xl font-black text-white">V</span>
          </div>
          <p className="text-xl font-black bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent tracking-wider">
            VLYP CLIPS
          </p>
          <p className="text-zinc-500 text-xs flex items-center gap-2 justify-center uppercase tracking-widest">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t('app.starting')}
          </p>
        </div>
      </div>
    );
  }

  if (showSettings) {
    return <Settings onClose={() => setShowSettings(false)} />;
  }

  const editingPaths = clips.filter((c) => c.editing).map((c) => c.rawPath);
  const editedPaths = clips.filter((c) => !!c.editedPath).map((c) => c.rawPath);

  return (
    <div
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      className="h-screen text-white flex flex-col select-none overflow-hidden bg-black"
    >
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[350px] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      <StatusBar isRecording={isRecording} currentGame={currentGame} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">
                {t('sidebar.clips')}
              </span>
              <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                {clips.length}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ClipList
              clips={clips}
              selected={selectedClip?.rawPath ?? null}
              onSelect={(p) => setSelectedClip(clips.find((c) => c.rawPath === p) ?? null)}
              onDelete={handleDelete}
              editingPaths={editingPaths}
              editedPaths={editedPaths}
            />
          </div>
        </aside>

        <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8 overflow-y-auto">
          {selectedClip ? (
            <div className="w-full max-w-3xl space-y-4">
              {selectedClip.editing && (
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 text-sm text-amber-300 flex items-center gap-3 backdrop-blur-xl">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-bold">{t('clip.editing')}</span>
                </div>
              )}

              {selectedClip.editedPath && !selectedClip.editing && (
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 text-sm text-emerald-300 flex items-center justify-between backdrop-blur-xl">
                  <span className="flex items-center gap-2 font-bold">
                    <Check className="w-4 h-4" />
                    {t('clip.edited')}
                  </span>
                  <span className="text-[11px] text-emerald-400/80 uppercase tracking-widest">{t('clip.playing.edited')}</span>
                </div>
              )}

              <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-violet-500/40 via-blue-500/40 to-pink-500/40 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
                <video
                  key={playPath}
                  src={playPath ? `file://${playPath}` : undefined}
                  className="w-full rounded-2xl bg-black aspect-video"
                  controls
                  autoPlay
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={uploadState === 'uploading'}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${
                    uploadState === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                      : uploadState === 'failed'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40'
                      : 'bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 hover:from-blue-500 hover:via-violet-500 hover:to-pink-500 shadow-violet-900/40'
                  }`}
                >
                  {uploadState === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploadState === 'success' && <Check className="w-4 h-4" />}
                  {uploadState === 'failed' && <AlertTriangle className="w-4 h-4" />}
                  {uploadState === 'idle' && <Upload className="w-4 h-4" />}
                  {uploadState === 'uploading'
                    ? t('btn.uploading')
                    : uploadState === 'success'
                    ? t('btn.uploaded')
                    : uploadState === 'failed'
                    ? t('btn.uploadFailed')
                    : t('btn.uploadVlyp')}
                </button>
                {!selectedClip.editedPath && !selectedClip.editing && (
                  <button
                    onClick={() => handleEdit(selectedClip.rawPath)}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl font-bold text-sm transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-violet-300" />
                    {locale === 'ja' ? 'AI 編集' : 'AI Edit'}
                  </button>
                )}
                <button
                  onClick={() => handleReveal(selectedClip.editedPath || selectedClip.rawPath)}
                  className="p-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors"
                  title="Reveal in folder"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(selectedClip.rawPath)}
                  className="p-3 bg-white/[0.04] hover:bg-red-900/40 hover:text-red-300 border border-white/10 hover:border-red-500/40 rounded-xl text-zinc-500 transition-colors"
                  title="Delete clip"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <GameStatusHero
              game={currentGame}
              isRecording={isRecording}
              clipsCount={clips.length}
              locale={locale}
            />
          )}
        </main>
      </div>

      <footer className="border-t border-white/5 bg-black/60 backdrop-blur-xl px-5 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-colors text-zinc-300"
          >
            <SettingsIcon className="w-3 h-3" />
            {locale === 'ja' ? '設定' : 'Settings'}
          </button>
          <button
            onClick={() => setLocale(locale === 'ja' ? 'en' : 'ja')}
            className="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg text-[10px] font-black text-zinc-400 hover:text-white transition-colors uppercase tracking-widest"
            title="Toggle language"
          >
            {locale === 'ja' ? 'EN' : 'JA'}
          </button>
          {authedEmail ? (
            <button
              onClick={() => window.electronAPI?.logout?.()}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg font-bold text-[11px] text-zinc-400 hover:text-white transition-colors"
              title={authedEmail}
            >
              <LogOut className="w-3 h-3" />
              {authedEmail.split('@')[0].slice(0, 12)}
            </button>
          ) : (
            <button
              onClick={() => window.electronAPI?.login?.()}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg font-bold text-[11px] text-blue-300 transition-colors"
            >
              <LogIn className="w-3 h-3" />
              {locale === 'ja' ? 'ログイン' : 'Login'}
            </button>
          )}
        </div>

        <button
          onClick={toggleRecording}
          className={`inline-flex items-center gap-2 px-8 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
            isRecording
              ? 'bg-red-600 hover:bg-red-500 shadow-red-900/40'
              : 'bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 hover:from-blue-500 hover:via-violet-500 hover:to-pink-500 shadow-violet-900/40'
          }`}
        >
          {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          {isRecording ? (locale === 'ja' ? '停止' : 'Stop') : (locale === 'ja' ? '録画' : 'Record')}
        </button>

        <div className="w-32 flex justify-end">
          {isRecording && (
            <span className="inline-flex items-center gap-2 text-[10px] font-black text-red-400 uppercase tracking-widest">
              <span className="inline-flex relative">
                <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              REC
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
