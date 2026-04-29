"use client";
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';

export default function Terms() {
  const router = useRouter();
  const { lang } = useLanguage();

  const content = {
    JP: {
      title: "利用規約",
      sections: [
        { h: "1. サービスの概要", p: "VLYPはゲームプレイ動画の投稿、閲覧、および投げ銭機能を提供するプラットフォームです。ユーザーはデジタルコインを購入し、クリエイターを支援することができます。" },
        { h: "2. コインの購入と利用", p: "購入されたコインは返金できません。コインはサイト内でのギフト送信にのみ使用可能であり、現金への直接的な換金はクリエイターの収益受取フローを通じてのみ行われます。" },
        { h: "3. 禁止事項", p: "公序良俗に反する動画の投稿、他者の権利を侵害する無断転載、不正なアクセス、およびマネーロンダリング目的の利用を固く禁じます。" }
      ]
    },
    EN: {
      title: "Terms of Service",
      sections: [
        { h: "1. Service Overview", p: "VLYP is a platform for posting, viewing, and tipping game clips. Users can purchase digital coins to support creators." },
        { h: "2. Coin Purchase", p: "Purchased coins are non-refundable. Coins can only be used for sending gifts within the site." },
        { h: "3. Prohibited Actions", p: "Posting illegal content, unauthorized reproduction, and fraudulent access are strictly prohibited." }
      ]
    },
    KR: {
      title: "이용약관",
      sections: [
        { h: "1. 서비스 개요", p: "VLYP는 게임 플레이 비디오 게시, 시청 및 팁 기능을 제공하는 플랫폼입니다. 사용자는 디지털 코인을 구매하여 크리에이터를 후원할 수 있습니다." },
        { h: "2. 코인 구매 및 이용", p: "구매한 코인은 환불이 불가능합니다. 코인은 사이트 내 기프트 전송용으로만 사용할 수 있습니다." },
        { h: "3. 금지 사항", p: "공서양속에 반하는 동영상 게시, 타인의 권리를 침해하는 무단 전재, 부정 액세스 등을 엄격히 금지합니다." }
      ]
    },
    CN: {
      title: "服务条款",
      sections: [
        { h: "1. 服务概览", p: "VLYP 是一个用于发布、观看和打赏游戏视频的平台。用户可以购买数字代币来支持创作者。" },
        { h: "2. 代币购买", p: "购买的代币不可退款。代币仅限在网站内赠送礼物使用。" },
        { h: "3. 禁止行为", p: "严禁发布非法内容、未经授权的复制以及欺诈性访问。" }
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
