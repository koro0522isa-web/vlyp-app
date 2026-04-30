"use client";
import { useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';

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
      <button onClick={() => router.push('/')} className="mb-12 text-zinc-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest">
        ← Back to Home
      </button>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black italic text-cyan-400 tracking-tighter uppercase mb-12">{current.title}</h1>
        
        <div className="space-y-8">
          {current.sections.map((s, i) => (
            <div key={i} className="border-b border-zinc-800 pb-6">
              <h2 className="text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-[0.3em]">{s.h}</h2>
              <p className="text-lg font-bold text-zinc-200">{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
