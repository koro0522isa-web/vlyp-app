import { useState, useEffect } from 'react';
import { ClipList } from './components/ClipList';
import { StatusBar } from './components/StatusBar';
import { Settings } from './components/Settings';
import { useT, useI18n } from './i18n';

interface ClipInfo {
  rawPath: string;
  editedPath?: string;
  timestamp: number;
  event: { type: string; killCount: number };
  editing: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      startRecording: () => Promise<any>;
      stopRecording: () => Promise<any>;
      listClips: () => Promise<ClipInfo[]>;
      deleteClip: (rawPath: string) => Promise<any>;
      editClip: (rawPath: string) => Promise<any>;
      revealClip: (clipPath: string) => Promise<any>;
      getSettings: () => Promise<any>;
      setSettings: (settings: any) => Promise<any>;
      uploadClip: (args: { clipPath: string; title?: string; gameTitle?: string }) => Promise<{ success: boolean; error?: string; clip?: any }>;
      login: () => Promise<any>;
      logout: () => Promise<any>;
      getSession: () => Promise<{ accessToken: string; email?: string } | null>;
      onAuthSession: (callback: (s: any) => void) => void;
      onClipCreated: (callback: (data: any) => void) => void;
      onClipEditComplete: (callback: (data: any) => void) => void;
      onRecordingStatus: (callback: (data: any) => void) => void;
      onGameStatus: (callback: (data: { game: string; running: boolean }) => void) => void;
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
        setClips(list || []);
      } catch (e) {
        console.error('Failed to load clips:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadClips();

    // 新規クリップ作成イベント
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
      setTimeout(() => setNewClipAlert(false), 4000);
    });

    // 編集完了イベント
    window.electronAPI?.onClipEditComplete((data) => {
      setClips((prev) =>
        prev.map((c) =>
          c.rawPath === data.rawPath
            ? { ...c, editedPath: data.editedPath, editing: false }
            : c
        )
      );
      // 選択中クリップが編集完了したら自動更新
      setSelectedClip((sel: ClipInfo | null) =>
        sel && sel.rawPath === data.rawPath
          ? { ...sel, editedPath: data.editedPath, editing: false }
          : sel
      );
    });

    // Load auth state
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

  // Reset uploadState when switching clips
  useEffect(() => {
    setUploadState('idle');
  }, [selectedClip?.rawPath]);

  const handleUpload = async () => {
    if (!selectedClip) return;
    if (!authedEmail) {
      // Trigger login flow
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

  // 再生するパス: 編集済みがあればそちらを優先
  const playPath = selectedClip?.editedPath || selectedClip?.rawPath;

  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-2xl font-bold text-violet-400">VLYP Clips</p>
          <p className="text-zinc-400 text-sm">{t('app.starting')}</p>
        </div>
      </div>
    );
  }

  if (showSettings) {
    return <Settings onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col select-none overflow-hidden">
      <StatusBar isRecording={isRecording} />

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {t('sidebar.clips')} ({clips.length})
            </span>
            {newClipAlert && (
              <span className="text-xs bg-violet-600 px-2 py-0.5 rounded-full font-bold animate-pulse">
                {t('sidebar.new')}
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
              {/* 編集中バナー */}
              {selectedClip.editing && (
                <div className="bg-amber-900/40 border border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
                  <span className="animate-spin inline-block">⏳</span>
                  {t('clip.editing')}
                </div>
              )}

              {/* 編集済みバッジ */}
              {selectedClip.editedPath && !selectedClip.editing && (
                <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl px-4 py-3 text-sm text-emerald-300 flex items-center justify-between">
                  <span>{t('clip.edited')}</span>
                  <span className="text-xs text-emerald-500">{t('clip.playing.edited')}</span>
                </div>
              )}

              {/* ビデオプレイヤー */}
              <video
                key={playPath}
                src={playPath ? `file://${playPath}` : undefined}
                className="w-full rounded-xl border border-zinc-800 bg-black"
                controls
                autoPlay
              />

              {/* アクションボタン */}
              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={uploadState === 'uploading'}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    uploadState === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : uploadState === 'failed'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-violet-600 hover:bg-violet-500'
                  }`}
                >
                  {uploadState === 'uploading'
                    ? t('btn.uploading')
                    : uploadState === 'success'
                    ? t('btn.uploaded')
                    : uploadState === 'failed'
                    ? t('btn.uploadFailed')
                    : `🚀 ${t('btn.uploadVlyp')}`}
                </button>
                {!selectedClip.editedPath && !selectedClip.editing && (
                  <button
                    onClick={() => handleEdit(selectedClip.rawPath)}
                    className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold text-sm transition-colors"
                  >
                    {t('btn.aiEdit')}
                  </button>
                )}
                <button
                  onClick={() => handleReveal(selectedClip.editedPath || selectedClip.rawPath)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold text-sm transition-colors"
                >
                  📂
                </button>
                <button
                  onClick={() => handleDelete(selectedClip.rawPath)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold text-sm transition-colors text-zinc-400"
                >
                  🗑️
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-sm">
              <div className="text-6xl">🎮</div>
              <p className="text-zinc-300 font-semibold text-lg">{t('main.startRecording')}</p>
              <p className="text-zinc-500 text-sm leading-relaxed">
                {t('main.startRecordingDesc')}
              </p>
              {clips.length > 0 && (
                <p className="text-zinc-600 text-xs mt-2">
                  {t('main.selectClipHint')}
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
            {t('btn.settings')}
          </button>
          <button
            onClick={() => setLocale(locale === 'ja' ? 'en' : 'ja')}
            className="px-2.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors"
            title="Toggle language"
          >
            {locale === 'ja' ? 'EN' : 'JA'}
          </button>
        </div>
        <button
          onClick={toggleRecording}
          className={`px-12 py-3 rounded-full font-bold text-sm transition-all shadow-lg ${
            isRecording
              ? 'bg-red-600 hover:bg-red-500 shadow-red-900/50'
              : 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/50'
          }`}
        >
          {isRecording ? t('btn.stopRec') : t('btn.startRec')}
        </button>
        <div className="w-24 flex justify-end">
          {isRecording && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {t('btn.rec')}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
