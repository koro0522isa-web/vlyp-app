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
        // 録画中に落ちたら映像のみで自動再起�