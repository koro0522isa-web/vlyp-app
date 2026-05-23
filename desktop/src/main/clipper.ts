import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { GameEvent } from './detector';
import { Editor, EditOptions } from './editor';
import { FFMPEG_PATH } from './ffmpeg-path';

export interface ClipInfo {
  rawPath: string;
  editedPath?: string;
  timestamp: number;
  event: GameEvent;
  editing: boolean;
}

export class Clipper {
  private clipsDir: string;
  private editor: Editor;
  private clips: Map<string, ClipInfo> = new Map();
  private onEditComplete?: (info: ClipInfo) => void;

  constructor() {
    this.clipsDir = path.join(app.getPath('videos'), 'VLYP Clips');
    if (!fs.existsSync(this.clipsDir)) {
      fs.mkdirSync(this.clipsDir, { recursive: true });
    }
    this.editor = new Editor();
  }

  setEditCompleteCallback(cb: (info: ClipInfo) => void) {
    this.onEditComplete = cb;
  }

  /**
   * バッファからクリップを作成し、設定に応じて自動編集を実行
   */
  async clipFromBuffer(
    bufferDir: string,
    event: GameEvent,
    editOptions?: EditOptions
  ): Promise<ClipInfo | null> {
    try {
      const segments = fs
        .readdirSync(bufferDir)
        .filter((f) => f.endsWith('.mp4'))
        .sort();

      if (segments.length === 0) {
        console.warn('[Clipper] No buffer segments available');
        return null;
      }

      const timestamp = Date.now();
      const rawPath = path.join(
        this.clipsDir,
        `clip_${timestamp}_${event.type}.mp4`
      );

      // 直近3セグメント = 最大30秒を使用
      const segmentsToUse = segments.slice(-3);
      const listFile = path.join(bufferDir, 'concat.txt');
      const listContent = segmentsToUse
        .map((s) => `file '${path.join(bufferDir, s).replace(/\\/g, '/')}'`)
        .join('\n');

      fs.writeFileSync(listFile, listContent);

      // セグメント結合 → 最後25秒を切り出し
      const rawClipPath = await this.concatAndTrim(listFile, rawPath);

      try { fs.unlinkSync(listFile); } catch {}

      if (!rawClipPath) return null;

      const clipInfo: ClipInfo = {
        rawPath,
        timestamp,
        event,
        editing: false,
      };
      this.clips.set(rawPath, clipInfo);

      // 自動編集が有効なら非同期で編集開始
      if (editOptions && (editOptions.vertical || editOptions.captions)) {
        clipInfo.editing = true;
        this.runAutoEdit(clipInfo, editOptions);
      }

      return clipInfo;
    } catch (err) {
      console.error('[Clipper] clipFromBuffer error:', err);
      return null;
    }
  }

  /**
   * 既存クリップを手動編集
   */
  async editClip(rawPath: string, editOptions: EditOptions): Promise<ClipInfo | null> {
    const existing = this.clips.get(rawPath);
    const info: ClipInfo = existing || {
      rawPath,
      timestamp: Date.now(),
      event: { type: 'manual' as const, killCount: 0, timestamp: Date.now() },
      editing: true,
    };

    info.editing = true;
    this.clips.set(rawPath, info);
    this.runAutoEdit(info, editOptions);
    return info;
  }

  private async runAutoEdit(info: ClipInfo, options: EditOptions): Promise<void> {
    console.log('[Clipper] Starting auto-edit for:', info.rawPath);
    try {
      const result = await this.editor.edit(info.rawPath, options);
      if (result.editedPath) {
        info.editedPath = result.editedPath;
        console.log('[Clipper] Auto-edit complete:', result.editedPath);
      } else {
        console.warn('[Clipper] Auto-edit returned no output:', result.error);
      }
    } catch (err) {
      console.error('[Clipper] Auto-edit error:', err);
    } finally {
      info.editing = false;
      this.onEditComplete?.(info);
    }
  }

  /**
   * セグメントを結合して最後25秒を切り出す
   */
  private concatAndTrim(listFile: string, outputPath: string): Promise<string | null> {
    return new Promise((resolve) => {
      const proc = spawn(FFMPEG_PATH, [
        '-f', 'concat',
        '-safe', '0',
        '-i', listFile,
        '-sseof', '-25',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        '-y', outputPath,
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stderr = '';
      proc.stderr?.on('data', (d) => (stderr += d.toString()));

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          console.log('[Clipper] Concat+trim done:', outputPath);
          resolve(outputPath);
        } else {
          console.error('[Clipper] ffmpeg concat failed code=', code, stderr.slice(-300));
          resolve(null);
        }
      });

      proc.on('error', (err) => {
        console.error('[Clipper] ffmpeg spawn error:', err);
        resolve(null);
      });
    });
  }

  getClips(): ClipInfo[] {
    return Array.from(this.clips.values());
  }

  getClipsDir(): string {
    return this.clipsDir;
  }
}