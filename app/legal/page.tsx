"use client";
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Legal() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-24 font-sans">
      <button onClick={() => router.push('/')} className="mb-12 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-xs font-black tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-black italic text-cyan-400 tracking-tighter uppercase mb-12">特定商取引法に基づく表記</h1>
        
        <div className="space-y-8 text-zinc-400 leading-relaxed border-t border-zinc-800 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">販売業者</span>
            <span>VLYP 運営事務局</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">代表者</span>
            <span>（あなたの氏名を記入してください）</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">所在地</span>
            <span>（あなたの住所を記入してください）</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">お問い合わせ先</span>
            <span>koro0522isa@gmail.com</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">販売価格</span>
            <span>商品（コイン）の購入ページに表示される価格</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">商品代金以外の必要料金</span>
            <span>なし（インターネット接続費用はユーザー負担）</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">お支払い方法</span>
            <span>クレジットカード決済（Stripe）</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-4">
            <span className="font-bold text-white uppercase text-xs tracking-widest">返品・キャンセル</span>
            <span>商品の性質上、購入後の返金・返品はできません。</span>
          </div>
        </div>
      </div>
    </div>
  );
}
