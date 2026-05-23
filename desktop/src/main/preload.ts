import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const electronAPI = {
  // 録画
  startRecording: () => ipcRenderer.invoke('recorder:start'),
  stopRecording: () => ipcRenderer.invoke('recorder:stop'),
  manualClip: () => ipcRenderer.invoke('recorder:manual-clip'),

  // クリップ
  listClips: () => ipcRenderer.invoke('clip:list'),
  deleteClip: (rawPath: string) => ipcRenderer.invoke('clip:delete', rawPath),
  editClip: (rawPath: string) => ipcRenderer.invoke('clip:edit', rawPath),
  revealClip: (clipPath: string) => ipcRenderer.invoke('clip:reveal', clipPath),
  uploadClip: (args: { clipPath: string; title?: string; gameTitle?: string }) =>
    ipcRenderer.invoke('clip:upload', args),

  // 設定
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:set', settings),

  // 認証
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getSession: () => ipcRenderer.invoke('auth:get-session'),
  onAuthSession: (callback: (session: any) => void) => {
    ipcRenderer.on('auth:session', (_: IpcRendererEvent, session: any) => callback(session));
  },

  // ウィンドウ制御 (フレームレス)
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // イベントリスナー
  onClipCreated: (callback: (data: any) => void) => {
    ipcRenderer.on('clip:created', (_: IpcRendererEvent, data: any) => callback(data));
  },
  onGameStatus: (callback: (data: { game: string; running: boolean }) => void) => {
    ipcRenderer.on('game:status', (_: IpcRendererEvent, data: any) => callback(data));
  },
  onClipEditComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('clip:edit-complete', (_: IpcRendererEvent, data: any) => callback(data));
  },
  onRecordingStatus: (callback: (data: any) => void) => {
    ipcRenderer.on('recording:status', (_: IpcRendererEvent, data: any) => callback(data));
  },

  // リスナー解除
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);