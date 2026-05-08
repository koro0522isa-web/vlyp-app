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
  maximi