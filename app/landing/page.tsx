"use client";

import Link from 'next/link';
import { Gamepad2, Coins, Crown, Play, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-hidden">

      {/* ===== Nav ===== */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <span className="text-xl font-black tracking-tight text-blue-500">VLYP</span>
        <Link
          href="/login"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ログイン
        </Link>
      </nav>

      {/* ===== Hero ===== */}
      <section className="relative flex flex-col items-center text-center px-6 pt-24 pb-20">
        {/* glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-600/20 blur-[120px]" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl mx-auto">
          {/* badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
            <Play size={11} className="fill-blue-400" />
            ゲーマーのための動画プラットフォーム
          </span>

          <h1 className="text-5xl sm:text-6xl font-black leading-tight tracking-tight">
            プレイを共有して、<br />
            <span className="text-blue-500">仲間に応援される。</span>
          </h1>

          <p className="text-gray-400 text-lg max-w-md">
            フォロワー0からでも稼げる。<br />
            あなたのゲームクリップが価値になる。
          </p>

          <Link
            href="/login"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors px-8 py-3.5 text-sm font-bold shadow-lg shadow-blue-600/30"
          >
            <Gamepad2 size={16} />
            今すぐ無料で始める
          </Link>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-center text-2xl font-bold mb-10 text-gray-100">
          なぜVLYPか
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: <Gamepad2 size={22} className="text-blue-400" />,
              title: 'ゲーム特化フィード',
              desc: 'AIがあなたのゲームジャンルに最適化されたクリップを表示。余計なコンテンツは入ってこない。',
            },
            {
              icon: <Coins size={22} className="text-yellow-400" />,
              title: 'コイン投げ銭',
              desc: '100コイン=¥150から。好きなクリエイターを直接応援できる。中間業者なし。',
            },
            {
              icon: <Crown size={22} className="text-purple-400" />,
              title: 'Proクリエイター',
              desc: '月額¥1,500でProバッジ、予約投稿、収益ダッシュボードが解放される。',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/8 bg-white/3 p-6 flex flex-col gap-3 hover:border-blue-500/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-bold text-white">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="px-6 py-16 bg-white/2 border-y border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl font-bold mb-12 text-gray-100">
            始め方は3ステップ
          </h2>
          <div className="flex flex-col sm:flex-row items-start gap-8 sm:gap-0">
            {[
              { step: '01', title: '無料登録（30秒）', desc: 'メールアドレスだけで完了。クレカ不要。' },
              { step: '02', title: 'クリップを投稿', desc: 'スマホ撮影でもOK。ゲーム画面そのままでいい。' },
              { step: '03', title: 'コインを受け取る', desc: '応援が届いたらすぐ確認できる。Proなら収益化もできる。' },
            ].map((s, i) => (
              <div key={s.step} className="flex-1 flex flex-col items-center sm:items-start gap-3 relative sm:px-6">
                {i < 2 && (
                  <div className="hidden sm:block absolute right-0 top-5 w-px h-8 bg-white/10" />
                )}
                <span className="text-blue-500 font-black text-3xl">{s.step}</span>
                <h3 className="font-bold text-white text-center sm:text-left">{s.title}</h3>
                <p className="text-sm text-gray-400 text-center sm:text-left">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative flex flex-col items-center text-center px-6 py-24">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[500px] h-[300px] rounded-full bg-blue-700/15 blur-[100px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-5 max-w-lg mx-auto">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle2 size={15} />
            無料・クレカ不要・30秒で完了
          </div>
          <h2 className="text-3xl sm:text-4xl font-black leading-tight">
            今すぐVLYPを<br />
            <span className="text-blue-500">無料で始める</span>
          </h2>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors px-8 py-3.5 text-sm font-bold shadow-lg shadow-blue-600/30"
          >
            <Gamepad2 size={16} />
            無料でHajimeru
          </Link>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-gray-600">
        <p className="font-bold text-gray-400 mb-2">VLYP</p>
        <p>© 2026 VLYP Inc. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/legal/terms" className="hover:text-gray-400 transition-colors">利用規約</Link>
          <Link href="/legal/privacy" className="hover:text-gray-400 transition-colors">プライバシーポリシー</Link>
        </div>
      </footer>

    </div>
  );
}
