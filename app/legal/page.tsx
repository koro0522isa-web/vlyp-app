"use client";

import Link from 'next/link';

/**
 * VLYP Legal Page — 特定商取引法に基づく表記
 * Stripe承認に必要な全情報を網羅。日英バイリンガル対応。
 */
export default function Legal() {
  const sections = [
    {
      label: "事業者名 / Business Name",
      value: "VLYP 運営事務局（村田 偉咲）",
      sub: "VLYP Operations Office (Isaki Murata)"
    },
    {
      label: "代表者 / Representative",
      value: "村田 偉咲 (Isaki Murata)"
    },
    {
      label: "所在地 / Address",
      value: "特定商取引法第11条ただし書の規定に基づき省略しております。",
      sub: "Omitted pursuant to the proviso of Article 11 of the Act on Specified Commercial Transactions. Disclosed upon request."
    },
    {
      label: "電話番号 / Phone",
      value: "請求をいただいた場合、遅滞なく電磁的記録にて開示いたします。",
      sub: "Disclosed via electronic record upon request."
    },
    {
      label: "メールアドレス / Email",
      value: "vlypgameclip@gmail.com"
    },
    {
      label: "サービス内容 / Service Description",
      value: "ゲームクリップの投稿・視聴・共有プラットフォーム「VLYP」の運営",
      sub: "Operation of \"VLYP\", a platform for posting, viewing, and sharing gaming video clips."
    },
    {
      label: "販売商品 / Products",
      value: [
        "① VLYP Pro プラン（月額 $9.99 USD）— 無制限アップロード、AI音声合成、BGMミキシング機能",
        "② VLYP コイン（100枚 ¥150〜）— クリエイターへの投げ銭に使用"
      ]
    },
    {
      label: "決済方法 / Payment Methods",
      value: "クレジットカード（Visa, Mastercard, American Express, JCB 等）",
      sub: "Processed securely via Stripe, Inc."
    },
    {
      label: "決済期間 / Payment Processing",
      value: "クレジットカード決済はただちに処理されます。",
      sub: "Credit card payments are processed immediately."
    },
    {
      label: "商品の引渡時期 / Delivery",
      value: "決済完了後、即座にアカウントに適用されます。",
      sub: "Applied to your account immediately upon payment completion."
    },
    {
      label: "サブスクリプション / Subscription",
      value: "Proプランは月額自動更新です。解約はいつでもアカウント設定から行えます。解約後も当月末まで利用可能です。",
      sub: "Pro plan auto-renews monthly. Cancel anytime from account settings. Access continues until end of billing period."
    },
    {
      label: "返品・キャンセル / Refund Policy",
      value: "デジタルコンテンツの性質上、決済完了後の返品・返金はお受けできません。サブスクリプションは次回更新前に解約が可能です。",
      sub: "Due to the nature of digital content, refunds are not available after payment. Subscriptions can be cancelled before the next renewal."
    },
    {
      label: "動作環境 / System Requirements",
      value: "Google Chrome, Safari, Firefox, Microsoft Edge の最新版。安定したインターネット接続。",
      sub: "Latest versions of major browsers with a stable internet connection."
    }
  ];

  return (
    <div className="h-screen overflow-y-auto bg-[#09090B] text-zinc-100 font-sans">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-12">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-10"
        >
          ← Back to VLYP
        </Link>
        
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
            特定商取引法に基づく表記
          </h1>
          <p className="text-zinc-500 text-sm font-medium">
            Act on Specified Commercial Transactions — Legal Notice
          </p>
        </div>

        {/* Content */}
        <div className="space-y-0 border border-zinc-800 rounded-2xl overflow-hidden">
          {sections.map((section, i) => (
            <div
              key={i}
              className={`p-6 md:p-8 ${i !== sections.length - 1 ? 'border-b border-zinc-800' : ''} hover:bg-white/[0.02] transition-colors`}
            >
              <h2 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.15em] mb-3">
                {section.label}
              </h2>
              {Array.isArray(section.value) ? (
                <ul className="space-y-2">
                  {section.value.map((item, j) => (
                    <li key={j} className="text-white font-semibold text-sm leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white font-semibold text-sm leading-relaxed">
                  {section.value}
                </p>
              )}
              {section.sub && (
                <p className="text-zinc-500 text-xs mt-2 leading-relaxed italic">
                  {section.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <p className="text-[11px] text-zinc-500 leading-loose">
            ※当方は個人事業主であり、特定商取引法第11条ただし書の規定に基づき、住所および電話番号の表記を省略しております。
            ご請求をいただいた場合、遅滞なく電磁的記録にて開示いたします。
          </p>
          <p className="text-[11px] text-zinc-600 leading-loose mt-3">
            As an individual business operator, the address and phone number are omitted pursuant to the proviso of Article 11 
            of the Act on Specified Commercial Transactions. They will be disclosed promptly via electronic record upon request.
          </p>
        </div>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/terms" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4">
            利用規約 / Terms of Service
          </Link>
          <Link href="/privacy" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4">
            プライバシーポリシー / Privacy Policy
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-zinc-800 text-center">
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} VLYP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
