import { useState, useEffect } from 'react';
import {
  Upload, FolderOpen, Trash2, Sparkles, Settings as SettingsIcon, Play, Square,
  Loader2, Check, AlertTriangle, Gamepad2,
} from 'lucide-react';
import { ClipList, ClipMeta } from './components/ClipList';
import { StatusBar } from './components/StatusBar';
import { Settings } from './components/Settings';
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
  const [newClipAlert, setNewClipAlert] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'failed'>('idle');
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

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
      setNewClipAlert(true);
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
      setSelectedClip((sel: ClipInfo | null) =>
        sel && sel.rawPath === data.rawPath
          ? { ...sel, editedPath: data.editedPath, editing: false }
          : sel
      );
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
    };
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
      } else if (res?.error === 'NOT_LOGGED_IN') {
        setAuthedEmail(null);
        setUploadState('idle');
        window.electronAPI?.login?.();
      } else {
        setUploadState('failed');
      }
    } catch (e) {
      console.error(e);
      setUploadState('failed');
    }
  };

  const playPath = selectedClip?.editedPath || selectedClip?.rawPath;

  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-2xl font-bold text-violet-400">VLYP Clips</p>
          <p className="text-zinc-400 text-sm flex items-center gap-2 justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
    <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="h-screen bg-zinc-950 text-white flex flex-col select-none overflow-hidden">
      <StatusBar isRecording={isRecording} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-zinc-900/70 border-r border-zinc-800 flex flex-col">
          <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {t('sidebar.clips')} ({clips.length})
            </span>
            {newClipAlert && (
              <span className="text-[10px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse uppercase tracking-wider">
                {t('sidebar.new')}
              </span>
            )}
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

        {/* Main area */}
        <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
          {selectedClip ? (
            <div className="w-full max-w-2xl space-y-3">
              {/* Editing banner */}
              {selectedClip.editing && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-amber-300 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('clip.editing')}
                </div>
              )}

              {selectedClip.editedPath && !selectedClip.editing && (
                <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2 text-xs text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {t('clip.edited')}
                  </span>
                  <span className="text-[10px] text-emerald-500/80">{t('clip.playing.edited')}</span>
                </div>
              )}

              {/* Player */}
              <video
                key={playPath}
                src={playPath ? `file://${playPath}` : undefined}
                className="w-full rounded-xl border border-zinc-800 bg-black aspect-video"
                controls
                autoPlay
              />

              {/* Action row */}
              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={uploadState === 'uploading'}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    uploadState === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : uploadState === 'failed'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-violet-600 hover:bg-violet-500'
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
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold text-sm transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-violet-300" />
                    {locale === 'ja' ? 'AI編集' : 'AI Edit'}
                  </button>
                )}
                <button
                  onClick={() => handleReveal(selectedClip.editedPath || selectedClip.rawPath)}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  title="Reveal in folder"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(selectedClip.rawPath)}
                  className="p-2.5 bg-zinc-800 hover:bg-red-900/40 hover:text-red-300 rounded-lg text-zinc-500 transition-colors"
                  title="Delete clip"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
                <Gamepad2 className="w-7 h-7 text-zinc-600" strokeWidth={1.5} />
              </div>
              <p className="text-zinc-300 font-semibold text-base">{t('main.startRecording')}</p>
              <p className="text-zinc-500 text-xs leading-relaxed">
                {t('main.startRecordingDesc')}
              </p>
              {clips.length > 0 && (
                <p className="text-zinc-600 text-[11px] mt-2">
                  {t('main.selectClipHint')}
                </p>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/40 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold text-xs transition-colors text-zinc-300"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            {locale === 'ja' ? '設定' : 'Settings'}
          </button>
          <button
            onClick={() => setLocale(locale === 'ja' ? 'en' : 'ja')}
            className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-wider"
            title="Toggle language"
          >
            {locale === 'ja' ? 'EN' : 'JA'}
          </button>
        </div>

        <button
          onClick={toggleRecording}
          className={`inline-flex items-center gap-2 px-8 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${
            isRecording
              ? 'bg-red-600 hover:bg-red-500 shadow-red-900/40'
              : 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/40'
          }`}
        >
          {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          {isRecording ? t('btn.stopRec').replace('⏹ ', '') : t('btn.startRec').replace('⏺ ', '')}
        </button>

        <div className="w-24 flex justify-end">
          {isRecording && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {t('btn.rec')}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
