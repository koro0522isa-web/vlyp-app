"use client";
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';

export default function Legal() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const labels = {
    JP: { seller: "販売業者", rep: "代表者", address: "所在地", contact: "お問い合わせ先", price: "販売価格", method: "お支払い方法", refund: "返品・キャンセル" },
    EN: { seller: "Seller", rep: "Representative", address: "Address", contact: "Contact", price: "Price", method: "Payment Method", refund: "Returns/Refunds" },
    KR: { seller: "판매업자", rep: "대표자", address: "소재지", contact: "문의처", price: "판매 가격", method: "결제 방법", refund: "반품/취소" },
    CN: { seller: "销售商", rep: "负责人", address: "所在地", contact: "联系方式", price: "销售价格", method: "支付方式", refund: "退款/取消" }
  };

  const l = labels[lang] || labels.EN;

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-24 font-sans">
      <button onClick={() => router.push('/')} className="mb-12 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-xs font-black tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-black italic text-cyan-400 tracking-tighter uppercase mb-12">{t('legal.notice')}</h1>
        
        <div className="space-y-8 text-zinc-400 leading-relaxed border-t border-zinc-800 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">{l.seller}</span>
            <span>VLYP 運営事務局</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">{l.rep}</span>
            <span>（あなたの氏名を記入してください）</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">{l.address}</span>
            <span>（あなたの住所を記入してください）</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">{l.contact}</span>
            <span>koro0522isa@gmail.com</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">{l.price}</span>
            <span>{lang === 'JP' ? '商品ページに表示される価格' : (lang === 'CN' ? '见商品页面' : 'As displayed on product page')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">{l.method}</span>
            <span>Credit Card (Stripe)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">{l.refund}</span>
            <span>{lang === 'JP' ? '購入後の返金はできません。' : (lang === 'CN' ? '购买后不可退款' : 'No refunds after purchase.')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
