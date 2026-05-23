import { useState, useEffect } from 'react';

interface SettingsProps {
  onClose: () => void;
}

interface AppSettings {
  autoClip: boolean;
  autoEdit: boolean;
  vertical: boolean;
  captions: boolean;
  language: string;
  openaiApiKey: string;
  clipsDir: string;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600" />
    </label>
  );
}

export function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>({
    autoClip: true,
    autoEdit: true,
    vertical: true,
    captions: true,
    language: 'ja',
    openaiApiKey: '',
    clipsDir: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    window.electronAPI?.getSettings().then((s) => {
      if (s) setSettings(s as AppSettings);
    });
  }, []);

  const update = (patch: Partial<AppSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.electronAPI?.setSettings(settings as any);
      setTimeout(onClose, 300);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col">
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">設定</h1>
        <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors text-xl leading-none">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-5">

        <section className="bg-zinc-900 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400">録画</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">自動クリップ</p>
              <p className="text-xs text-zinc-500 mt-0.5">キル検知時に自動でクリップを保存</p>
            </div>
            <Toggle checked={settings.autoClip} onChange={(v) => update({ autoClip: v })} />
          </div>
        </section>

        <section className="bg-zinc-900 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400">自動編集 (縦動画 + 字幕)</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">自動編集を有効化</p>
              <p className="text-xs text-zinc-500 mt-0.5">クリップ保存直後に自動で編集処理を実行</p>
            </div>
            <Toggle checked={settings.autoEdit} onChange={(v) => update({ autoEdit: v })} />
          </div>

          {settings.autoEdit && (
            <div className="pl-4 border-l-2 border-zinc-700 space-y-4 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">縦型変換 (9:16)</p>
                  <p className="text-xs text-zinc-500 mt-0.5">TikTok / VLYP 向けにブラー背景で縦型に変換</p>
                </div>
                <Toggle checked={settings.vertical} onChange={(v) => update({ vertical: v })} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">AI字幕 (Whisper)</p>
                  <p className="text-xs text-zinc-500 mt-0.5">OpenAI Whisper で字幕を自動生成・焼き込み</p>
                </div>
                <Toggle checked={settings.captions} onChange={(v) => update({ captions: v })} />
              </div>

              {settings.captions && (
                <div>
                  <p className="text-sm font-medium mb-2">字幕言語</p>
                  <select
                    value={settings.language}
                    onChange={(e) => update({ language: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600"
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                    <option value="auto">自動検出</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="bg-zinc-900 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400">OpenAI API</h2>
          <div>
            <p className="text-sm font-medium mb-1">API Key</p>
            <p className="text-xs text-zinc-500 mb-2">
              Whisper字幕を使う場合に必要です。
            </p>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.openaiApiKey}
                onChange={(e) => update({ openaiApiKey: e.target.value })}
                placeholder="sk-..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs transition-colors"
              >
                {showKey ? '隠す' : '表示'}
              </button>
            </div>
            {settings.openaiApiKey && (
              <p className="text-xs text-emerald-400 mt-1.5">✓ APIキーが設定されています</p>
            )}
            {!settings.openaiApiKey && settings.captions && settings.autoEdit && (
              <p className="text-xs text-amber-400 mt-1.5">⚠ APIキーが未設定です。字幕はスキップされます。</p>
            )}
          </div>
        </section>

        <section className="bg-zinc-900 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400">ファイル</h2>
          <div>
            <p className="text-sm font-medium mb-1">クリップ保存先</p>
            <div className="p-3 bg-zinc-800 rounded-lg text-xs text-zinc-400 break-all font-mono">
              {settings.clipsDir || '未設定'}
            </div>
          </div>
        </section>

        <section className="bg-zinc-900 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400">アプリについて</h2>
          <p className="text-sm">
            <span className="font-bold text-white">VLYP Clips</span>
            <span className="text-zinc-500 ml-2">v0.1.0</span>
          </p>
          <p className="text-xs text-zinc-500">ゲーマー向けクリップ自動録画・編集ツール by VLYP</p>
        </section>

      </div>

      <div className="bg-zinc-900 border-t border-zinc-800 px-6 py-4 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold text-sm transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:cursor-not-allowed rounded-lg font-semibold text-sm transition-colors"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
