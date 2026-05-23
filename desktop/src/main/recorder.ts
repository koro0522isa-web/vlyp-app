import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { FFMPEG_PATH } from './ffmpeg-path';
import { detectBestEncoder, buildEncoderArgs, VideoEncoder } from './hw-encoder';

export interface RecorderOptions {
  bufferSeconds?: number;
  segmentSeconds?: number;
  quality?: number;
  framerate?: number;
  preferredEncoder?: VideoEncoder | 'auto';
}

type CaptureMethod = 'ddagrab' | 'gdigrab';

export class Recorder {
  private process: ChildProcess | null = null;
  private bufferDir: string;
  private isRecording = false;
  private options: Required<RecorderOptions> = {
    bufferSeconds: 120,
    segmentSeconds: 10,
    quality: 23,
    framerate: 30,   // ★ default 30 — gdigrab fallback path also stays usable
    preferredEncoder: 'auto',
  };
  private resolvedEncoder: VideoEncoder = 'libx264';
  private resolvedCapture: CaptureMethod = 'ddagrab';

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

    if (this.options.preferredEncoder === 'auto') {
      this.resolvedEncoder = await detectBestEncoder();
    } else {
      this.resolvedEncoder = this.options.preferredEncoder;
    }
    console.log(`[Recorder] encoder=${this.resolvedEncoder}`);

    // Clear old buffer
    try {
      fs.readdirSync(this.bufferDir).forEach((f) => {
        try { fs.unlinkSync(path.join(this.bufferDir, f)); } catch {}
      });
    } catch {}

    // Try ddagrab first (GPU-direct, near-zero overhead — Medal/Outplayed style),
    // fall back to gdigrab if ddagrab fails (older FFmpeg or non-DXGI-capable display).
    return new Promise<void>((resolve, reject) => {
      this.resolvedCapture = 'ddagrab';
      this.tryStart(true, resolve, reject);
    });
  }

  private tryStart(withAudio: boolean, resolve: () => void, reject: (e: Error) => void): void {
    const args = this.buildArgs(withAudio);

    const proc = spawn(FFMPEG_PATH, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stderr = '';
    proc.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));

    proc.on('error', (err) => {
      this.handleEarlyFailure(withAudio, resolve, reject, err.message, stderr);
    });

    proc.on('spawn', () => {
      this.process = proc;
      setTimeout(() => {
        if (proc.exitCode !== null && proc.exitCode !== 0) {
          this.handleEarlyFailure(withAudio, resolve, reject, `exit ${proc.exitCode}`, stderr);
        } else if (proc.exitCode === null) {
          console.log(`[Recorder] Started capture=${this.resolvedCapture} audio=${withAudio} encoder=${this.resolvedEncoder}`);
          resolve();
        }
      }, 1200);
    });

    proc.on('close', (code) => {
      if (this.isRecording && code !== 0) {
        console.warn(`[Recorder] ffmpeg closed code=${code}`);
        console.warn('[Recorder] stderr tail:', stderr.slice(-400));
        this.process = null;
        setTimeout(() => {
          if (this.isRecording) {
            console.log('[Recorder] Auto-restart (video-only)...');
            this.tryStart(false, () => {}, () => {});
          }
        }, 500);
      }
    });
  }

  /** Cascade: ddagrab+audio → ddagrab no-audio → gdigrab+audio → gdigrab no-audio → reject */
  private handleEarlyFailure(
    withAudio: boolean,
    resolve: () => void,
    reject: (e: Error) => void,
    reason: string,
    stderr: string,
  ): void {
    console.warn(`[Recorder] ${this.resolvedCapture}/audio=${withAudio} failed (${reason})`);
    if (stderr) console.warn('[Recorder] stderr tail:', stderr.slice(-300));
    this.process = null;

    if (this.resolvedCapture === 'ddagrab' && withAudio) {
      this.tryStart(false, resolve, reject); return;
    }
    if (this.resolvedCapture === 'ddagrab' && !withAudio) {
      console.log('[Recorder] Falling back ddagrab → gdigrab');
      this.resolvedCapture = 'gdigrab';
      this.tryStart(true, resolve, reject); return;
    }
    if (this.resolvedCapture === 'gdigrab' && withAudio) {
      this.tryStart(false, resolve, reject); return;
    }
    // All paths exhausted
    this.isRecording = false;
    reject(new Error('All capture methods failed. Last: ' + reason));
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
  getResolvedCapture(): CaptureMethod { return this.resolvedCapture; }
  getOptions(): Required<RecorderOptions> { return this.options; }

  private get segmentWrap(): number {
    return Math.max(2, Math.ceil(this.options.bufferSeconds / this.options.segmentSeconds));
  }

  private buildArgs(withAudio: boolean): string[] {
    const enc = buildEncoderArgs(this.resolvedEncoder, this.options.quality);
    const fr = this.options.framerate;

    // Audio segment: dshow virtual-audio-capturer (only attached if user has it)
    const audioIn = withAudio ? ['-f', 'dshow', '-i', 'audio=virtual-audio-capturer'] : [];
    const audioEnc = withAudio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an'];

    const segOut = [
      '-pix_fmt', 'yuv420p',
      ...audioEnc,
      '-f', 'segment',
      '-segment_time', String(this.options.segmentSeconds),
      '-segment_format', 'mp4',
      '-reset_timestamps', '1',
      '-segment_wrap', String(this.segmentWrap),
      path.join(this.bufferDir, 'seg_%03d.mp4'),
    ];

    if (this.resolvedCapture === 'ddagrab') {
      // GPU-direct capture via DXGI Desktop Duplication. ~0% CPU on capture.
      // hwdownload to system memory so NVENC/QSV/AMF/x264 can ingest.
      return [
        '-hide_banner',
        '-init_hw_device', 'd3d11va=hw',
        '-filter_complex', `ddagrab=output_idx=0:framerate=${fr},hwdownload,format=bgra`,
        ...audioIn,
        ...enc,
        ...segOut,
      ];
    }

    // gdigrab fallback (CPU-heavy, used if ddagrab unavailable)
    return [
      '-hide_banner',
      '-f', 'gdigrab',
      '-framerate', String(fr),
      '-i', 'desktop',
      ...audioIn,
      ...enc,
      ...segOut,
    ];
  }
}
