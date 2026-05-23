import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useT, useI18n } from '../i18n';

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
  bufferSeconds: number;
  framerate: number;
  encoderQuality: number;
  preferredEncoder: 'auto' | 'h264_nvenc' | 'h264_amf' | 'h264_qsv' | 'libx264';
  hotkeyShort: string;
  hotkeyMid: string;
  hotkeyLong: string;
  shortClipSeconds: number;
  midClipSeconds: number;
  longClipSeconds: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoClip: true,
  autoEdit: true,
  vertical: true,
  captions: true,
  language: 'ja',
  openaiApiKey: '',
  clipsDir: '',
  bufferSeconds: 120,
  framerate: 60,
  encoderQuality: 23,
  preferredEncoder: 'auto',
  hotkeyShort: 'Ctrl+F9',
  hotkeyMid: 'Ctrl+F10',
  hotkeyLong: 'Ctrl+F11',
  shortClipSeconds: 15,
  midClipSeconds: 30,
  longClipSeconds: 60,
};

function Toggle({
  checked, onChange,
}: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-10 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
    </label>
  );
}

function NumberField({
  value, min, max, step = 1, suffix, onChange,
}: { value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-violet-600"
      />
      <span className="text-xs font-mono text-zinc-300 w-16 text-right">
        {value}{suffix ? ` ${suffix}` : ''}
      </span>
    </div>
  );
}

function HotkeyInput({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ctrl+F9"
      className="w-32 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-violet-600"
    />
  );
}

export function Settings({ onClose }: SettingsProps) {
  const t = useT();
  const { locale } = useI18n();
  const isJa = locale === 'ja';
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    window.electronAPI?.getSettings().then((loaded: any) => {
      if (loaded) setS({ ...DEFAULT_SETTINGS, ...loaded });
    });
  }, []);

  const update = (patch: Partial<AppSettings>) => setS((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.electronAPI?.setSettings(s as any);
      setTimeout(onClose, 250);
    } finally {
      setIsSaving(false);
    }
  };

  const sectionTitle = (en: string, ja: string) => isJa ? ja : en;

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col">
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3.5 flex items-center justify-between">
        <h1 className="text-base font-bold">{isJa ? '設定' : 'Settings'}</h1>
        <button onClick={onClose} className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 max-w-2xl mx-auto w-full space-y-4">

        {/* Recording quality */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="font-bold text-[11px] uppercase tracking-widest text-zinc-400">
            {sectionTitle('Recording quality', '録画品質')}
          </h2>

          <div>
            <div className="flex justify-between items-baseline mb-2">
              <p className="text-sm font-medium">{sectionTitle('Encoder', 'エンコーダー')}</p>
              <span className="text-[10px] text-zinc-500">{sectionTitle('Auto-selects best HW encoder', '最良のHWエンコーダーを自動選択')}</span>
            </div>
            <select
              value={s.preferredEncoder}
              onChange={(e) => update({ preferredEncoder: e.target.value as any })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600"
            >
              <option value="auto">{sectionTitle('Auto (recommended)', '自動 (推奨)')}</option>
              <option value="h264_nvenc">NVIDIA NVENC</option>
              <option value="h264_amf">AMD AMF</option>
              <option value="h264_qsv">Intel QSV</option>
              <option value="libx264">{sectionTitle('CPU (libx264)', 'CPU (libx264)')}</option>
            </select>
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">{sectionTitle('Quality (CRF)', '品質 (CRF)')}</p>
            <NumberField value={s.encoderQuality} min={18} max={28} suffix="CRF" onChange={(v) => update({ encoderQuality: v })} />
            <p className="text-[10px] text-zinc-500 mt-1">{sectionTitle('Lower = better quality, larger file. 23 is a balanced default.', '低い = 高品質・大容量。23 が標準的なバランス。')}</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">{sectionTitle('Framerate', 'フレームレート')}</p>
            <div className="flex gap-2">
              {[30, 60].map((fps) => (
                <button
                  key={fps}
                  onClick={() => update({ framerate: fps })}
                  className={`flex-1 py-2 rounded-md text-xs font-bold transition-colors ${
                    s.framerate === fps ? 'bg-violet-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {fps} fps
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">{sectionTitle('Rolling buffer length', 'バッファ長')}</p>
            <NumberField value={s.bufferSeconds} min={30} max={600} step={10} suffix={isJa ? '秒' : 'sec'} onChange={(v) => update({ bufferSeconds: v })} />
            <p className="text-[10px] text-zinc-500 mt-1">{sectionTitle('How much of recent gameplay is kept in memory for clip extraction.', 'クリップ抽出のためにメモリに保持する直近録画の長さ。')}</p>
          </div>
        </section>

        {/* Hotkeys */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="font-bold text-[11px] uppercase tracking-widest text-zinc-400">
            {sectionTitle('Clip hotkeys', 'クリップ ホットキー')}
          </h2>
          <p className="text-[11px] text-zinc-500 -mt-2">
            {sectionTitle(
              'Press these while in-game to grab the last X seconds of gameplay.',
              'ゲーム中に押すと直近のプレイを指定秒数で切り出します。'
            )}
          </p>

          {[
            { key: 'hotkeyShort', len: 'shortClipSeconds', label: sectionTitle('Short clip', '短いクリップ') },
            { key: 'hotkeyMid',   len: 'midClipSeconds',   label: sectionTitle('Mid clip',   '標準クリップ') },
            { key: 'hotkeyLong',  len: 'longClipSeconds',  label: sectionTitle('Long clip',  '長いクリップ') },
          ].map(({ key, len, label }) => (
            <div key={key} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
              <p className="text-sm">{label}</p>
              <HotkeyInput
                value={(s as any)[key]}
                onChange={(v) => update({ [key]: v } as any)}
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={3} max={120}
                  value={(s as any)[len]}
                  onChange={(e) => update({ [len]: Number(e.target.value) } as any)}
                  className="w-14 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-violet-600"
                />
                <span className="text-[10px] text-zinc-500">{isJa ? '秒' : 'sec'}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Auto-edit */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="font-bold text-[11px] uppercase tracking-widest text-zinc-400">
            {sectionTitle('Auto-clip & edit', 'オート クリップ + 編集')}
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{sectionTitle('Auto-clip on kill detection', 'キル検知で自動クリップ')}</p>
              <p className="text-[11px] text-zinc-500">{sectionTitle('Valorant / LoL / Apex auto-detected', 'Valorant / LoL / Apex を自動検知')}</p>
            </div>
            <Toggle checked={s.autoClip} onChange={(v) => update({ autoClip: v })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{sectionTitle('Auto-edit clips', 'クリップ自動編集')}</p>
              <p className="text-[11px] text-zinc-500">{sectionTitle('Convert to vertical + add captions', '縦動画化 + 字幕焼き付け')}</p>
            </div>
            <Toggle checked={s.autoEdit} onChange={(v) => update({ autoEdit: v })} />
          </div>

          {s.autoEdit && (
            <div className="pl-4 border-l-2 border-zinc-800 space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <p className="text-sm">{sectionTitle('Convert to 9:16 vertical', '9:16 縦変換')}</p>
                <Toggle checked={s.vertical} onChange={(v) => update({ vertical: v })} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">{sectionTitle('Burn in AI captions (Whisper)', 'AI字幕の焼き付け')}</p>
                <Toggle checked={s.captions} onChange={(v) => update({ captions: v })} />
              </div>
              {s.captions && (
                <div>
                  <p className="text-sm font-medium mb-1.5">{sectionTitle('Caption language', '字幕の言語')}</p>
                  <select
                    value={s.language}
                    onChange={(e) => update({ language: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-600"
                  >
                    <option value="auto">{sectionTitle('Auto-detect', '自動検出')}</option>
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                    <option value="ko">한국어</option>
                    <option value="es">Español</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </section>

        {/* OpenAI key */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3">
          <h2 className="font-bold text-[11px] uppercase tracking-widest text-zinc-400">OpenAI API</h2>
          <p className="text-[11px] text-zinc-500">
            {sectionTitle('Required only for AI caption generation.', 'AI字幕生成に使用します。')}
          </p>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={s.openaiApiKey}
              onChange={(e) => update({ openaiApiKey: e.target.value })}
              placeholder="sk-..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-600"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-zinc-300"
              aria-label="Toggle key visibility"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {s.openaiApiKey && (
            <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              {sectionTitle('API key configured', 'APIキー設定済み')}
            </p>
          )}
          {!s.openaiApiKey && s.captions && s.autoEdit && (
            <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              {sectionTitle('Key missing — captions will be skipped', '未設定 — 字幕はスキップされます')}
            </p>
          )}
        </section>

        {/* Storage */}
        <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-2">
          <h2 className="font-bold text-[11px] uppercase tracking-widest text-zinc-400">{sectionTitle('Storage', '保存先')}</h2>
          <p className="text-[11px] text-zinc-500">{sectionTitle('Clip output directory', 'クリップの保存先')}</p>
          <div className="p-2.5 bg-zinc-800 rounded-md text-[11px] text-zinc-400 break-all font-mono">
            {s.clipsDir || '—'}
          </div>
        </section>

        <p className="text-center text-[10px] text-zinc-600 pt-2">VLYP Clips · v0.3.0</p>
      </div>

      <div className="bg-zinc-900 border-t border-zinc-800 px-5 py-3 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md font-semibold text-xs transition-colors"
        >
          {sectionTitle('Cancel', 'キャンセル')}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:cursor-not-allowed rounded-md font-semibold text-xs transition-colors"
        >
          {isSaving ? (isJa ? '保存中…' : 'Saving…') : (isJa ? '保存' : 'Save')}
        </button>
      </div>
    </div>
  );
}
