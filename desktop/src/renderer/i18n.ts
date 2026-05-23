/**
 * Lightweight i18n for the renderer.
 *
 * Two supported locales: ja (default), en.
 * No external library — just a lookup table + React context.
 * Add more locales by extending MESSAGES.
 */
import { createContext, useContext, useState, useEffect, ReactNode, createElement } from 'react';

export type Locale = 'ja' | 'en';

type MessageMap = Record<string, string>;

const MESSAGES: Record<Locale, MessageMap> = {
  ja: {
    'app.starting': '起動中...',
    'status.recording': '録画中',
    'status.standby': 'スタンバイ',
    'status.gameApi.label': 'ゲーム API:',
    'status.gameApi.waiting': '待受中...',
    'sidebar.clips': 'クリップ',
    'sidebar.new': '新着!',
    'main.startRecording': '録画を開始してください',
    'main.startRecordingDesc': 'Valorant / LoL / Apex でキルを検知すると自動でクリップを保存。Fortnite / CS2 / Overwatch / PUBG / Rocket League は Ctrl+F9 で手動クリップ。',
    'main.selectClipHint': '左のリストからクリップを選択して再生できます',
    'clip.editing': '自動編集中... (縦型変換 + AI字幕)',
    'clip.edited': '✓ 編集済み (縦型 + AI字幕)',
    'clip.playing.edited': '再生中: 編集済みバージョン',
    'btn.uploadVlyp': 'VLYPに投稿',
    'btn.uploading': '投稿中...',
    'btn.uploaded': '✓ 投稿済み',
    'btn.uploadFailed': '投稿失敗 — もう一度',
    'btn.aiEdit': '✨ AI編集',
    'btn.reveal': '📂',
    'btn.delete': '🗑️',
    'btn.settings': '⚙️ 設定',
    'btn.startRec': '⏺ 録画開始',
    'btn.stopRec': '⏹ 録画停止',
    'btn.rec': 'REC',
    'login.title': 'VLYPアカウントでログイン',
    'login.subtitle': 'クリップの投稿にアカウントが必要です',
    'login.cta': 'ブラウザでログイン',
    'login.note': 'ブラウザが開き、VLYPのログインページに移動します。ログイン完了後、自動でアプリに戻ります。',
    'login.feature.detect': 'キル検知',
    'login.feature.detectDesc': 'Valorant / LoL / Apex',
    'login.feature.clip': '自動クリップ',
    'login.feature.clipDesc': '最大2分のバッファ',
    'login.feature.upload': 'VLYPに投稿',
    'login.feature.uploadDesc': 'ワンクリック',
    'upload.notLoggedIn': 'まずログインしてください',
    'upload.success': 'VLYP に投稿しました',
  },
  en: {
    'app.starting': 'Starting up…',
    'status.recording': 'Recording',
    'status.standby': 'Standby',
    'status.gameApi.label': 'Game API:',
    'status.gameApi.waiting': 'Listening…',
    'sidebar.clips': 'Clips',
    'sidebar.new': 'NEW!',
    'main.startRecording': 'Press record to start',
    'main.startRecordingDesc': 'Auto-clips when a kill is detected in Valorant / LoL / Apex. For Fortnite / CS2 / Overwatch / PUBG / Rocket League, press Ctrl+F9 to clip manually.',
    'main.selectClipHint': 'Pick a clip from the list to play it',
    'clip.editing': 'Auto-editing… (vertical + AI captions)',
    'clip.edited': '✓ Edited (vertical + AI captions)',
    'clip.playing.edited': 'Now playing: edited version',
    'btn.uploadVlyp': 'Post to VLYP',
    'btn.uploading': 'Uploading…',
    'btn.uploaded': '✓ Posted',
    'btn.uploadFailed': 'Upload failed — retry',
    'btn.aiEdit': '✨ AI Edit',
    'btn.reveal': '📂',
    'btn.delete': '🗑️',
    'btn.settings': '⚙️ Settings',
    'btn.startRec': '⏺ Start',
    'btn.stopRec': '⏹ Stop',
    'btn.rec': 'REC',
    'login.title': 'Sign in with VLYP',
    'login.subtitle': 'You need an account to post clips.',
    'login.cta': 'Sign in via browser',
    'login.note': 'Your browser will open to the VLYP sign-in page. You will return here automatically once you log in.',
    'login.feature.detect': 'Kill detection',
    'login.feature.detectDesc': 'Valorant / LoL / Apex',
    'login.feature.clip': 'Auto clipping',
    'login.feature.clipDesc': 'Up to 2-minute buffer',
    'login.feature.upload': 'Post to VLYP',
    'login.feature.uploadDesc': 'One click',
    'upload.notLoggedIn': 'Please sign in first',
    'upload.success': 'Posted to VLYP',
  },
};

/** Detect default locale: explicit `ja`, otherwise English. */
function detectDefaultLocale(): Locale {
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.language || '').toLowerCase();
    if (lang.startsWith('ja')) return 'ja';
  }
  return 'en';
}

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectDefaultLocale());

  // Load persisted locale from electron-store on mount
  useEffect(() => {
    const win = window as any;
    win.electronAPI?.getSettings?.()?.then((s: any) => {
      if (s?.language && (s.language === 'ja' || s.language === 'en')) {
        setLocaleState(s.language);
      }
    });
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    const win = window as any;
    win.electronAPI?.setSettings?.({ language: l });
  };

  const t = (key: string): string => {
    return MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key;
  };

  return createElement(I18nContext.Provider, { value: { locale, setLocale, t } }, children);
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Convenience hook: just the t() function. */
export function useT() {
  return useI18n().t;
}
