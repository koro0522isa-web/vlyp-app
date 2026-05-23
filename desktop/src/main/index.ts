import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import Store from 'electron-store';
import { Recorder } from './recorder';
import { Detector } from './detector';
import { ApexDetector } from './apex-detector';
import { ProcessDetector } from './process-detector';
import { Clipper } from './clipper';
import { EditOptions } from './editor';
import FormData from 'form-data';
import https from 'https';

// ─── 設定スキーマ ───────────────────────────────────────────────

interface AppSettings {
  autoClip: boolean;
  autoEdit: boolean;
  vertical: boolean;
  captions: boolean;
  language: string;
  openaiApiKey: string;
  clipsDir: string;
  // Recording quality
  bufferSeconds: number;        // 30-600, default 120 (2 min)
  framerate: number;            // 30 or 60, default 60
  encoderQuality: number;       // 18-28, default 23 (lower = better quality)
  preferredEncoder: 'auto' | 'h264_nvenc' | 'h264_amf' | 'h264_qsv' | 'libx264';
  // Clip hotkeys (3 lengths)
  hotkeyShort: string;          // default Ctrl+F9  -> shortClipSeconds
  hotkeyMid: string;            // default Ctrl+F10 -> midClipSeconds
  hotkeyLong: string;           // default Ctrl+F11 -> longClipSeconds
  shortClipSeconds: number;     // default 15
  midClipSeconds: number;       // default 30
  longClipSeconds: number;      // default 60
  // Legacy single-hotkey field (kept for back-compat reads)
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
const processDetector = new ProcessDetector();
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

// ─── 編集完了コールバック ───────────────────────────────────────

clipper.setEditCompleteCallback((info) => {
  console.log('[Main] Edit complete:', info.rawPath, '->', info.editedPath);
  mainWindow?.webContents.send('clip:edit-complete', {
    rawPath: info.rawPath,
    editedPath: info.editedPath,
  });

  // デスクトップ通知
  new Notification({
    title: 'VLYP Clips',
    body: `クリップ編集完了: ${path.basename(info.editedPath || info.rawPath)}`,
  }).show();
});

// ─── ウィンドウ作成 ─────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 380,
    minHeight: 500,
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: '#09090b',
    icon: path.join(__dirname, '../../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 開発時はVite dev server、本番はビルド済みHTML
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('close', (e) => {
    // ×ボタンではトレイに最小化（録画中は終了しない）
    if (isRecording) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── トレイアイコン ─────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(__dirname, '../../public/icon.png');
  let icon: Electron.NativeImage;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('VLYP Clips');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'VLYP Clips を開く',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: '録画開始',
      click: () => startRecording(),
      enabled: !isRecording,
    },
    {
      label: '録画停止',
      click: () => stopRecording(),
      enabled: isRecording,
    },
    { type: 'separator' },
    {
      label: '終了',
      click: () => {
        isRecording = false;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ─── 録画制御 ───────────────────────────────────────────────────

async function startRecording(): Promise<{ success: boolean; error?: string }> {
  if (isRecording) return { success: true };
  try {
    recorder.setOptions({
      bufferSeconds: store.get('bufferSeconds'),
      framerate: store.get('framerate'),
      quality: store.get('encoderQuality'),
      preferredEncoder: store.get('preferredEncoder') as any,
    });
    await recorder.startRollingBuffer();
    isRecording = true;

    // ゲーム検知開始
    detector.start((event) => {
      console.log(`[Main] Game event: ${event.type} (${event.game})`);
      if (store.get('autoClip') && (event.type === 'kill' || event.type === 'multikill' || event.type === 'ace')) {
        handleAutoClip(event);
      }
    });

    apexDetector.start((event) => {
      console.log(`[Main] Apex event: ${event.type}`);
      if (store.get('autoClip')) {
        handleAutoClip(event);
      }
    });

    // Generic process detector (Fortnite / CS2 / Overwatch / PUBG / Rocket League)
    // Cannot auto-clip on kill; user uses Ctrl+F9 hotkey for manual clips while in-game.
    processDetector.start((event) => {
      console.log(`[Main] Process event: ${event.type} ${event.game}`);
      mainWindow?.webContents.send('game:status', { game: event.game, running: event.type === 'game-detected' });
    });

    mainWindow?.webContents.send('recording:status', { isRecording: true });
    console.log('[Main] Recording started');
    return { success: true };
  } catch (err: any) {
    console.error('[Main] Start recording error:', err);
    isRecording = false;
    return { success: false, error: err.message };
  }
}

async function stopRecording(): Promise<{ success: boolean }> {
  if (!isRecording) return { success: true };
  isRecording = false;
  detector.stop();
  apexDetector.stop();
  processDetector.stop();
  await recorder.stopRecording();
  mainWindow?.webContents.send('recording:status', { isRecording: false });
  console.log('[Main] Recording stopped');
  return { success: true };
}

async function handleAutoClip(event: any): Promise<void> {
  const bufferDir = recorder.getBufferDir();

  const editOptions: EditOptions | undefined = store.get('autoEdit')
    ? {
        vertical: store.get('vertical'),
        captions: store.get('captions'),
        openaiApiKey: store.get('openaiApiKey'),
        language: store.get('language'),
      }
    : undefined;

  const clipInfo = await clipper.clipFromBuffer(bufferDir, event, editOptions);
  if (clipInfo) {
    mainWindow?.webContents.send('clip:created', {
      rawPath: clipInfo.rawPath,
      timestamp: clipInfo.timestamp,
      event: clipInfo.event,
      editing: clipInfo.editing,
    });

    new Notification({
      title: 'VLYP Clips',
      body: `${event.type === 'ace' ? '🔥 ACE!' : event.type === 'multikill' ? '⚡ マルチキル!' : '🎯 キル!'} クリップを保存しました`,
    }).show();
  }
}

async function handleManualClip(clipLengthSeconds?: number): Promise<{ success: boolean; error?: string }> {
  if (!isRecording) return { success: false, error: 'Not recording' };
  const bufferDir = recorder.getBufferDir();
  const manualEvent: any = { type: 'manual' as const, killCount: 0, timestamp: Date.now(), clipLengthSeconds };

  const editOptions: EditOptions | undefined = store.get('autoEdit')
    ? {
        vertical: store.get('vertical'),
        captions: store.get('captions'),
        openaiApiKey: store.get('openaiApiKey'),
        language: store.get('language'),
      }
    : undefined;

  const clipInfo = await clipper.clipFromBuffer(bufferDir, manualEvent, editOptions);
  if (clipInfo) {
    mainWindow?.webContents.send('clip:created', {
      rawPath: clipInfo.rawPath,
      timestamp: clipInfo.timestamp,
      event: clipInfo.event,
      editing: clipInfo.editing,
    });
    return { success: true };
  }
  return { success: false, error: 'Failed to create clip' };
}

// ─── IPC ハンドラ ───────────────────────────────────────────────

ipcMain.handle('recorder:start', async () => startRecording());
ipcMain.handle('recorder:stop', async () => stopRecording());
ipcMain.handle('recorder:manual-clip', async (_e, args?: { lengthSeconds?: number }) => handleManualClip(args?.lengthSeconds));

ipcMain.handle('clip:list', async () => {
  const clipsDir = clipper.getClipsDir();
  try {
    const files = fs.readdirSync(clipsDir)
      .filter((f) => f.endsWith('.mp4') && !f.includes('_vert') && !f.includes('_sub') && !f.includes('_audio'))
      .sort()
      .reverse();

    return files.map((f) => {
      const fullPath = path.join(clipsDir, f);
      const stats = fs.statSync(fullPath);
      const editedPath = path.join(clipsDir, f.replace('.mp4', '_edited.mp4'));
      const thumbPath = fullPath.replace(/\.mp4$/, '.jpg');
      // Best-effort parse: filename pattern is clip_<ts>_<eventtype>.mp4
      let detectedEvent = 'unknown';
      const m = f.match(/^clip_\d+_([a-z]+)/i);
      if (m) detectedEvent = m[1];
      return {
        rawPath: fullPath,
        editedPath: fs.existsSync(editedPath) ? editedPath : undefined,
        thumbPath: fs.existsSync(thumbPath) ? thumbPath : undefined,
        sizeBytes: stats.size,
        timestamp: stats.mtimeMs,
        event: { type: detectedEvent, killCount: 0, timestamp: stats.mtimeMs },
        editing: false,
      };
    });
  } catch {
    return [];
  }
});

ipcMain.handle('clip:delete', async (_event, rawPath: string) => {
  try {
    if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
    // 編集済みファイルも削除
    const editedPath = rawPath.replace('.mp4', '_edited.mp4');
    if (fs.existsSync(editedPath)) fs.unlinkSync(editedPath);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clip:edit', async (_event, rawPath: string) => {
  const editOptions: EditOptions = {
    vertical: store.get('vertical'),
    captions: store.get('captions'),
    openaiApiKey: store.get('openaiApiKey'),
    language: store.get('language'),
  };
  const info = await clipper.editClip(rawPath, editOptions);
  return info ? { success: true } : { success: false };
});

ipcMain.handle('clip:reveal', async (_event, clipPath: string) => {
  shell.showItemInFolder(clipPath);
});

// Upload clip to VLYP. POST to /api/desktop-upload with Bearer auth from stored session.
ipcMain.handle('clip:upload', async (_event, args: { clipPath: string; title?: string; gameTitle?: string }) => {
  try {
    const session = store.get('auth') as AuthSession | undefined;
    if (!session?.accessToken) {
      return { success: false, error: 'NOT_LOGGED_IN' };
    }
    if (!fs.existsSync(args.clipPath)) {
      return { success: false, error: 'FILE_NOT_FOUND' };
    }

    const apiBase = process.env.VLYP_API_BASE || 'https://vlyp.app';
    const endpoint = `${apiBase}/api/desktop-upload`;

    // Build multipart form
    const form = new FormData();
    form.append('video', fs.createReadStream(args.clipPath), {
      filename: path.basename(args.clipPath),
      contentType: 'video/mp4',
    });
    form.append('title', args.title || path.basename(args.clipPath, '.mp4'));
    form.append('game_title', args.gameTitle || 'Desktop Recording');
    form.append('vlyp_scores', '[]');

    // POST via https module to support form-data streams + size headers
    const result: { success: boolean; status: number; body: string } = await new Promise((resolve) => {
      const url = new URL(endpoint);
      const headers: Record<string, string> = {
        ...form.getHeaders(),
        Authorization: `Bearer ${session.accessToken}`,
      };
      const req = https.request(
        {
          method: 'POST',
          hostname: url.hostname,
          path: url.pathname + url.search,
          headers,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk.toString()));
          res.on('end', () => {
            resolve({ success: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300, status: res.statusCode ?? 0, body });
          });
        }
      );
      req.on('error', (err) => {
        console.error('[Upload] request error:', err);
        resolve({ success: false, status: 0, body: String(err) });
      });

      // form-data needs to write the multipart body to the request stream
      form.pipe(req);
    });

    if (!result.success) {
      console.warn('[Upload] failed', result.status, result.body.slice(0, 200));
      // 401 = stale token. Tell renderer to re-auth.
      if (result.status === 401) {
        return { success: false, error: 'NOT_LOGGED_IN' };
      }
      return { success: false, error: `HTTP_${result.status}` };
    }

    try {
      const parsed = JSON.parse(result.body);
      return { success: true, clip: parsed.clip };
    } catch {
      return { success: true };
    }
  } catch (err: any) {
    console.error('[Upload] exception:', err);
    return { success: false, error: err?.message || 'UNKNOWN' };
  }
});

ipcMain.handle('settings:get', async () => {
  return {
    autoClip: store.get('autoClip'),
    autoEdit: store.get('autoEdit'),
    vertical: store.get('vertical'),
    captions: store.get('captions'),
    language: store.get('language'),
    openaiApiKey: store.get('openaiApiKey'),
    clipsDir: store.get('clipsDir'),
    bufferSeconds: store.get('bufferSeconds'),
    framerate: store.get('framerate'),
    encoderQuality: store.get('encoderQuality'),
    preferredEncoder: store.get('preferredEncoder'),
    hotkeyShort: store.get('hotkeyShort'),
    hotkeyMid: store.get('hotkeyMid'),
    hotkeyLong: store.get('hotkeyLong'),
    shortClipSeconds: store.get('shortClipSeconds'),
    midClipSeconds: store.get('midClipSeconds'),
    longClipSeconds: store.get('longClipSeconds'),
    hotkey: store.get('hotkey'),
  };
});

ipcMain.handle('settings:set', async (_event, settings: Partial<AppSettings>) => {
  for (const [key, value] of Object.entries(settings)) {
    store.set(key as keyof AppSettings, value as any);
  }
  return { success: true };
});

// ─── 認証 IPC ───────────────────────────────────────────────────

ipcMain.handle('auth:login', async () => {
  // ブラウザでVLYPのログインページを開く（deep linkで戻ってくる）
  // TODO: vlyp.app DNS設定後に元に戻す
  // vlyp.app is the canonical production domain. Fallback to Vercel only via env override.
  const apiBase = process.env.VLYP_API_BASE || 'https://vlyp.app';
  const loginUrl = `${apiBase}/auth/desktop-login`;
  shell.openExternal(loginUrl);
  return { success: true };
});

ipcMain.handle('auth:logout', async () => {
  store.delete('auth');
  return { success: true };
});

ipcMain.handle('auth:get-session', async () => {
  return store.get('auth') || null;
});

// ─── ウィンドウ制御 IPC ─────────────────────────────────────────

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.hide());

// ─── アプリ起動 ─────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  createTray();

  // グローバルホットキー登録 (3つのクリップ長)
  const hotkeys: [string, number][] = [
    [store.get('hotkeyShort') || 'Ctrl+F9', store.get('shortClipSeconds') || 15],
    [store.get('hotkeyMid')   || 'Ctrl+F10', store.get('midClipSeconds')   || 30],
    [store.get('hotkeyLong')  || 'Ctrl+F11', store.get('longClipSeconds')  || 60],
  ];
  for (const [key, len] of hotkeys) {
    try {
      const ok = globalShortcut.register(key, () => {
        if (isRecording) handleManualClip(len);
      });
      console.log(`[Main] Hotkey registered: ${key} -> ${len}s (ok=${ok})`);
    } catch (err) {
      console.warn(`[Main] Failed to register hotkey ${key}:`, err);
    }
  }

  // コマンドライン引数からdeep linkを処理
  const deepLinkArg = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (deepLinkArg) handleDeepLink(deepLinkArg);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !isRecording) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (isRecording) {
    recorder.stopRecording();
    detector.stop();
    apexDetector.stop();
    processDetector.stop();
  }
});