"use client";
import { ArrowLeft, ShieldAlert } from 'lucide-react';
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
        { h: "代表者 / 所在地", p: "消費者庁の定める特定商取引法に基づき、請求があった場合には遅滞なく開示いたします。開示を希望される方は上記メールアドレスまでご連絡ください。" },
        { h: "お問い合わせ先", p: "vlypgameclip@gmail.com" },
        { h: "販売価格", p: "購入手続きの際に画面に表示されます。消費税が含まれた金額です。" },
        { h: "代金の支払時期", p: "決済時に直ちにお支払いいただきます。" },
        { h: "商品の引渡時期", p: "決済完了後、直ちにアカウントにコインが付与されます。" },
        { h: "返品・キャンセルについて", p: "デジタルコンテンツの性質上、返品・返金には応じられません。" }
      ]
    },
    EN: {
      title: "Legal Notice",
      sections: [
        { h: "Operator", p: "VLYP Admin Office" },
        { h: "Name / Address", p: "In accordance with the Act on Specified Commercial Transactions, information will be provided without delay upon request. Please contact the email address above." },
        { h: "Contact", p: "vlypgameclip@gmail.com" },
        { h: "Price", p: "Displayed during checkout, including tax." },
        { h: "Payment Timing", p: "Immediate at the time of checkout." },
        { h: "Delivery", p: "Coins are credited immediately after payment." },
        { h: "Refunds", p: "Non-refundable due to the nature of digital content." }
      ]
    }
  };

  const current = content[lang] || content.EN;

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-24 font-sans">
      <button onClick={() => router.push('/')} className="mb-12 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-xs font-black tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <ShieldAlert className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl font-black italic text-white tracking-tighter uppercase">{current.title}</h1>
        </div>
        
        <div className="space-y-10 bg-zinc-900/50 border border-white/5 p-10 rounded-[2.5rem] glass-morphism">
          {current.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-xs font-black text-cyan-400 mb-2 uppercase tracking-widest">{s.h}</h2>
              <p className="text-lg font-bold text-zinc-200">{s.p}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
