import { useT, useI18n } from '../i18n';
import { Minus, Square, X } from 'lucide-react';

interface StatusBarProps {
  isRecording: boolean;
}

export function StatusBar({ isRecording }: StatusBarProps) {
  const t = useT();
  const { locale } = useI18n();
  const currentTime = new Date().toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US');

  return (
    <div
      // Whole bar is draggable (frameless window header)
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="bg-zinc-900 border-b border-zinc-800 px-4 h-9 flex items-center justify-between select-none"
    >
      <div className="flex items-center gap-3 pointer-events-none">
        <span className="text-[10px] font-black text-violet-400 tracking-widest uppercase">VLYP Clips</span>
        <div className="h-3 border-l border-zinc-700" />
        <div className="flex items-center gap-1.5">
          {isRecording ? (
            <>
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">
                {t('status.recording')}
              </span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                {t('status.standby')}
              </span>
            </>
          )}
        </div>
        <div className="h-3 border-l border-zinc-700" />
        <span className="text-[10px] text-zinc-500">{currentTime}</span>
      </div>

      {/* Window control buttons - must be no-drag */}
      <div
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-1"
      >
        <button
          onClick={() => (window as any).electronAPI?.minimize?.()}
          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-white rounded transition-colors"
          aria-label="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => (window as any).electronAPI?.maximize?.()}
          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-white rounded transition-colors"
          aria-label="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={() => (window as any).electronAPI?.close?.()}
          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:bg-red-600 hover:text-white rounded transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
