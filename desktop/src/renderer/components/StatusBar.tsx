import { useT, useI18n } from '../i18n';
import { Minus, Square, X } from 'lucide-react';

interface StatusBarProps {
  isRecording: boolean;
  currentGame?: string | null;
}

export function StatusBar({ isRecording, currentGame }: StatusBarProps) {
  const t = useT();
  const { locale } = useI18n();

  return (
    <div
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="bg-gradient-to-r from-zinc-950 via-black to-zinc-950 border-b border-white/5 px-4 h-10 flex items-center justify-between select-none"
    >
      <div className="flex items-center gap-3 pointer-events-none">
        <span className="text-[11px] font-black tracking-[0.25em] uppercase bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
          VLYP CLIPS
        </span>
        <div className="h-3 border-l border-white/10" />
        <div className="flex items-center gap-1.5">
          {isRecording ? (
            <>
              <span className="inline-flex relative">
                <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                {t('status.recording')}
              </span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {t('status.standby')}
              </span>
            </>
          )}
        </div>
        {currentGame && (
          <>
            <div className="h-3 border-l border-white/10" />
            <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">
              {currentGame}
            </span>
          </>
        )}
      </div>

      <div
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-0.5"
      >
        <button
          onClick={() => (window as any).electronAPI?.minimize?.()}
          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:bg-white/5 hover:text-white rounded transition-colors"
          aria-label="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => (window as any).electronAPI?.maximize?.()}
          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:bg-white/5 hover:text-white rounded transition-colors"
          aria-label="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={() => (window as any).electronAPI?.close?.()}
          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:bg-red-600 hover:text-white rounded transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
