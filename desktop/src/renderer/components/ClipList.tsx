import path from 'path-browserify';
import { Film, Loader2, Check, Trash2, Sparkles, Zap, Target, Flame } from 'lucide-react';
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

const EVENT_META: Record<string, { label: string; color: string; Icon: any }> = {
  kill:      { label: 'KILL',      color: 'from-blue-500 to-cyan-500',     Icon: Target },
  multikill: { label: 'MULTIKILL', color: 'from-violet-500 to-purple-500', Icon: Zap },
  ace:       { label: 'ACE',       color: 'from-yellow-400 to-orange-500', Icon: Flame },
  manual:    { label: 'MANUAL',    color: 'from-zinc-500 to-zinc-700',     Icon: Film },
  unknown:   { label: 'CLIP',      color: 'from-zinc-600 to-zinc-800',     Icon: Film },
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
      <div className="p-10 text-center text-zinc-500 space-y-3">
        <Film className="w-12 h-12 mx-auto opacity-30" strokeWidth={1.2} />
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">No clips yet</p>
        <p className="text-[11px] text-zinc-600 leading-relaxed">
          {t('main.startRecording')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {clips.map((c) => {
        const rawPath = c.rawPath;
        const isSelected = selected === rawPath;
        const isEditing = editingPaths.includes(rawPath);
        const isEdited = editedPaths.includes(rawPath);

        const time = new Date(c.timestamp).toLocaleTimeString(undefined, {
          hour: '2-digit', minute: '2-digit',
        });
        const evtKey = c.event?.type || 'unknown';
        const meta = EVENT_META[evtKey] || EVENT_META.unknown;
        const IconC = meta.Icon;

        return (
          <div
            key={rawPath}
            onClick={() => onSelect(rawPath)}
            className={`group relative rounded-xl cursor-pointer transition-all overflow-hidden border ${
              isSelected
                ? 'border-violet-500/60 bg-violet-500/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
            }`}
          >
            {/* Thumbnail 16:9, full width of card */}
            <div className="relative w-full aspect-video bg-black overflow-hidden">
              {c.thumbPath ? (
                <img
                  src={`file://${c.thumbPath}`}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  <Film className="w-8 h-8" strokeWidth={1.2} />
                </div>
              )}

              {/* Event badge top-left */}
              <div className={`absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r ${meta.color} shadow-lg`}>
                <IconC className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">{meta.label}</span>
              </div>

              {/* Time badge bottom-right */}
              <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
                <span className="text-[9px] font-bold text-white">{time}</span>
              </div>

              {/* Editing overlay */}
              {isEditing && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">AI Edit…</span>
                  </div>
                </div>
              )}

              {/* Edited badge */}
              {isEdited && !isEditing && (
                <div className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-600/90 backdrop-blur-sm">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  <span className="text-[9px] font-black text-white uppercase tracking-wider">AI</span>
                </div>
              )}

              {/* Delete on hover */}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(rawPath); }}
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-black/70 hover:bg-red-600 text-zinc-300 hover:text-white backdrop-blur-sm"
                aria-label="Delete clip"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Meta footer below thumbnail */}
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                {meta.label}
                {c.event?.killCount && c.event.killCount > 1 && ` ×${c.event.killCount}`}
              </span>
              {c.sizeBytes && (
                <span className="text-[10px] text-zinc-500 font-medium">{formatBytes(c.sizeBytes)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
