import { useT } from '../i18n';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const t = useT();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 bg-zinc-950">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-white tracking-tight">
          VLYP <span className="text-violet-400">Clips</span>
        </h1>
        <p className="text-zinc-400 text-sm">
          {t('login.subtitle')}
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="font-semibold text-white">{t('login.title')}</p>
          <p className="text-xs text-zinc-500">{t('login.subtitle')}</p>
        </div>

        <button
          onClick={onLogin}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-900/30"
        >
          {t('login.cta')}
        </button>

        <div className="text-center">
          <p className="text-xs text-zinc-600 leading-relaxed">
            {t('login.note')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-sm text-center">
        {[
          { icon: '🎮', labelKey: 'login.feature.detect', descKey: 'login.feature.detectDesc' },
          { icon: '✂️', labelKey: 'login.feature.clip', descKey: 'login.feature.clipDesc' },
          { icon: '🚀', labelKey: 'login.feature.upload', descKey: 'login.feature.uploadDesc' },
        ].map((f) => (
          <div key={f.labelKey} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 space-y-1">
            <div className="text-2xl">{f.icon}</div>
            <p className="text-xs font-semibold text-white">{t(f.labelKey)}</p>
            <p className="text-xs text-zinc-500">{t(f.descKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
