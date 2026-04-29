"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Scale, Globe } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans p-6 md:p-12 lg:p-24 selection:bg-blue-500 selection:text-white">
      <div className="max-w-4xl mx-auto">
        <header className="mb-16">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to VLYP
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <Scale className="w-10 h-10 text-blue-500" />
            <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">Terms of Service</h1>
          </div>
          <p className="text-zinc-500 text-xs font-bold tracking-[0.3em] uppercase">Last Updated: April 30, 2026</p>
        </header>

        <nav className="flex gap-4 mb-12 border-b border-white/10 pb-4">
          <button className="text-blue-400 font-black text-xs uppercase tracking-widest border-b-2 border-blue-400 pb-4 -mb-[18px]">Japanese / English</button>
        </nav>

        <div className="space-y-16 leading-relaxed">
          {/* JP Section */}
          <section className="space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <span className="w-8 h-[1px] bg-blue-500"></span> 利用規約
            </h2>
            <div className="space-y-4 text-sm font-medium">
              <p>この利用規約（以下，「本規約」といいます。）は，VLYP（以下，「当サービス」といいます。）が提供するサービス（以下，「本サービス」といいます。）の利用条件を定めるものです。ユーザーの皆さまには，本規約に従って本サービスをご利用いただきます。</p>
              
              <h3 className="text-white font-bold mt-8">第1条（適用）</h3>
              <p>本規約は，ユーザーと当サービスとの間の本サービスの利用に関わる一切の関係に適用されるものとします。</p>

              <h3 className="text-white font-bold mt-8">第2条（禁止事項）</h3>
              <p>ユーザーは，本サービスの利用にあたり，以下の行為をしてはなりません。</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>本サービスの内容等，本サービスに含まれる著作権，商標権ほか知的財産権を侵害する行為</li>
                <li>当サービス，ほかのユーザー，またはその他第三者のサーバーまたはネットワークの機能を破壊したり，妨害したりする行為</li>
                <li>本サービスによって得られた情報を商業的に利用する行為</li>
                <li>当サービスのサービスの運営を妨害するおそれのある行為</li>
                <li>不正アクセスをし，またはこれを試みる行為</li>
              </ul>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* EN Section */}
          <section className="space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <span className="w-8 h-[1px] bg-blue-500"></span> Terms of Service (EN)
            </h2>
            <div className="space-y-4 text-sm font-medium">
              <p>These Terms of Service (the "Terms") set forth the terms and conditions for use of the services provided by VLYP (the "Service"). Users shall use the Service in accordance with these Terms.</p>
              
              <h3 className="text-white font-bold mt-8">Article 1 (Prohibited Actions)</h3>
              <p>Users shall not engage in any of the following actions when using the Service:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Actions that violate laws or public order and morals.</li>
                <li>Actions related to criminal acts.</li>
                <li>Actions that infringe upon copyrights, trademarks, or other intellectual property rights contained in the Service.</li>
                <li>Actions that destroy or interfere with the functions of the servers or networks of the Service.</li>
                <li>Commercial use of information obtained through the Service without authorization.</li>
                <li>Actions that may interfere with the operation of the Service.</li>
              </ul>

              <h3 className="text-white font-bold mt-8">Article 2 (Monetization & Payouts)</h3>
              <p>The Service allows users to receive virtual coins ("Gifts") from other users. Earned amounts are subject to platform fees (30%) and withdrawal is available starting from 1,000 Coins. The Service reserves the right to withhold payouts in case of fraudulent activity.</p>
            </div>
          </section>
        </div>

        <footer className="mt-24 pt-12 border-t border-white/5 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">© 2026 VLYP Gaming Platform. All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  );
}
