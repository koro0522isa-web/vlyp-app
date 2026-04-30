"use client";
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';

export default function Privacy() {
  const router = useRouter();
  const { lang } = useLanguage();

  const content = {
    JP: {
      title: "プライバシーポリシー",
      sections: [
        { h: "1. 収集する情報", p: "当サービスでは、アカウント作成時のメールアドレス、および決済時のStripeを通じた決済情報を収集します。" },
        { h: "2. 利用目的", p: "収集した情報は、サービスの提供、本人確認、不具合対応にのみ利用します。" },
        { h: "3. 第三者提供", p: "法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。決済処理のため、Stripe社へ必要な情報を提供します。" },
        { h: "4. 安全管理", p: "収集した情報の漏洩、紛失の防止に努め、厳重なセキュリティ対策を講じます。" }
      ]
    },
    EN: {
      title: "Privacy Policy",
      sections: [
        { h: "1. Information Collection", p: "We collect email addresses during account creation and payment info via Stripe." },
        { h: "2. Purpose of Use", p: "Collected info is used for service provision, identity verification, and support." },
        { h: "3. Third-party Sharing", p: "We do not share personal information with third parties without consent, except as required by law. Information is shared with Stripe for payment processing." },
        { h: "4. Data Security", p: "We implement strict security measures to protect your information from unauthorized access or leakage." }
      ]
    },
    KR: {
      title: "개인정보처리방침",
      sections: [
        { h: "1. 수집하는 정보", p: "본 서비스는 계정 생성 시 이메일 주소 및 결제 시 Stripe를 통한 결제 정보를 수집합니다." },
        { h: "2. 이용 목적", p: "수집한 정보는 서비스 제공, 본인 확인, 오류 대응에만 이용합니다." },
        { h: "3. 제3자 제공", p: "법령에 근거한 경우를 제외하고 사용자 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 결제 처리를 위해 Stripe에 필요한 정보를 제공합니다." },
        { h: "4. 안전 관리", p: "수집한 정보의 누출, 분실 방지를 위해 엄격한 보안 조치를 취합니다." }
      ]
    },
    CN: {
      title: "隐私政策",
      sections: [
        { h: "1. 信息收集", p: "我们在创建账号时收集电子邮箱地址，并通过 Stripe 收集支付信息。" },
        { h: "2. 使用目的", p: "收集的信息仅用于提供服务、身份验证和客户支持。" },
        { h: "3. 第三方共享", p: "除非法律要求，否则未经用户同意我们不会向第三方提供个人信息。为了处理付款，我们会向 Stripe 提供必要的信息。" },
        { h: "4. 安全管理", p: "我们采取严格的安全措施，防止收集的信息泄露或丢失。" }
      ]
    }
  };

  const current = content[lang] || content.EN;

  return (
    <div className="h-screen overflow-y-auto bg-black text-white p-8 md:p-24 font-sans">
      <button onClick={() => router.push('/')} className="mb-12 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-xs font-black tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-black italic text-cyan-400 tracking-tighter uppercase mb-12">{current.title}</h1>
        
        <div className="space-y-12 text-zinc-400 leading-relaxed">
          {current.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">{s.h}</h2>
              <p>{s.p}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
