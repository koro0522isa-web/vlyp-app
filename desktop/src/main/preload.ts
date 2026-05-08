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

  // ウィンドウ制御 (フレームレス)
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // イベント購読
  onClipCreated: (callback: (data: any) => void) => {
    ipcRenderer.on('clip:created', (_: IpcRendererEvent, data: any) => callback(data));
  },
  onClipEditComplete: (callback: (data: any) => void) => {
  