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
        { h: "2. 利用目的", p: "収集した情報は、サービスの提供、本人確認、不具合対応にのみ利用します。" }
      ]
    },
    EN: {
      title: "Privacy Policy",
      sections: [
        { h: "1. Information Collection", p: "We collect email addresses during account creation and payment info via Stripe." },
        { h: "2. Purpose of Use", p: "Collected info is used for service provision, identity verification, and support." }
      ]
    },
    KR: {
      title: "개인정보처리방침",
      sections: [
        { h: "1. 수집하는 정보", p: "본 서비스는 계정 생성 시 이메일 주소 및 결제 시 Stripe를 통한 결제 정보를 수집합니다." },
        { h: "2. 이용 목적", p: "수집한 정보는 서비스 제공, 본인 확인, 오류 대응에만 이용합니다." }
      ]
    },
    CN: {
      title: "隐私政策",
      sections: [
        { h: "1. 信息收集", p: "我们在创建账号时收集电子邮箱地址，并通过 Stripe 收集支付信息。" },
        { h: "2. 使用目的", p: "收集的信息仅用于提供服务、身份验证和客户支持。" }
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
