'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Gamepad2, Video, Users, CheckCircle2, ArrowRight, X } from 'lucide-react';

interface Props {
  userId: string;
  vlypId: string;
}

const STEPS = [
  {
    icon: Gamepad2,
    color: '#a78bfa',
    title: 'VLYPへようこそ！',
    subtitle: '日本のゲーマーのためのクリッププラットフォーム',
    description: 'ゲームのベストシーンをショート動画で共有しよう。キル集・神プレイ・面白い瞬間、何でもOK。',
    cta: '次へ',
  },
  {
    icon: Video,
    color: '#34d399',
    title: '動画を投稿しよう',
    subtitle: 'まず最初のクリップを上げてみよう',
    description: '縦型動画に自動変換。最大200MBまで無料でアップロードできます。Proにすると500MBまで対応。',
    cta: '次へ',
  },
  {
    icon: Users,
    color: '#fb923c',
    title: 'フォローして盛り上がろう',
    subtitle: '好きなプレイヤーをフォロー',
    description: 'フォローするとそのプレイヤーの最新クリップが優先表示されます。コメント・投げ銭でリアクションしよう！',
    cta: 'はじめる',
  },
];

export default function OnboardingModal({ userId, vlypId }: Props) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const router = useRouter();

  const complete = async () => {
    setClosing(true);
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId);
    if (step === STEPS.length - 1) {
      router.push('/post');
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      complete();
    }
  };

  const skip = () => complete();

  if (closing) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-sm relative"
        >
          {/* スキップボタン */}
          <button
            onClick={skip}
            className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={18} />
          </button>

          {/* ステップインジケーター */}
          <div className="flex gap-1.5 mb-8">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: i <= step ? current.color : '#27272a' }}
              />
            ))}
          </div>

          {/* アイコン */}
          <motion.div
            key={step}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: `${current.color}20`, border: `1px solid ${current.color}40` }}
          >
            <Icon size={28} style={{ color: current.color }} />
          </motion.div>

          {/* テキスト */}
          <motion.div key={`text-${step}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-xs font-bold mb-1" style={{ color: current.color }}>
              {current.subtitle}
            </p>
            <h2 className="text-xl font-black mb-3">{current.title}</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              {current.description}
            </p>
          </motion.div>

          {/* CTAボタン */}
          <button
            onClick={next}
            className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: current.color, color: step === STEPS.length - 1 ? '#000' : '#000' }}
          >
            {step === STEPS.length - 1 ? (
              <>
                <CheckCircle2 size={16} />
                {current.cta}
              </>
            ) : (
              <>
                {current.cta}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
