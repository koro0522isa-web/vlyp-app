"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getVariant, track } from '@/lib/ab';
import { Gamepad2, Coins, Crown, Play, CheckCircle2, Zap, Monitor, Scissors, Type, Upload, ArrowRight, Star, Shield, BarChart3, Clock, Sparkles, Target, Video, Wand2, Globe } from 'lucide-react';

type HeroVariant = 'A' | 'B';

const HERO_CTA_VARIANTS: Record<HeroVariant, { label: string; sub: string }> = {
  A: { label: '今すぐ無料で始める', sub: '完全無料・クレカ不要・30秒で完了' },
  B: { label: '30秒でアカウント作成 →', sub: 'クレカ不要・最初の7日間Proが無料' },
};

export default function LandingPage() {
  const [heroVariant, setHeroVariant] = useState<HeroVariant>('A');

  useEffect(() => {
    const v = getVariant<HeroVariant>('lp_hero_cta', ['A', 'B']);
    setHeroVariant(v);
    track('lp_hero_view', { variant: v });
  }, []);

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-[#09090B] text-white">

      {/* ===== Nav ===== */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl bg-[#09090B]/80">
        <span className="text-xl font-black tracking-tight text-blue-500">VLYP</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            ログイン
          </Link>
          <Link
            href="/login"
            className="text-sm font-bold bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors"
          >
            無料登録
          </Link>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section className="relative flex flex-col items-center text-center px-6 pt-24 pb-20">
        {/* glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/15 blur-[150px]" />
        <div className="pointer-events-none absolute top-20 right-1/4 w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl mx-auto">
          {/* badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-400 animate-pulse">
            <Play size={11} className="fill-blue-400" />
            ゲーマーのための動画プラットフォーム
          </span>

          <h1 className="text-5xl sm:text-7xl font-black leading-[1.1] tracking-tight">
            キルした瞬間、<br />
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">自動で切り抜き。</span>
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-xl leading-relaxed">
            VLYPデスクトップアプリが、あなたのゲームプレイを
            常時録画。キルを検知して自動で切り抜き・縦型変換・
            字幕追加。そのまま投稿して収益化。
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Link
              href="/login"
              onClick={() => track('lp_hero_cta_click', { variant: heroVariant })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all px-8 py-4 text-sm font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:scale-[1.02]"
            >
              <Gamepad2 size={18} />
              {HERO_CTA_VARIANTS[heroVariant].label}
            </Link>
            <Link
              href="/login?intent=pro"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 transition-all px-8 py-4 text-sm font-medium text-blue-300"
            >
              <Monitor size={18} />
              7日間Pro無料トライアル
            </Link>
          </div>

          {/* social proof */}
          <div className="flex items-center gap-6 mt-6 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" />
              完全無料で開始
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" />
              クレカ不要
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" />
              30秒で登録完了
            </div>
          </div>
        </div>
      </section>

      {/* ===== Auto Pipeline Demo ===== */}
      <section id="desktop-app" className="px-6 py-20 border-y border-white/5 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400 mb-4">
              <Zap size={11} /> ゲーマー向け自動クリップ
            </span>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight">
              キル → 切り抜き → 投稿、<br />
              <span className="text-blue-500">すべて全自動。</span>
            </h2>
          </div>

          {/* Pipeline steps */}
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              {
                icon: <Target size={24} className="text-red-400" />,
                step: '01',
                title: 'キル検知',
                desc: 'Valorant・LoL・Apexのキルをリアルタイム検知',
                color: 'border-red-500/20 bg-red-500/5',
              },
              {
                icon: <Scissors size={24} className="text-orange-400" />,
                step: '02',
                title: '自動切り抜き',
                desc: 'キルの前後25秒を自動でクリップ保存',
                color: 'border-orange-500/20 bg-orange-500/5',
              },
              {
                icon: <Video size={24} className="text-blue-400" />,
                step: '03',
                title: '縦型変換 + 字幕',
                desc: '9:16変換 + AI字幕を自動で追加',
                color: 'border-blue-500/20 bg-blue-500/5',
              },
              {
                icon: <Upload size={24} className="text-green-400" />,
                step: '04',
                title: 'ワンクリック投稿',
                desc: 'VLYPに直接投稿して即座に収益化',
                color: 'border-green-500/20 bg-green-500/5',
              },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                <div className={`rounded-xl border ${s.color} p-5 h-full flex flex-col gap-3 hover:scale-[1.02] transition-transform`}>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      {s.icon}
                    </div>
                    <span className="text-xs font-mono text-gray-600">{s.step}</span>
                  </div>
                  <h3 className="font-bold text-white">{s.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-gray-700">
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Supported games */}
          <div className="flex items-center justify-center gap-6 mt-10 text-sm text-gray-500">
            <span>対応ゲーム:</span>
            <span className="text-red-400 font-semibold">Valorant</span>
            <span className="text-blue-400 font-semibold">League of Legends</span>
            <span className="text-orange-400 font-semibold">Apex Legends</span>
            <span className="text-gray-600">+ 今後追加予定</span>
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-center text-3xl font-black mb-12 text-gray-100">
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
              desc: '月額¥980でProバッジ、予約投稿、収益ダッシュボードが解放される。最初の7日間は無料。',
            },
            {
              icon: <Monitor size={22} className="text-cyan-400" />,
              title: 'デスクトップアプリ',
              desc: 'ゲーム中にバックグラウンドで常時録画。キルを検知して自動で切り抜き。',
            },
            {
              icon: <Type size={22} className="text-pink-400" />,
              title: 'AI字幕 (Whisper)',
              desc: 'OpenAI Whisperによる高精度な自動字幕。日本語・英語・韓国語対応。',
            },
            {
              icon: <Shield size={22} className="text-green-400" />,
              title: '安心のセキュリティ',
              desc: 'Supabase RLSによるデータ保護。Stripe決済で安全な取引。',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/8 bg-white/[0.02] p-6 flex flex-col gap-3 hover:border-blue-500/30 hover:bg-white/[0.04] transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="font-bold text-white">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== VLYP Pro Studio (SaaS統合) ===== */}
      <section className="px-6 py-20 bg-gradient-to-b from-blue-950/20 via-violet-950/20 to-transparent border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-300 mb-4">
              <Sparkles size={12} />
              Pro Studio — クリエイターワークフロー全部入り
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              撮る・切る・編集・投稿を<br className="sm:hidden" />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">1つで完結。</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
              キル検知・自動切り抜き・縦型変換・AI字幕・BGMミックス・透かし制御・投稿まで、海外SaaSが別々のツールでやっている全工程を、日本語UIで完結。Proなら全部入り。
            </p>
          </div>

          {/* Workflow row */}
          <div className="grid sm:grid-cols-4 gap-3 mb-12">
            {[
              { step: '01', icon: <Video size={18} className="text-red-400" />, title: '常時録画', desc: 'バックグラウンドで直近2分をローリング保持' },
              { step: '02', icon: <Target size={18} className="text-yellow-400" />, title: '自動検知', desc: 'Valorant / LoL / Apex のキル・Aceを検知' },
              { step: '03', icon: <Scissors size={18} className="text-purple-400" />, title: '自動編集', desc: '音声ピークでハイライト抽出・縦型変換' },
              { step: '04', icon: <Upload size={18} className="text-green-400" />, title: '1クリック投稿', desc: 'VLYPフィードへ直接投稿。中間ツール無し' },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-purple-500/30 transition-colors">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3">{s.step}</p>
                <div className="flex items-center gap-2 mb-2">{s.icon}<h3 className="text-sm font-bold text-white">{s.title}</h3></div>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Feature grid */}
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {[
              { icon: <Monitor size={18} className="text-cyan-400" />, title: 'デスクトップアプリ', body: 'Windows用Electron版。Valorant/LoL/Apexの Live Client Data APIで安定したキル検知。', badge: 'Pro' },
              { icon: <Scissors size={18} className="text-violet-400" />, title: 'ブラウザ動画エディタ', body: 'FFmpeg.wasmでブラウザ完結。アップロード不要・処理データはあなたのPC内のみ。', badge: '今すぐ試せる' },
              { icon: <Sparkles size={18} className="text-pink-400" />, title: '音声ピーク自動ハイライト', body: '500ms RMSウィンドウで叫び・効果音ピークを検出。10秒クリップを自動生成。', badge: 'Pro' },
              { icon: <Type size={18} className="text-orange-400" />, title: '縦型変換 + AI字幕', body: '9:16ショート最適化 + OpenAI Whisper による自動字幕焼き付け。', badge: 'Pro' },
              { icon: <Star size={18} className="text-amber-400" />, title: 'BGMミックス', body: '好きな音声を持ち込んで動画音声と重ねる。音量スライダー付き。サーバー送信なし。', badge: 'Pro' },
              { icon: <Globe size={18} className="text-blue-400" />, title: '日本語完全対応', body: 'UI・タイトル焼き付け(NotoSansJP)・AI字幕まで全て日本語ネイティブ。海外SaaSにない強み。', badge: 'Free / Pro' },
              { icon: <Zap size={18} className="text-yellow-400" />, title: '究極の安さ', body: '海外SaaSが月\$5〜10のところ、VLYP Proは月¥980 + 7日無料トライアル。', badge: 'Pro' },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-black/30 p-5 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">{f.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-bold text-white">{f.title}</h3>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${f.badge === 'Pro' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : f.badge === '今すぐ試せる' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>{f.badge}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/edit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 transition-all px-8 py-4 text-sm font-bold shadow-lg shadow-purple-600/30 hover:scale-[1.02]"
            >
              <Wand2 size={18} />
              ブラウザで今すぐ動画編集を試す
            </Link>
            <Link
              href="/login?intent=pro"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 transition-all px-8 py-4 text-sm font-medium text-purple-300"
            >
              <Crown size={18} />
              全機能をProで開放 (7日無料)
            </Link>
          </div>

          <p className="text-center text-[10px] text-gray-500 mt-6 font-medium uppercase tracking-widest">
            🎉 Windows 版デスクトップアプリが公開されました
          </p>
          <div className="flex justify-center mt-3">
            <a
              href="https://github.com/koro0522isa-web/vlyp-app/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all text-sm font-bold text-cyan-300"
            >
              <Monitor size={16} />
              VLYP Clips for Windows をダウンロード
            </a>
          </div>
        </div>
      </section>

      {/* ===== Free vs Pro ===== */}
      <section className="px-6 py-20 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent border-y border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-100">Free vs Pro</h2>
            <p className="text-gray-500 mt-2">Proにアップグレードして、すべての機能を解放しよう</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Free */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
              <div className="flex items-center gap-2 mb-6">
                <Gamepad2 size={20} className="text-gray-400" />
                <h3 className="text-xl font-bold">Free</h3>
              </div>
              <p className="text-3xl font-black mb-6">¥0<span className="text-sm font-normal text-gray-500">/月</span></p>
              <ul className="space-y-3 text-sm">
                {[
                  '動画5本/月',
                  '200MBまでアップロード',
                  '基本フィード閲覧',
                  'コイン投げ銭を受け取れる',
                  'デスクトップアプリ（手動クリップのみ）',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-gray-400">
                    <CheckCircle2 size={16} className="text-gray-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors px-6 py-3 text-sm font-medium"
              >
                無料で始める
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-blue-500/50 bg-blue-500/5 p-8 relative">
              <div className="absolute -top-3 right-6 bg-blue-600 text-xs font-bold px-3 py-1 rounded-full">
                おすすめ
              </div>
              <div className="flex items-center gap-2 mb-6">
                <Crown size={20} className="text-blue-400" />
                <h3 className="text-xl font-bold">Pro</h3>
              </div>
              <div className="mb-6"><p className="text-3xl font-black">¥980<span className="text-sm font-normal text-gray-500">/月</span></p><p className="text-xs font-bold text-blue-400 mt-1">7日間無料 → その後 ¥980/月</p></div>
              <ul className="space-y-3 text-sm">
                {[
                  { text: '動画投稿無制限', highlight: true },
                  { text: '500MBまでアップロード', highlight: true },
                  { text: 'Proバッジ表示', highlight: false },
                  { text: '予約投稿機能', highlight: true },
                  { text: '収益ダッシュボード', highlight: true },
                  { text: 'アナリティクス詳細', highlight: true },
                  { text: '月間50コインボーナス', highlight: true },
                  { text: 'デスクトップアプリ全機能', highlight: true },
                  { text: '自動キル検知 + 切り抜き', highlight: true },
                  { text: 'AI字幕自動生成', highlight: true },
                ].map((item) => (
                  <li key={item.text} className={`flex items-start gap-2 ${item.highlight ? 'text-white' : 'text-gray-400'}`}>
                    <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${item.highlight ? 'text-blue-400' : 'text-gray-600'}`} />
                    {item.text}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?intent=pro"
                className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-3 text-sm font-bold shadow-lg shadow-blue-600/20"
              >
                <Sparkles size={16} />
                7日間無料でProを試す
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-3xl font-black mb-14 text-gray-100">
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
                <span className="text-blue-500 font-black text-4xl">{s.step}</span>
                <h3 className="font-bold text-white text-center sm:text-left">{s.title}</h3>
                <p className="text-sm text-gray-400 text-center sm:text-left">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="relative flex flex-col items-center text-center px-6 py-28">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[400px] rounded-full bg-blue-700/15 blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg mx-auto">
          <div className="flex items-center gap-2 text-sm text-green-400 font-medium">
            <CheckCircle2 size={15} />
            無料・クレカ不要・30秒で完了
          </div>
          <h2 className="text-4xl sm:text-5xl font-black leading-tight">
            今すぐVLYPで<br />
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">収益化を始めよう</span>
          </h2>
          <p className="text-gray-400">
            キルした瞬間を共有して、ファンを増やそう。
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all px-10 py-4 text-sm font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:scale-[1.02]"
          >
            <Gamepad2 size={18} />
            無料で始める
          </Link>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-black text-blue-500 text-lg">VLYP</p>
            <p className="text-xs text-gray-600 mt-1">© 2026 VLYP Inc. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <Link href="/terms" className="hover:text-gray-400 transition-colors">利用規約</Link>
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">プライバシーポリシー</Link>
            <Link href="/legal" className="hover:text-gray-400 transition-colors">特定商取引法</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
