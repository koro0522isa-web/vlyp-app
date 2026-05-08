import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import Store from 'electron-store';
import { Recorder } from './recorder';
import { Detector } from './detector';
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

const store = new Store<AppSettings>({
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

// ─── グローバル変数 ─────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isRecording = false;

const recorder = new Recorder();
const detector = new Detector();
const clipper = new Clipper();

// ─── 編集完了コールバック ───────────────────────────────────────

clipper.setEditCompleteCallback((info) => {
  if (mainWindow) {
    mainWindow.webContents.send('clip:edit_complete', {
      rawPath: info.rawPath,
      editedPath: info.editedPath,
      event: info.event,
    });
  }
  // 編集完了通知
  showNotification('VLYP Clips', '✨ 自動編集が完了しました！');
});

// ─── ウィンドウ作成 ─────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#09090B',
    titleBarStyle: 'hidden',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // 閉じるボタン → トレイに隠す (完全終了しない)
  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow?.hide();
    showNotification('VLYP Clips', 'バックグラウンドで録画を継続中です');
  });
}

// ─── システムトレイ ─────────────────────────────────────────────

function createTray() {
  // 16×16 の最小限アイコン (PNGがなければ空イ