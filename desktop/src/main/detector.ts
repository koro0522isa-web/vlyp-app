import https from 'https';

export type GameType = 'valorant' | 'lol' | 'none';

export interface GameEvent {
  type: 'kill' | 'death' | 'ace' | 'multikill' | 'unknown';
  killCount?: number;
  timestamp: number;
  gameTime?: number;
  game?: GameType;
  data?: any;
}

/**
 * ValorantとLoL両対応のキル検知クラス
 * どちらも同じローカルポート(2999)でLive Client Data APIを提供する
 */
export class Detector {
  private pollInterval: NodeJS.Timeout | null = null;
  private gameCheckInterval: NodeJS.Timeout | null = null;
  private callback: ((event: GameEvent) => void) | null = null;
  private isPolling = false;

  // ゲーム別の状態
  private lastKills = 0;
  private lastDeaths = 0;
  private currentGame: GameType = 'none';
  private playerName = '';

  start(callback: (event: GameEvent) => void) {
    this.callback = callback;
    this.isPolling = true;
    this.resetState();

    // ゲーム検出 → 1秒ごとにポーリング
    this.pollInterval = setInterval(() => this.poll(), 1000);
    console.log('[Detector] Started. Watching for Valorant / LoL...');
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.gameCheckInterval) {
      clearInterval(this.gameCheckInterval);
      this.gameCheckInterval = null;
    }
    this.isPolling = false;
    this.resetState();
    console.log('[Detector] Stopped.');
  }

  getCurrentGame(): GameType {
    return this.currentGame;
  }

  // ─── プライベート ───────────────────────────────────────────────

  private resetState() {
    this.lastKills = 0;
    this.lastDeaths = 0;
    this.currentGame = 'none';
    this.playerName = '';
  }

  private async poll(): Promise<void> {
    if (!this.isPolling) return;

    const data = await this.fetchLiveClientData();
    if (!data) {
      if (this.currentGame !== 'none') {
        console.log(`[Detector] ${this.currentGame} disconnected`);
        this.resetState();
      }
      return;
    }

    // ゲーム種別を判定
    if (this.currentGame === 'none') {
      this.currentGame = this.detectGame(data);
      if (this.currentGame !== 'none') {
        console.log(`[Detector] Game detected: ${this.currentGame}`);
        this.resetState();
        this.currentGame = this.detectGame(data); // reset後に再代入
      }
    }

    if (this.currentGame === 'valorant') {
      this.processValorant(data);
    } else if (this.currentGame === 'lol') {
      this.processLoL(data);
    }
  }

  /**
   * Riot Games Live Client Data API (ポート2999) を叩く
   * ValorantとLoL両方がこのエンドポイントを使う
   */
  private fetchLiveClientData(): Promise<any> {
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: '127.0.0.1',
          port: 2999,
          path: '/liveclientdata/allgamedata',
          method: 'GET',
          rejectUnauthorized: false,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve(null);
            }
          });
        }
      );

      req.on('error', () => resolve(null));
      req.setTimeout(800, () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });
  }

  /**
   * レスポンスの構造でゲーム種別を判定
   * - Valorant: activePlayer.riotId が存在 かつ gameMode が Valorant形式
   * - LoL: gameData.gameMode が 'CLASSIC' | 'ARAM' | 'URF' など
   */
  private detectGame(data: any): GameType {
    if (!data) return 'none';

    // Valorant判定: summonerName or riotId + Valorantっぽいゲームモード
    const gameMode = data.gameData?.gameMode || '';
    const valorantModes = ['BOMB', 'COMPETITIVE', 'UNRATED', 'DEATHMATCH', 'SWIFTPLAY', 'PREMIER'];
    if (valorantModes.some((m) => gameMode.toUpperCase().includes(m))) {
      return 'valorant';
    }

    // LoL判定: CLASSIC, ARAM, URF, CHERRY(Arena)など
    const lolModes = ['CLASSIC', 'ARAM', 'URF', 'ONEFORALL', 'CHERRY', 'NEXUSBLITZ'];
    if (lolModes.some((m) => gameMode.toUpperCase().includes(m))) {
      return 'lol';
    }

    // ゲームモード不明でも activePlayer が存在すればどちらかが動いている
    if (data.activePlayer) {
      // LoL固有フィールドがあればLoL
      if (data.activePlayer.championStats) return 'lol';
      // それ以外はValorant
      return 'valorant';
    }

    return 'none';
  }

  // ─── Valorant処理 ────────────────────────────────────────────────

  private processValorant(data: any): void {
    const kills = data.activePlayer?.scores?.kills ?? 0;
    const deaths = data.activePlayer?.scores?.deaths ?? 0;
    const player = data.activePlayer?.summonerName || data.activePlayer?.riotId || 'Player';

    if (kills > this.lastKills) {
      const diff = kills - this.lastKills;
      const eventType = diff >= 5 ? 'ace' : diff >= 3 ? 'multikill' : 'kill';
      this.fireEvent({
        type: eventType,
        killCount: diff,
        timestamp: Date.now(),
        gameTime: data.gameData?.gameTime,
        game: 'valorant',
        data: { kills, deaths, player },
      });
      this.lastKills = kills;
    }

    if (deaths > this.lastDeaths) {
      this.lastDeaths = deaths;
    }
  }

  // ─── LoL処理 ────────────────────────────────────────────────────

  private processLoL(data: any): void {
    // LoLではactivePlayerのsummonerNameとallPlayersを突き合わせてキル数を取る
    const myName = data.activePlayer?.summonerName || '';
    if (!myName) return;

    // allPlayersから自分を見つける
    const me = (data.allPlayers || []).find(
      (p: any) => p.summonerName === myName || p.riotId === myName
    );
    if (!me) return;

    const kills = me.scores?.kills ?? 0;
    const deaths = me.scores?.deaths ?? 0;
    const assists = me.scores?.assists ?? 0;

    if (kills > this.lastKills) {
      const diff = kills - this.lastKills;
      // LoLのペンタキル = 5キル
      const eventType = diff >= 5 ? 'ace' : diff >= 3 ? 'multikill' : 'kill';
      this.fireEvent({
        type: eventType,
        killCount: diff,
        timestamp: Date.now(),
        gameTime: data.gameData?.gameTime,
        game: 'lol',
        data: { kills, deaths, assists, player: myName, champion: me.championName },
      });
      this.lastKills = kills;
    }

    if (deaths > this.lastDeaths) {
      this.lastDeaths = deaths;
    }
  }

  private fireEvent(event: GameEvent): void {
    console.log(`[Detector] Event: ${event.type} (${event.game}) kills=${event.killCount}`);
    this.callback?.(event);
  }
}
