import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export type ApexEvent = {
  type: 'kill' | 'death' | 'unknown';
  killCount: number;
  timestamp: number;
  game: 'apex';
};

/**
 * Apex Legends キル検知
 *
 * 方式1: プロセス監視 (r5apex.exe 起動/終了を検知)
 * 方式2: ゲームログ解析 (%USERPROFILE%\Saved Games\Respawn\Apex\local\game_history.bin は非公開)
 *        → 代替: タスクリストでプロセス存在確認 + Ctrl+F9 手動クリップを推奨
 * 方式3 (将来): desktopCapturer でキルフィード画像OCR
 */
export class ApexDetector {
  private pollInterval: NodeJS.Timeout | null = null;
  private callback: ((event: ApexEvent) => void) | null = null;
  private isRunning = false;
  private apexRunning = false;
  private lastKillTime = 0;

  // Apex ログファイルパス (EA版 / Steam版両対応)
  private readonly logPaths = [
    path.join(os.homedir(), 'Saved Games', 'Respawn', 'Apex', 'local', 'r5apex.log'),
    path.join(process.env.LOCALAPPDATA || '', 'Respawn', 'Apex', 'r5apex.log'),
  ];

  start(callback: (event: ApexEvent) => void) {
    this.callback = callback;
    this.isRunning = true;
    // 5秒ごとにプロセスチェック
    this.pollInterval = setInterval(() => this.poll(), 5000);
    console.log('[ApexDetector] Started. Watching for r5apex.exe...');
  }

  stop() {
    this.isRunning = false;
    this.apexRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log('[ApexDetector] Stopped.');
  }

  isApexRunning(): boolean {
    return this.apexRunning;
  }

  // ─── プライベート ───────────────────────────────────────────────

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    const running = await this.checkProcess();

    if (running && !this.apexRunning) {
      this.apexRunning = true;
      console.log('[ApexDetector] Apex Legends detected!');
      // ログ解析を開始
      this.startLogWatch();
    } else if (!running && this.apexRunning) {
      this.apexRunning = false;
      console.log('[ApexDetector] Apex Legends closed.');
    }
  }

  /** tasklist コマンドで r5apex.exe が存在するか確認 */
  private checkProcess(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile('tasklist', ['/FI', 'IMAGENAME eq r5apex.exe', '/NH'], (err, stdout) => {
        if (err) {
          resolve(false);
          return;
        }
        resolve(stdout.toLowerCase().includes('r5apex.exe'));
      });
    });
  }

  /**
   * Apex のログファイルを監視してキルイベントを検知
   * ログに kill イベントが含まれていれば発火
   * (Apex はリアルタイムログに限界があるため、主に手動クリップ補助として機能)
   */
  private logWatcher: fs.FSWatcher | null = null;
  private lastLogSize = 0;

  private startLogWatch() {
    // 既存のウォッチャーをクリア
    if (this.logWatcher) {
      this.logWatcher.close();
      this.logWatcher = null;
    }

    const logPath = this.logPaths.find((p) => fs.existsSync(p));
    if (!logPath) {
      console.log('[ApexDetector] No log file found. Kill detection via hotkey only.');
      return;
    }

    console.log(`[ApexDetector] Watching log: ${logPath}`);
    try {
      this.lastLogSize = fs.statSync(logPath).size;

      this.logWatcher = fs.watch(logPath, { persistent: false }, () => {
        if (!this.apexRunning) return;
        try {
          const stat = fs.statSync(logPath);
          if (stat.size <= this.lastLogSize) return;

          // 追加分だけ読む
          const fd = fs.openSync(logPath, 'r');
          const buf = Buffer.alloc(stat.size - this.lastLogSize);
          fs.readSync(fd, buf, 0, buf.length, this.lastLogSize);
          fs.closeSync(fd);
          this.lastLogSize = stat.size;

          const newContent = buf.toString('utf-8');
          this.parseKillEvents(newContent);
        } catch {
          // ログ読み取りエラーは無視
        }
      });
    } catch (e) {
      console.warn('[ApexDetector] Log watch failed:', e);
    }
  }

  /**
   * ログテキストからキルイベントを解析
   * Apex のログに "killed by" や "kill" フレーズが出た場合に発火
   */
  private parseKillEvents(text: string): void {
    const lines = text.split('\n');
    let killCount = 0;

    for (const line of lines) {
      const lower = line.toLowerCase();
      // Apex ログに含まれるキル関連フレーズを検出
      if (
        lower.includes('player_killed') ||
        lower.includes('kills_leader') ||
        lower.includes('you_knocked_down') ||
        lower.includes('knockout')
      ) {
        killCount++;
      }
    }

    if (killCount > 0) {
      const now = Date.now();
      // デバウンス: 2秒以内の重複イベントは無視
      if (now - this.lastKillTime < 2000) return;
      this.lastKillTime = now;

      this.callback?.({
        type: 'kill',
        killCount,
        timestamp: now,
        game: 'apex',
      });
    }
  }
}
