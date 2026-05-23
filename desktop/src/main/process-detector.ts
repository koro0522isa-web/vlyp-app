import { execFile } from 'child_process';

/**
 * Generic process-based game detector
 *
 * For games without a Live Client Data API (Fortnite, CS2, Overwatch, PUBG, etc.),
 * we can only detect the game's presence via process name. Kill detection is
 * delegated to the user via hotkey (Ctrl+F9 → manual clip).
 *
 * This expands TAM by enabling auto-recording in-game even without auto-clipping.
 */

export type SupportedProcessGame =
  | 'fortnite'
  | 'cs2'
  | 'overwatch'
  | 'pubg'
  | 'rocket-league';

export type ProcessGameEvent = {
  type: 'game-detected' | 'game-closed';
  game: SupportedProcessGame;
  timestamp: number;
};

interface GameConfig {
  id: SupportedProcessGame;
  processName: string; // case-insensitive substring match against tasklist output
  displayName: string;
}

const GAMES: GameConfig[] = [
  // Fortnite (Battle Royale, Save the World)
  { id: 'fortnite', processName: 'FortniteClient-Win64-Shipping.exe', displayName: 'Fortnite' },
  // Counter-Strike 2
  { id: 'cs2', processName: 'cs2.exe', displayName: 'Counter-Strike 2' },
  // Overwatch 2
  { id: 'overwatch', processName: 'Overwatch.exe', displayName: 'Overwatch 2' },
  // PUBG: Battlegrounds
  { id: 'pubg', processName: 'TslGame.exe', displayName: 'PUBG: Battlegrounds' },
  // Rocket League
  { id: 'rocket-league', processName: 'RocketLeague.exe', displayName: 'Rocket League' },
];

export class ProcessDetector {
  private pollInterval: NodeJS.Timeout | null = null;
  private callback: ((event: ProcessGameEvent) => void) | null = null;
  private isRunning = false;
  private runningGames = new Set<SupportedProcessGame>();

  start(callback: (event: ProcessGameEvent) => void) {
    this.callback = callback;
    this.isRunning = true;
    this.runningGames.clear();
    // Poll every 8 seconds (process detection doesn't need high frequency)
    this.pollInterval = setInterval(() => this.poll(), 8000);
    console.log('[ProcessDetector] Started. Monitoring Fortnite / CS2 / Overwatch / PUBG / Rocket League...');
    // Immediate first poll
    this.poll();
  }

  stop() {
    this.isRunning = false;
    this.runningGames.clear();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log('[ProcessDetector] Stopped.');
  }

  /** List of currently detected games (for status display) */
  getCurrentlyRunning(): SupportedProcessGame[] {
    return Array.from(this.runningGames);
  }

  /** Lookup display name for a game id */
  static getDisplayName(id: SupportedProcessGame): string {
    return GAMES.find((g) => g.id === id)?.displayName ?? id;
  }

  // ─── Private ─────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    const tasklistOutput = await this.runTasklist();
    if (tasklistOutput === null) return;
    const lower = tasklistOutput.toLowerCase();

    for (const game of GAMES) {
      const isRunning = lower.includes(game.processName.toLowerCase());
      const wasRunning = this.runningGames.has(game.id);

      if (isRunning && !wasRunning) {
        this.runningGames.add(game.id);
        console.log(`[ProcessDetector] ${game.displayName} detected`);
        this.callback?.({
          type: 'game-detected',
          game: game.id,
          timestamp: Date.now(),
        });
      } else if (!isRunning && wasRunning) {
        this.runningGames.delete(game.id);
        console.log(`[ProcessDetector] ${game.displayName} closed`);
        this.callback?.({
          type: 'game-closed',
          game: game.id,
          timestamp: Date.now(),
        });
      }
    }
  }

  /** Run Windows tasklist and return full output (null on failure / non-Windows) */
  private runTasklist(): Promise<string | null> {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve(null);
        return;
      }
      execFile('tasklist', ['/NH'], { maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        resolve(stdout);
      });
    });
  }
}
