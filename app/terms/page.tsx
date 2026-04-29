"use client";
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Terms() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-24 font-sans">
      <button onClick={() => router.push('/')} className="mb-12 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-xs font-black tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-black italic text-cyan-400 tracking-tighter uppercase mb-12">Terms of Service</h1>
        
        <div className="space-y-12 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">1. サービスの概要</h2>
            <p>VLYPはゲームプレイ動画の投稿、閲覧、および投げ銭機能を提供するプラットフォームです。ユーザーはデジタルコインを購入し、クリエイターを支援することができます。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">2. コインの購入と利用</h2>
            <p>購入されたコインは返金できません。コインはサイト内でのギフト送信にのみ使用可能であり、現金への直接的な換金はクリエイターの収益受取フローを通じてのみ行われます。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">3. 禁止事項</h2>
            <p>公序良俗に反する動画の投稿、他者の権利を侵害する無断転載、不正なアクセス、およびマネーロンダリング目的の利用を固く禁じます。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">4. 収益の支払い</h2>
            <p>クリエイターは、運営者の定める基準に基づき収益の出金を申請できます。不正が疑われる場合、支払いを保留または拒否することがあります。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
