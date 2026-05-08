import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import Store from 'electron-store';
import { Recorder } from './recorder';
import { Detector } from './detector';
import { ApexDetector } from './apex-detector';
import { Clipper } from './clipper';
import { EditOptions } from './editor';

// ─── 設定スキーマ ───────────────────────────────────────────────

interface AppSettings {
  autoClip: boolean;
  autoEdit: boolean;
  vertical: boolean;
  captions: boolean;
  language: string;
  openaiApiKey: string;
  clipsDir: string;
  hotkey: string;
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  email?: string;
}

const store = new Store<AppSettings & { auth?: AuthSession }>({
  defaults: {
    autoClip: true,
    autoEdit: true,
    vertical: true,
    captions: true,
    language: 'ja',
    openaiApiKey: '',
    clipsDir: path.join(app.getPath('videos'), 'VLYP Clips'),
    hotkey: 'Ctrl+F9',
  },
});

// ─── Single Instance Lock (deep link 対応) ──────────────────────

const PROTOCOL = 'vlyp';
app.setAsDefaultProtocolClient(PROTOCOL);

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// ─── グローバル変数 ─────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isRecording = false;

const recorder = new Recorder();
const detector = new Detector();
const apexDetector = new ApexDetector();
const clipper = new Clipper();

// ─── Deep Link ハンドラ ─────────────────────────────────────────

function handleDeepLink(url: string) {
  console.log('[Main] Deep link:', url);
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'auth') {
      const accessToken = parsed.searchParams.get('access_token');
      const refreshToken = parsed.searchParams.get('refresh_token');
      const email = parsed.searchParams.get('email') || undefined;
      if (accessToken && refreshToken) {
        const session: AuthSession = { accessToken, refreshToken, email };
        store.set('auth', session);
        mainWindow?.webContents.send('auth:session', session);
        console.log('[Main] Auth session saved:', email);
      }
    }
  } catch (e) {
    console.error('[Main] Deep link parse error:', e);
  }
}

// Windows: 2番目のインスタンスが起動したらコマンドライン引数からURLを取得
app.on('second-instance', (_event, commandLine) => {
  const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (url) handleDeepLink(url);
  mainWindow?.show();
  mainWindow?.focus();
});

// macOS
app.on('open-url', (_event, url) => {
  handleDeepLink(url);
});

// ─── 編集完了コールバック ─────�