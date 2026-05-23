import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { FFMPEG_PATH } from './ffmpeg-path';
import { detectBestEncoder, buildEncoderArgs, VideoEncoder } from './hw-encoder';

export interface RecorderOptions {
  bufferSeconds?: number;       // total rolling buffer (default 120s = 2min)
  segmentSeconds?: number;      // each segment duration (default 10s)
  quality?: number;             // CRF/CQ 18-28, default 23
  framerate?: number;           // default 60 (was 30 — Medal/Outplayed are 60+)
  preferredEncoder?: VideoEncoder | 'auto';
}

export class Recorder {
  private process: ChildProcess | null = null;
  private bufferDir: string;
  private isRecording = false;
  private options: Required<RecorderOptions> = {
    bufferSeconds: 120,
    segmentSeconds: 10,
    quality: 23,
    framerate: 60,
    preferredEncoder: 'auto',
  };
  private resolvedEncoder: VideoEncoder = 'libx264';

  constructor() {
    this.bufferDir = path.join(app.getPath('temp'), 'vlyp-buffer');
    if (!fs.existsSync(this.bufferDir)) {
      fs.mkdirSync(this.bufferDir, { recursive: true });
    }
  }

  setOptions(opts: RecorderOptions): void {
    this.options = { ...this.options, ...opts } as Required<RecorderOptions>;
  }

  async startRollingBuffer(): Promise<void> {
    if (this.isRecording) return;
    this.isRecording = true;

    // Resolve encoder (auto-detect or user-pinned)
    if (this.options.preferredEncoder === 'auto') {
      this.resolvedEncoder = await detectBestEncoder();
    } else {
      this.resolvedEncoder = this.options.preferredEncoder;
    }
    console.log(`[Recorder] using encoder: ${this.resolvedEncoder}`);

    // Clear old buffer
    try {
      fs.readdirSync(this.bufferDir).forEach((f) => {
        try { fs.unlinkSync(path.join(this.bufferDir, f)); } catch {}
      });
    } catch {}

    return new Promise<void>((resolve, reject) => {
      this.tryStart(true, resolve, reject);
    });
  }

  private tryStart(withAudio: boolean, resolve: () => void, reject: (e: Error) => void): void {
    const args = withAudio ? this.buildArgsWithAudio() : this.buildArgsVideoOnly();

    const proc = spawn(FFMPEG_PATH, args, {
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
      setTimeout(() => {
        if (proc.exitCode !== null && proc.exitCode !== 0 && withAudio) {
          console.warn('[Recorder] Audio capture exited early, retrying video-only');
          this.process = null;
          this.tryStart(false, resolve, reject);
        } else if (proc.exitCode === null) {
          console.log(`[Recorder] Started (audio=${withAudio}, encoder=${this.resolvedEncoder})`);
          resolve();
        }
      }, 1000);
    });

    proc.on('close', (code) => {
      if (this.isRecording && code !== 0) {
        console.warn(`[Recorder] ffmpeg closed unexpectedly code=${code}`);
        console.warn('[Recorder] stderr tail:', stderr.slice(-400));
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
      try { this.process.stdin?.write('q'); } catch {}
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

  getBufferDir(): string { return this.bufferDir; }
  isActive(): boolean { return this.isRecording; }
  getResolvedEncoder(): VideoEncoder { return this.resolvedEncoder; }
  getOptions(): Required<RecorderOptions> { return this.options; }

  /** segment_wrap = ceil(bufferSeconds / segmentSeconds) */
  private get segmentWrap(): number {
    return Math.max(2, Math.ceil(this.options.bufferSeconds / this.options.segmentSeconds));
  }

  /** Windows: gdigrab desktop + dshow audio + selected encoder */
  private buildArgsWithAudio(): string[] {
    const encArgs = buildEncoderArgs(this.resolvedEncoder, this.options.quality);
    return [
      '-f', 'gdigrab',
      '-framerate', String(this.options.framerate),
      '-i', 'desktop',
      '-f', 'dshow',
      '-i', 'audio=virtual-audio-capturer',
      ...encArgs,
      '-c:a', 'aac', '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      '-f', 'segment',
      '-segment_time', String(this.options.segmentSeconds),
      '-segment_format', 'mp4',
      '-reset_timestamps', '1',
      '-segment_wrap', String(this.segmentWrap),
      path.join(this.bufferDir, 'seg_%03d.mp4'),
    ];
  }

  private buildArgsVideoOnly(): string[] {
    const encArgs = buildEncoderArgs(this.resolvedEncoder, this.options.quality);
    return [
      '-f', 'gdigrab',
      '-framerate', String(this.options.framerate),
      '-i', 'desktop',
      ...encArgs,
      '-pix_fmt', 'yuv420p',
      '-an',
      '-f', 'segment',
      '-segment_time', String(this.options.segmentSeconds),
      '-segment_format', 'mp4',
      '-reset_timestamps', '1',
      '-segment_wrap', String(this.segmentWrap),
      path.join(this.bufferDir, 'seg_%03d.mp4'),
    ];
  }
}
