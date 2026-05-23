import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export class Recorder {
  private process: ChildProcess | null = null;
  private bufferDir: string;
  private isRecording = false;

  constructor() {
    this.bufferDir = path.join(app.getPath('temp'), 'vlyp-buffer');
    if (!fs.existsSync(this.bufferDir)) {
      fs.mkdirSync(this.bufferDir, { recursive: true });
    }
  }

  async startRollingBuffer(): Promise<void> {
    if (this.isRecording) return;
    this.isRecording = true;

    // 古いバッファをクリア
    try {
      fs.readdirSync(this.bufferDir).forEach((f) => {
        try { fs.unlinkSync(path.join(this.bufferDir, f)); } catch {}
      });
    } catch {}

    // まず音声付きで試みて、失敗したら映像のみにフォールバック
    return new Promise<void>((resolve, reject) => {
      this.tryStart(true, resolve, reject);
    });
  }

  private tryStart(withAudio: boolean, resolve: () => void, reject: (e: Error) => void): void {
    const args = withAudio ? this.buildArgsWithAudio() : this.buildArgsVideoOnly();

    const proc = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stderr = '';
    proc.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));

    proc.on('error', (err) => {
      if (withAudio) {
        console.warn('[Recorder] Audio init failed, retrying video-only:', err.message);
        this.tryStart(false, resolve, reject);
      } else {
        this.isRecording = false;
        reject(err);
      }
    });

    proc.on('spawn', () => {
      this.process = proc;
      // 1秒後に即死していないか確認
      setTimeout(() => {
        if (proc.exitCode !== null && proc.exitCode !== 0 && withAudio) {
          console.warn('[Recorder] Audio capture exited early, retrying video-only');
          this.process = null;
          this.tryStart(false, resolve, reject);
        } else if (proc.exitCode === null) {
          console.log(`[Recorder] Started (audio=${withAudio})`);
          resolve();
        }
      }, 1000);
    });

    proc.on('close', (code) => {
      if (this.isRecording && code !== 0) {
        console.warn(`[Recorder] ffmpeg closed unexpectedly code=${code}`);
        // 録画中に落ちたら映像のみで自動再起動
        this.process = null;
        setTimeout(() => {
          if (this.isRecording) {
            console.log('[Recorder] Auto-restarting video-only...');
            this.tryStart(false, () => {}, () => {});
          }
        }, 500);
      }
    });
  }

  async stopRecording(): Promise<string> {
    this.isRecording = false;
    if (this.process) {
      // ffmpegに'q'を送って正常終了
      try {
        this.process.stdin?.write('q');
      } catch {}
      // 3秒待って強制終了
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          try { this.process?.kill('SIGKILL'); } catch {}
          resolve();
        }, 3000);
        this.process?.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      this.process = null;
    }
    return this.bufferDir;
  }

  getBufferDir(): string {
    return this.bufferDir;
  }

  isActive(): boolean {
    return this.isRecording;
  }

  /**
   * 音声付きキャプチャ引数 (Windows: gdigrab + dshow audio)
   * 10秒ごとのセグメントファイルとしてローリングバッファ
   */
  private buildArgsWithAudio(): string[] {
    return [
      // デスクトップ映像キャプチャ
      '-f', 'gdigrab',
      '-framerate', '30',
      '-i', 'desktop',
      // システム音声キャプチャ (DirectShow)
      '-f', 'dshow',
      '-i', 'audio=virtual-audio-capturer',
      // エンコード設定
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
      '-c:a', 'aac', '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      // セグメント出力 (10秒ごと)
      '-f', 'segment',
      '-segment_time', '10',
      '-segment_format', 'mp4',
      '-reset_timestamps', '1',
      '-segment_wrap', '12',  // 最大12セグメント = 120秒バッファ (Medal並)
      path.join(this.bufferDir, 'seg_%03d.mp4'),
    ];
  }

  /**
   * 映像のみキャプチャ引数 (音声デバイスがない場合のフォールバック)
   */
  private buildArgsVideoOnly(): string[] {
    return [
      '-f', 'gdigrab',
      '-framerate', '30',
      '-i', 'desktop',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
      '-pix_fmt', 'yuv420p',
      '-an',  // 音声なし
      '-f', 'segment',
      '-segment_time', '10',
      '-segment_format', 'mp4',
      '-reset_timestamps', '1',
      '-segment_wrap', '12',
      path.join(this.bufferDir, 'seg_%03d.mp4'),
    ];
  }
}