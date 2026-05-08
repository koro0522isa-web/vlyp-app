import { useState, useEffect } from 'react';
import { ClipList } from './components/ClipList';
import { StatusBar } from './components/StatusBar';
import { Settings } from './components/Settings';

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
      onClipCreated: (callback: (data: any) => void) => void;
      onClipEditComplete: (callback: (data: any) => void) => void;
      onRecordingStatus: (callback: (data: any) => void) => void;
      removeClipCreatedListener: () => void;
      removeClipEditCompleteListener: () => void;
      removeRecordingStatusListener: () => void;
    };
  }
}

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [clips, setClips] = useState<ClipInfo[]>([]);
  const [selectedClip, setSelectedClip] = useState<ClipInfo | null>(null);
  const [newClipAlert, setNewClipAlert] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      setSelectedClip((sel) =>
        sel?.rawPath === data.rawPath
          ? { ...sel, editedPath: data.editedPath, editing: false }
          : sel
      );
    });

    return () => {
      window.electronAPI?.removeClipCreatedListener();
      window.electronAPI?.removeClipEditCompleteListener();
    };
  }, []);

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
          <p className="text-zinc-400 text-sm">起動中...</p>
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
              {/* 編集中バナー */}
              {selectedClip.editing && (
                <div className="bg-amber-900/40 border border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
                  <span className="animate-spin inline-block">⏳</span>
                  自動編集中... (縦型変換 + AI字幕)
                </div>
              )}

              {/* 編集済みバッジ */}
              {selectedClip.editedPath && !selectedClip.editing && (
                <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl px-4 py-3 text-sm text-emerald-300 flex items-center justify-between">
                  <span>✓ 編集済み (縦型 + AI字幕)</span>
                  <span className="text-xs text-emerald-500">再生中: 編集済みバージョン</span>
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
                <button className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg font-bold text-sm transition-colors">
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
              <p className="text-zinc-300 font-semibold text-lg">録画を開始してください</p>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Valorantでキルが検知されると自動でクリップが保存され、縦型変換 + AI字幕付きで編集されます
              </p>
              {clips.length > 0 && (
                <p className="text-zinc-600 text-xs mt-2">
                  左のリストからクリップを選択して再生できます
                </p>
              )}
            </div>
          )}
        </main>
      </div>

      {/* フッター */}
      <footer className="border-t border-zinc-800 px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold text-sm transition-colors text-zinc-300 flex items-center gap-2"
        >
          ⚙️ 設定
        </button>
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
        <div className="w-24 flex justify-end">
          {isRecording && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
