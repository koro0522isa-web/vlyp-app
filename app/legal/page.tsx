"use client";
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * VLYP 特定商取引法に基づく表記 (v2.0)
 * Stripe審査対応・プライバシー保護版
 */
export default function Legal() {
  const router = useRouter();
  const { lang } = useLanguage();

  const content = {
    JP: {
      title: "特定商取引法に基づく表記",
      sections: [
        { h: "販売業者", p: "VLYP 運営事務局" },
        { h: "代表者", p: "請求があったら遅滞なく開示します" },
        { h: "所在地", p: "請求があったら遅滞なく開示します" },
        { h: "お問い合わせ先", p: "vlypgameclip@gmail.com" },
        { h: "販売価格", p: "購入手続きの際に画面に表示される価格（税込）" },
        { h: "代金の支払時期", p: "チェックアウト時（即時）" },
        { h: "商品の引渡時期", p: "決済完了後、即座にアカウントへ付与" },
        { h: "返品・キャンセル", p: "デジタルコンテンツのため返品不可" }
      ]
    },
    EN: {
      title: "Legal Notice",
      sections: [
        { h: "Operator", p: "VLYP Admin Office" },
        { h: "Representative", p: "Provided upon request" },
        { h: "Address", p: "Provided upon request" },
        { h: "Contact", p: "vlypgameclip@gmail.com" },
        { h: "Price", p: "As displayed at checkout (tax included)" },
        { h: "Payment", p: "Immediate at checkout" },
        { h: "Delivery", p: "Immediate after payment" },
        { h: "Refunds", p: "Non-refundable" }
      ]
    }
  };

  const current = content[lang] || content.EN;

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-24 font-sans">
      <button onClick={() => router.push('/')} className="mb-12 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-xs font-black tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="max-w-3xl mx-auto animate-premium-in">
        <div className="flex items-center gap-4 mb-12">
          <ShieldAlert className="w-12 h-12 text-cyan-400 neon-glow" />
          <h1 className="text-5xl font-black italic text-white tracking-tighter uppercase">{current.title}</h1>
        </div>
        
        <div className="grid gap-6">
          {current.sections.map((s, i) => (
            <div key={i} className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 glass-morphism hover:border-cyan-400/30 transition-all duration-300">
              <h2 className="text-[10px] font-black text-cyan-400 mb-2 uppercase tracking-[0.3em]">{s.h}</h2>
              <p className="text-xl font-bold text-zinc-100">{s.p}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-3xl border border-dashed border-zinc-800 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">
          Copyright &copy; 2026 VLYP Project. All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
