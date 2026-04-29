"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Eye } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans p-6 md:p-12 lg:p-24 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-4xl mx-auto">
        <header className="mb-16">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to VLYP
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
            <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">Privacy Policy</h1>
          </div>
          <p className="text-zinc-500 text-xs font-bold tracking-[0.3em] uppercase">Last Updated: April 30, 2026</p>
        </header>

        <div className="space-y-16 leading-relaxed">
          <section className="space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <span className="w-8 h-[1px] bg-emerald-500"></span> プライバシーポリシー
            </h2>
            <div className="space-y-4 text-sm font-medium">
              <p>VLYP（以下，「当サービス」といいます。）は，本サービスにおけるユーザーの個人情報の取扱いについて，以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。</p>
              
              <h3 className="text-white font-bold mt-8">第1条（個人情報の収集方法）</h3>
              <p>当サービスは，ユーザーが利用登録をする際に氏名，生年月日，住所，電話番号，メールアドレス，銀行口座番号などの個人情報をお尋ねすることがあります。また，ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を, 当サービスの提携先（情報提供元，広告主，広告配信先などを含みます。）などから収集することがあります。</p>

              <h3 className="text-white font-bold mt-8">第2条（個人情報を収集・利用する目的）</h3>
              <p>当サービスが個人情報を収集・利用する目的は，以下のとおりです。</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>当サービスによるサービスの提供・運営のため</li>
                <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
                <li>ユーザーが利用中のサービスの新機能，更新情報，キャンペーン等及び当サービスが提供する他のサービスの案内のメールを送付するため</li>
                <li>メンテナンス，重要なお知らせなど必要に応じたご連絡のため</li>
                <li>利用規約に違反したユーザーや，不正・不当な目的でサービスを利用しようとするユーザーの特定をし，ご利用をお断りするため</li>
              </ul>
            </div>
          </section>

          <hr className="border-white/5" />

          <section className="space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <span className="w-8 h-[1px] bg-emerald-500"></span> Privacy Policy (EN)
            </h2>
            <div className="space-y-4 text-sm font-medium">
              <h3 className="text-white font-bold mt-8">Section 1 (Information Collection)</h3>
              <p>We collect information you provide directly to us when you create an account, such as your email address, display name, and payment information for withdrawals. We also use Stripe for payment processing, and their privacy policy applies to payment data.</p>

              <h3 className="text-white font-bold mt-8">Section 2 (Data Security)</h3>
              <p>We implement strict Row Level Security (RLS) on our database to ensure that your private information, such as withdrawal history and bank details, is only accessible to you and authorized administrators. We do not sell your personal data to third parties.</p>

              <h3 className="text-white font-bold mt-8">Section 3 (Cookies & Tracking)</h3>
              <p>We use PostHog for analytics to improve the Service. You can opt-out of tracking through your browser settings.</p>
            </div>
          </section>
        </div>

        <footer className="mt-24 pt-12 border-t border-white/5 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Secure & Private // Powered by VLYP Security Engine</p>
        </footer>
      </div>
    </div>
  );
}
