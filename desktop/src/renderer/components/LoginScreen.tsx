interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 bg-zinc-950">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-white tracking-tight">
          VLYP <span className="text-violet-400">Clips</span>
        </h1>
        <p className="text-zinc-400 text-sm">
          ゲームクリップを自動保存・編集・投稿
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="font-semibold text-white">VLYPアカウントでログイン</p>
          <p className="text-xs text-zinc-500">クリップの投稿にアカウントが必要です</p>
        </div>

        <button
          onClick={onLogin}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-900/30"
        >
          ブラウザでログイン
        </button>

        <div className="text-center">
          <p className="text-xs text-zinc-600 leading-relaxed">
            ブラウザが開き、VLYPのログインページに移動します。
            <br />
            ログイン完了後、自動でアプリに戻ります。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-sm text-center">
        {[
          { icon: '🎮', label: 'キル検知', desc: 'Valorant / LoL / Apex' },
          { icon: '✂️', label: '自動クリップ', desc: '最大2分のバッファ' },
          { icon: '🚀', label: 'VLYPに投稿', desc: 'ワンクリック' },
        ].map((f) => (
          <div key={f.label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 space-y-1">
            <div className="text-2xl">{f.icon}</div>
            <p className="text-xs font-semibold text-white">{f.label}</p>
            <p className="text-xs text-zinc-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
