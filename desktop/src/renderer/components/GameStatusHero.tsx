import { Gamepad2, Zap, Sparkles } from 'lucide-react';

interface Props {
  game: string | null;
  isRecording: boolean;
  clipsCount: number;
  locale: 'ja' | 'en';
}

const GAME_LABEL: Record<string, string> = {
  valorant: 'VALORANT',
  lol: 'League of Legends',
  league: 'League of Legends',
  tft: 'Teamfight Tactics',
  apex: 'Apex Legends',
  cs2: 'Counter-Strike 2',
  fortnite: 'Fortnite',
  overwatch: 'Overwatch',
};

export function GameStatusHero({ game, isRecording, clipsCount, locale }: Props) {
  const gameLabel = game ? (GAME_LABEL[game.toLowerCase()] || game) : null;

  // Game detected — show vibrant hero card
  if (game) {
    return (
      <div className="relative w-full max-w-2xl">
        <div className="absolute -top-6 left-8 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-violet-500/40">
          {locale === 'ja' ? '検知済み' : 'Detected'}
        </div>
        <div className="relative p-10 rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-600/20 via-blue-600/10 to-pink-600/20 backdrop-blur-xl shadow-[0_0_80px_rgba(168,85,247,0.25)]">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <Gamepad2 className="w-14 h-14 text-violet-300 mb-5" strokeWidth={1.5} />
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-300 via-violet-300 to-pink-300 bg-clip-text text-transparent mb-3 leading-none">
            {gameLabel}
          </h1>
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            {isRecording ? (
              <>
                <span className="inline-flex relative">
                  <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="font-bold uppercase tracking-wider text-red-400 text-xs">
                  {locale === 'ja' ? '録画中' : 'Recording'}
                </span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400">
                  {locale === 'ja' ? 'キル検知で自動クリップ' : 'Auto-clip on kill'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-violet-300 animate-pulse" />
                <span className="text-zinc-400">{locale === 'ja' ? '録画準備中…' : 'Initializing…'}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standby — no game running
  return (
    <div className="text-center space-y-6 max-w-md">
      <div className="relative w-28 h-28 mx-auto">
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-blue-600/20 via-violet-600/20 to-pink-600/20 blur-2xl" />
        <div className="relative w-28 h-28 rounded-[2rem] bg-gradient-to-br from-zinc-900 to-black border border-white/10 flex items-center justify-center shadow-2xl">
          <Gamepad2 className="w-12 h-12 text-zinc-500" strokeWidth={1.5} />
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent leading-tight">
          {locale === 'ja' ? 'ゲーム待機中' : 'Waiting for game'}
        </h1>
        <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
          {locale === 'ja' ? (
            <>Valorant · LoL · TFT · Apex · CS2 · Fortnite · Overwatch<br/>を起動すると自動録画開始</>
          ) : (
            <>Launch Valorant, LoL, TFT, Apex, CS2, Fortnite, or Overwatch<br/>to auto-record</>
          )}
        </p>
      </div>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03]">
        <Zap className="w-3.5 h-3.5 text-yellow-400" />
        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
          {locale === 'ja' ? 'GPU 録画 · 低負荷モード' : 'GPU Capture · Low CPU'}
        </span>
      </div>
      {clipsCount > 0 && (
        <p className="text-zinc-600 text-[11px] uppercase tracking-[0.3em]">
          {locale === 'ja' ? '← 過去のクリップを選択して再生' : '← Select a past clip to play'}
        </p>
      )}
    </div>
  );
}
