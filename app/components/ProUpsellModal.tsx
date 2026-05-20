"use client";

import { useState } from 'react';
import { Crown, Sparkles, X, Check, Zap, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type UpsellReason =
  | 'file_size'        // 200MB → 500MB
  | 'monthly_limit'    // 月5本制限
  | 'edit_free_used'   // /edit 1回お試し済み
  | 'watermark'        // 透かしを外すには Pro
  | 'subtitles'        // AI字幕は Pro
  | 'bgm'              // BGMは Pro
  | 'analytics'        // analyticsは Pro
  | 'generic';

interface Props {
  open: boolean;
  onClose: () => void;
  reason: UpsellReason;
  trigger?: string; // 追加コンテキスト(ファイルサイズなど)を文字列で
}

const REASON_CONFIG: Record<UpsellReason, { title: string; subtitle: string; icon: typeof Crown }> = {
  file_size: {
    title: 'もっと大きい動画を投稿しよう',
    subtitle: 'Pro なら 500MB まで OK (Free は 200MB)',
    icon: Lock,
  },
  monthly_limit: {
    title: '今月の投稿枠を使い切りました',
    subtitle: 'Pro は投稿数無制限。今月もう何本でも投稿できます',
    icon: Lock,
  },
  edit_free_used: {
    title: '無料体験は使用済みです',
    subtitle: 'AIエディタは Pro で無制限。さらに字幕・BGM・透かし削除も解放',
    icon: Sparkles,
  },
  watermark: {
    title: 'VLYP 透かしを消すには Pro',
    subtitle: 'Pro なら右下ロゴ無しで保存できます',
    icon: Crown,
  },
  subtitles: {
    title: 'AI字幕は Pro 限定機能',
    subtitle: 'OpenAI Whisper による日本語自動字幕焼き付け',
    icon: Sparkles,
  },
  bgm: {
    title: 'BGM ミックスは Pro 限定',
    subtitle: 'お気に入りの音声を動画に重ねて、TikTokっぽい仕上がりに',
    icon: Sparkles,
  },
  analytics: {
    title: 'アナリティクスは Pro 限定',
    subtitle: '視聴・いいね・フォロワー推移・収益を一目で',
    icon: Crown,
  },
  generic: {
    title: 'Pro でクリエイター全部入り',
    subtitle: '撮影・編集・字幕・BGM・投稿まで日本語UIで完結',
    icon: Crown,
  },
};

const PRO_BENEFITS = [
  '動画投稿無制限 (Freeは月5本)',
  '500MB アップロード (Freeは200MB)',
  'AI字幕 (Whisper) 自動生成',
  'BGM ミックス機能',
  '日本語タイトル焼き付け',
  'VLYP透かしを非表示',
  'クリエイターアナリティクス',
  '収益ダッシュボード',
  '月間 50コインボーナス',
  '7日間 無料トライアル',
];

export default function ProUpsellModal({ open, onClose, reason, trigger }: Props) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const cfg = REASON_CONFIG[reason];
  const Icon = cfg.icon;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        window.location.href = '/login?intent=pro';
        return;
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ packId: 'pro' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || '決済セッションの作成に失敗しました');
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden border border-purple-500/30 bg-gradient-to-b from-zinc-900 to-black shadow-[0_0_60px_rgba(168,85,247,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          aria-label="閉じる"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>

        <div className="relative z-10 p-8">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
              <Icon className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2 className="text-center text-2xl font-black text-white leading-tight">{cfg.title}</h2>
          <p className="text-center text-sm text-zinc-400 mt-2">{cfg.subtitle}</p>
          {trigger && (
            <p className="text-center text-[10px] text-zinc-600 mt-1 font-medium">{trigger}</p>
          )}

          <div className="mt-6 mb-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-400" />
                <span className="font-black text-white">VLYP Pro</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white leading-none">¥980<span className="text-xs text-zinc-500">/月</span></p>
                <p className="text-[9px] font-black text-blue-400 mt-1 uppercase tracking-widest">7日間無料</p>
              </div>
            </div>
            <ul className="space-y-2">
              {PRO_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-xs text-zinc-300">
                  <Check className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 rounded-2xl font-black text-sm text-white uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/30 disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? (
              <>処理中...</>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                7日間無料で Pro を始める
              </>
            )}
          </button>

          <p className="text-center text-[9px] text-zinc-600 mt-3 font-medium uppercase tracking-widest">
            いつでも解約可・トライアル中の課金なし
          </p>
        </div>
      </div>
    </div>
  );
}
