import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { Recorder } from './recorder';
import { Detector } from './detector';
import { Clipper } from './clipper';
import { EditOptions } from './editor';

// 設定スキーマ
interface AppSettings {
  autoClip: boolean;
  autoEdit: boolean;
  vertical: boolean;
  captions: boolean;
  language: string;
  openaiApiKey: string;
  clipsDir: string;
}

const store = new Store<AppSettings>({
  defaults: {
    autoClip: true,
    autoEdit: true,
    vertical: true,
    captions: true,
    language: 'ja',
    openaiApiKey: '',
    clipsDir: path.join(app.getPath('videos'), 'VLYP Clips'),
  },
});

let mainWindow: BrowserWindow | null = null;
const recorder = new Recorder();
const detector = new Detector();
const clipper = new Clipper();

// 編集完了コールバック — レンダラーへ通知
clipper.setEditCompleteCallback((info) => {
  if (mainWindow) {
    mainWindow.webContents.send('clip:edit_complete', {
      rawPath: info.rawPath,
      editedPath: info.editedPath,
      event: info.event,
    });
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#09090B',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── IPC ハンドラ ────────────────────────────────────────────────

ipcMain.handle('recorder:start', async () => {
  try {
    await recorder.startRollingBuffer();

    const autoClip = store.get('autoClip');
    if (autoClip) {
      detector.start(async (event) => {
        const autoEdit = store.get('autoEdit');
        const editOptions: EditOptions | undefined = autoEdit
          ? {
              vertical: store.get('vertical'),
              captions: store.get('captions'),
              openaiApiKey: store.get('openaiApiKey'),
              language: store.get('language'),
            }
          : undefined;

        const clipInfo = await clipper.clipFromBuffer(
          recorder.getBufferPath(),
          event,
          editOptions
        );

        if (mainWindow && clipInfo) {
          mainWindow.webContents.send('clip:created', {
            rawPath: clipInfo.rawPath,
            editedPath: clipInfo.editedPath,
            editing: clipInfo.editing,
            event: clipInfo.event,
          });
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('[Main] Failed to start recording:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('recorder:stop', async () =