"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getVariant, track } from '@/lib/ab';
import {
  Gamepad2, Coins, Crown, Play, CheckCircle2, Zap, Monitor, Scissors, Type,
  Upload, ArrowRight, Shield, Sparkles, Target, Video, Wand2, Globe
} from 'lucide-react';

type HeroVariant = 'A' | 'B';

const HERO_CTA_VARIANTS: Record<HeroVariant, { label: string; sub: string }> = {
  A: { label: 'Start free in 30 seconds', sub: 'Free forever · No credit card · 30 seconds' },
  B: { label: 'Create your account →', sub: 'No credit card · First 7 days of Pro are on us' },
};

export default function LandingPageEn() {
  const [heroVariant, setHeroVariant] = useState<HeroVariant>('A');

  useEffect(() => {
    const v = getVariant<HeroVariant>('lp_hero_cta_en', ['A', 'B']);
    setHeroVariant(v);
    track('lp_hero_view', { variant: v, locale: 'en' });
  }, []);

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-[#09090B] text-white">

      {/* ===== Nav ===== */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl bg-[#09090B]/80">
        <span className="text-xl font-black tracking-tight text-blue-500">VLYP</span>
        <div className="flex items-center gap-4">
          <Link href="/landing" className="text-xs text-gray-500 hover:text-white transition-colors">
            日本語
          </Link>
          <span className="text-xs text-gray-700">·</span>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            Log in
          </Link>
          <Link
            href="/login"
            className="text-sm font-bold bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors"
          >
            Sign up free
          </Link>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section className="relative flex flex-col items-center text-center px-6 pt-24 pb-20">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/15 blur-[150px]" />
        <div className="pointer-events-none absolute top-20 right-1/4 w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-400 animate-pulse">
            <Play size={11} className="fill-blue-400" />
            Video platform built for gamers
          </span>

          <h1 className="text-5xl sm:text-7xl font-black leading-[1.1] tracking-tight">
            Every kill,<br />
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              automatically clipped.
            </span>
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-xl leading-relaxed">
            VLYP records your gameplay in the background. Detects kills. Auto-clips,
            converts to vertical, and adds <span className="text-white font-semibold">AI captions in 20+ languages</span>.
            Post and earn — in one click.
          </p>
          <p className="text-gray-500 text-sm">Built by gamers, for gamers — globally.</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Link
              href="/login"
              onClick={() => track('lp_hero_cta_click', { variant: heroVariant, locale: 'en' })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all px-8 py-4 text-sm font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:scale-[1.02]"
            >
              <Gamepad2 size={18} />
              {HERO_CTA_VARIANTS[heroVariant].label}
            </Link>
            <a
              href="https://github.com/koro0522isa-web/vlyp-app/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all px-8 py-4 text-sm font-bold text-cyan-300"
            >
              <Monitor size={18} />
              Download for Windows
            </a>
          </div>

          <div className="flex items-center gap-6 mt-6 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" />
              Free forever
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" />
              No credit card
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" />
              Windows desktop app live
            </div>
          </div>
        </div>
      </section>

      {/* ===== Auto Pipeline ===== */}
      <section id="desktop-app" className="px-6 py-20 border-y border-white/5 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400 mb-4">
              <Zap size={11} /> Auto-clipping for gamers
            </span>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight">
              Kill → Clip → Post.<br />
              <span className="text-blue-500">All automatic.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { icon: <Target size={24} className="text-red-400" />, step: '01', title: 'Kill detection', desc: 'Real-time detection for Valorant, LoL, and Apex.', color: 'border-red-500/20 bg-red-500/5' },
              { icon: <Scissors size={24} className="text-orange-400" />, step: '02', title: 'Auto-clip', desc: 'Saves the 25 seconds around every kill — automatically.', color: 'border-orange-500/20 bg-orange-500/5' },
              { icon: <Video size={24} className="text-blue-400" />, step: '03', title: 'Vertical + captions', desc: '9:16 conversion and AI captions added automatically.', color: 'border-blue-500/20 bg-blue-500/5' },
              { icon: <Upload size={24} className="text-green-400" />, step: '04', title: 'One-click post', desc: 'Publish to VLYP and start earning the same minute.', color: 'border-green-500/20 bg-green-500/5' },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                <div className={`rounded-xl border ${s.color} p-5 h-full flex flex-col gap-3 hover:scale-[1.02] transition-transform`}>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">{s.icon}</div>
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

          <div className="flex items-center justify-center gap-6 mt-10 text-sm text-gray-500 flex-wrap">
            <span>Supported:</span>
            <span className="text-red-400 font-semibold">Valorant</span>
            <span className="text-blue-400 font-semibold">League of Legends</span>
            <span className="text-orange-400 font-semibold">Apex Legends</span>
            <span className="text-gray-600">+ more coming</span>
          </div>
        </div>
      </section>

      {/* ===== Why VLYP ===== */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-center text-3xl font-black mb-12 text-gray-100">Why VLYP</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: <Globe size={22} className="text-blue-400" />, title: 'Multilingual by default', desc: 'AI captions in 20+ languages — English, Japanese, Korean, Spanish, Portuguese, and more. Built global from day one.' },
            { icon: <Monitor size={22} className="text-cyan-400" />, title: 'Always-on recording', desc: 'A 2-minute rolling buffer in the background. You never miss the clip — even if you forgot to hit record.' },
            { icon: <Sparkles size={22} className="text-pink-400" />, title: 'Audio-peak highlights', desc: '500ms RMS analysis picks the moments you screamed. Auto-generates short, punchy clips.' },
            { icon: <Type size={22} className="text-orange-400" />, title: 'Vertical + burned-in captions', desc: '9:16 export ready for Shorts, TikTok, and Reels. Captions baked into the video, no extra app needed.' },
            { icon: <Shield size={22} className="text-green-400" />, title: 'Privacy-first by design', desc: 'Your video stays on your machine. Only the audio is sent for caption generation — never the footage.' },
            { icon: <Coins size={22} className="text-yellow-400" />, title: 'Direct tipping', desc: 'Fans send Coins straight to creators. No middlemen, no algorithm gatekeeping.' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-white/8 bg-white/[0.02] p-6 flex flex-col gap-3 hover:border-blue-500/30 hover:bg-white/[0.04] transition-all group">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">{f.icon}</div>
              <h3 className="font-bold text-white">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section className="px-6 py-20 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent border-y border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-100">Free vs Pro</h2>
            <p className="text-gray-500 mt-2">Upgrade to Pro and unlock everything.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
              <div className="flex items-center gap-2 mb-6">
                <Gamepad2 size={20} className="text-gray-400" />
                <h3 className="text-xl font-bold">Free</h3>
              </div>
              <p className="text-3xl font-black mb-6">$0<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <ul className="space-y-3 text-sm">
                {['5 videos / month', 'Up to 200MB per upload', 'Browse the feed', 'Receive coin tips', 'Desktop app (manual clipping only)'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-gray-400">
                    <CheckCircle2 size={16} className="text-gray-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors px-6 py-3 text-sm font-medium">
                Start free
              </Link>
            </div>

            <div className="rounded-2xl border-2 border-blue-500/50 bg-blue-500/5 p-8 relative">
              <div className="absolute -top-3 right-6 bg-blue-600 text-xs font-bold px-3 py-1 rounded-full">Recommended</div>
              <div className="flex items-center gap-2 mb-6">
                <Crown size={20} className="text-blue-400" />
                <h3 className="text-xl font-bold">Pro</h3>
              </div>
              <div className="mb-6">
                <p className="text-3xl font-black">~$7<span className="text-sm font-normal text-gray-500">/mo</span></p>
                <p className="text-xs font-bold text-blue-400 mt-1">7 days free · then ¥980/mo (~$7)</p>
              </div>
              <ul className="space-y-3 text-sm">
                {[
                  { text: 'Unlimited video uploads', highlight: true },
                  { text: 'Up to 500MB per upload', highlight: true },
                  { text: 'Pro badge', highlight: false },
                  { text: 'Scheduled posting', highlight: true },
                  { text: 'Revenue dashboard', highlight: true },
                  { text: 'Advanced analytics', highlight: true },
                  { text: '50 Coins / month bonus', highlight: true },
                  { text: 'All desktop app features', highlight: true },
                  { text: 'Auto kill detection + clipping', highlight: true },
                  { text: 'AI captions, 20+ languages', highlight: true },
                ].map((item) => (
                  <li key={item.text} className={`flex items-start gap-2 ${item.highlight ? 'text-white' : 'text-gray-400'}`}>
                    <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${item.highlight ? 'text-blue-400' : 'text-gray-600'}`} />
                    {item.text}
                  </li>
                ))}
              </ul>
              <Link href="/login?intent=pro" className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors px-6 py-3 text-sm font-bold shadow-lg shadow-blue-600/20">
                <Sparkles size={16} />
                Try Pro free for 7 days
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-3xl font-black mb-14 text-gray-100">Get started in 3 steps</h2>
          <div className="flex flex-col sm:flex-row items-start gap-8 sm:gap-0">
            {[
              { step: '01', title: 'Sign up free (30s)', desc: 'Just an email. No credit card, no hoops.' },
              { step: '02', title: 'Install the desktop app', desc: 'Windows-ready today. Mac and mobile coming next.' },
              { step: '03', title: 'Play. We do the rest.', desc: 'Every kill becomes a clip. Captions, vertical, posted.' },
            ].map((s, i) => (
              <div key={s.step} className="flex-1 flex flex-col items-center sm:items-start gap-3 relative sm:px-6">
                {i < 2 && <div className="hidden sm:block absolute right-0 top-5 w-px h-8 bg-white/10" />}
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
            Free · No credit card · 30 seconds
          </div>
          <h2 className="text-4xl sm:text-5xl font-black leading-tight">
            Start earning on<br />
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">VLYP today.</span>
          </h2>
          <p className="text-gray-400">Share your best moments. Grow your fans.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all px-10 py-4 text-sm font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:scale-[1.02]"
          >
            <Gamepad2 size={18} />
            Start free
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
            <Link href="/landing" className="hover:text-gray-400 transition-colors">日本語</Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
