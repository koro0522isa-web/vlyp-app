import path from 'path-browserify';

interface ClipListProps {
  clips: string[];
  selected: string | null;
  onSelect: (clipPath: string) => void;
  onDelete: (clipPath: string) => void;
  editingPaths?: string[];
  editedPaths?: string[];
}

export function ClipList({
  clips,
  selected,
  onSelect,
  onDelete,
  editingPaths = [],
  editedPaths = [],
}: ClipListProps) {
  if (clips.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-500 space-y-2">
        <p className="text-2xl">🎬</p>
        <p className="text-sm">クリップはまだありません</p>
        <p className="text-xs text-zinc-600">録画を開始してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {clips.map((rawPath) => {
        const fileName = path.basename(rawPath, '.mp4');
        const isSelected = selected === rawPath;
        const isEditing = editingPaths.includes(rawPath);
        const isEdited = editedPaths.includes(rawPath);

        // ファイル名から日時を抽出 (clip_TIMESTAMP_type)
        const tsMatch = fileName.match(/clip_(\d+)_/);
        const displayTime = tsMatch
          ? new Date(parseInt(tsMatch[1])).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : '';

        return (
          <div
            key={rawPath}
            className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? 'bg-violet-700 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
            onClick={() => onSelect(rawPath)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* バッジ行 */}
                <div className="flex items-center gap-1 mb-1 flex-wrap">
                  {isEditing && (
                    <span className="text-xs bg-amber-700/60 text-amber-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                      <span className="animate-spin inline-block text-[10px]">⏳</span>
                      編集中
                    </span>
                  )}
                  {isEdited && !isEditing && (
                    <span className="text-xs bg-emerald-800/60 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                      ✓ 編集済
                    </span>
                  )}
                  {!isEdited && !isEditing && (
                    <span className="text-xs bg-zinc-700/60 text-zinc-500 px-1.5 py-0.5 rounded">
                      RAW
                    </span>
                  )}
                </div>
                {displayTime && (
                  <p className="text-xs text-zinc-400">{displayTime}</p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(rawPath);
                }}
                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-xs ${
                  isSelected ? 'hover:bg-violet-600' : 'hover:bg-zinc-600 text-zinc-500'
                }`}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
