"use client";
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Privacy() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-24 font-sans">
      <button onClick={() => router.push('/')} className="mb-12 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-xs font-black tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-black italic text-cyan-400 tracking-tighter uppercase mb-12">Privacy Policy</h1>
        
        <div className="space-y-12 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">1. 収集する情報</h2>
            <p>当サービスでは、アカウント作成時のメールアドレス、および決済時のStripeを通じた決済情報を収集します。パスワードやクレジットカード番号は直接保持しません。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">2. 利用目的</h2>
            <p>収集した情報は、サービスの提供、本人確認、不具合対応、および重要なお知らせの送付にのみ利用します。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">3. 第三者提供</h2>
            <p>法令に基づく場合を除き、ユーザーの同意なく第三者に個人情報を提供することはありません。決済処理については、信頼できる決済プロバイダー（Stripe）に委託します。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
