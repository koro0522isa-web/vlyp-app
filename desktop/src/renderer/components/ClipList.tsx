import path from 'path-browserify';
import { Film, Loader2, Check, Trash2, Sparkles } from 'lucide-react';
import { useT } from '../i18n';

export interface ClipMeta {
  rawPath: string;
  editedPath?: string;
  thumbPath?: string;
  sizeBytes?: number;
  timestamp: number;
  event?: { type: string; killCount?: number };
}

interface ClipListProps {
  clips: ClipMeta[];
  selected: string | null;
  onSelect: (clipPath: string) => void;
  onDelete: (clipPath: string) => void;
  editingPaths?: string[];
  editedPaths?: string[];
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const EVENT_LABEL: Record<string, string> = {
  kill: 'Kill',
  multikill: 'Multikill',
  ace: 'Ace',
  manual: 'Manual',
  unknown: 'Clip',
};

export function ClipList({
  clips,
  selected,
  onSelect,
  onDelete,
  editingPaths = [],
  editedPaths = [],
}: ClipListProps) {
  const t = useT();

  if (clips.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 space-y-3">
        <Film className="w-10 h-10 mx-auto opacity-50" strokeWidth={1.5} />
        <p className="text-sm text-zinc-400">No clips yet</p>
        <p className="text-xs text-zinc-600 leading-relaxed">
          {t('main.startRecording')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {clips.map((c) => {
        const rawPath = c.rawPath;
        const fileName = path.basename(rawPath, '.mp4');
        const isSelected = selected === rawPath;
        const isEditing = editingPaths.includes(rawPath);
        const isEdited = editedPaths.includes(rawPath);

        const time = new Date(c.timestamp).toLocaleTimeString(undefined, {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
        const evtKey = c.event?.type || 'unknown';
        const eventLabel = EVENT_LABEL[evtKey] || EVENT_LABEL.unknown;

        return (
          <div
            key={rawPath}
            onClick={() => onSelect(rawPath)}
            className={`group relative rounded-lg cursor-pointer transition-all overflow-hidden border ${
              isSelected
                ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/40'
                : 'border-transparent bg-zinc-900/40 hover:bg-zinc-800/60'
            }`}
          >
            <div className="flex gap-3 p-2">
              {/* Thumbnail (16:9 ratio) */}
              <div className="relative w-24 h-[54px] bg-black rounded overflow-hidden flex-shrink-0">
                {c.thumbPath ? (
                  <img
                    src={`file://${c.thumbPath}`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <Film className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                  </div>
                )}
                {isEdited && !isEditing && (
                  <div className="absolute bottom-0 left-0 right-0 bg-emerald-700/80 px-1 py-0.5 flex items-center gap-1 justify-center">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    <span className="text-[9px] font-bold uppercase tracking-wide leading-none">Edit</span>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                    {eventLabel}
                  </span>
                  {evtKey === 'ace' && <Sparkles className="w-3 h-3 text-yellow-400" strokeWidth={2.5} />}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span>{time}</span>
                  {c.sizeBytes && <>
                    <span className="text-zinc-700">·</span>
                    <span>{formatBytes(c.sizeBytes)}</span>
                  </>}
                </div>
              </div>

              {/* Delete (revealed on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(rawPath);
                }}
                className={`self-start opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md ${
                  isSelected ? 'hover:bg-violet-500/30 text-white' : 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300'
                }`}
                aria-label="Delete clip"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
