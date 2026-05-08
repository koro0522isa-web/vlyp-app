interface StatusBarProps {
  isRecording: boolean;
}

export function StatusBar({ isRecording }: StatusBarProps) {
  const currentTime = new Date().toLocaleTimeString('ja-JP');

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">
                録画中
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-zinc-600 rounded-full" />
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                スタンバイ
              </span>
            </>
          )}
        </div>
        <div className="h-4 border-l border-zinc-700" />
        <span className="text-xs text-zinc-400">
          Valorant API: <span className="text-zinc-300">待受中...</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-xs text-zinc-400">
          {currentTime}
        </div>
      </div>
    </div>
  );
}
