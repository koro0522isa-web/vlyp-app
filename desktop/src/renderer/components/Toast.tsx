import { useEffect, useState } from 'react';
import { Check, Target, Zap, Flame, Film, X } from 'lucide-react';

interface ToastProps {
  message: string;
  subMessage?: string;
  type: 'clip' | 'edit' | 'upload' | 'error';
  eventType?: string;
  onClose: () => void;
  duration?: number;
}

const EVENT_ICONS: Record<string, any> = {
  kill: Target,
  multikill: Zap,
  ace: Flame,
  manual: Film,
  unknown: Film,
};

const TYPE_STYLES: Record<string, { gradient: string; glow: string; defaultIcon: any }> = {
  clip:   { gradient: 'from-blue-600 via-violet-600 to-pink-600', glow: 'shadow-violet-500/40', defaultIcon: Film },
  edit:   { gradient: 'from-amber-500 to-orange-600',             glow: 'shadow-amber-500/40', defaultIcon: Zap },
  upload: { gradient: 'from-emerald-500 to-teal-600',             glow: 'shadow-emerald-500/40', defaultIcon: Check },
  error:  { gradient: 'from-red-600 to-rose-700',                 glow: 'shadow-red-500/40', defaultIcon: X },
};

export function Toast({ message, subMessage, type, eventType, onClose, duration = 4000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const tid = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(tid);
  }, [duration, onClose]);

  const style = TYPE_STYLES[type];
  const IconC = eventType ? (EVENT_ICONS[eventType] || style.defaultIcon) : style.defaultIcon;

  return (
    <div
      className={`fixed top-14 right-4 z-50 transition-all duration-300 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
    >
      <div className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl shadow-2xl ${style.glow}`}>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg ${style.glow}`}>
          <IconC className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-white uppercase tracking-wider">{message}</p>
          {subMessage && <p className="text-[11px] text-zinc-400 mt-0.5">{subMessage}</p>}
        </div>
        <button
          onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
          className="ml-2 text-zinc-600 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export interface ToastItem {
  id: number;
  message: string;
  subMessage?: string;
  type: 'clip' | 'edit' | 'upload' | 'error';
  eventType?: string;
}

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast {...t} onClose={() => onDismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
