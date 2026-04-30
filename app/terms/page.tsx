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
        { h: "3. 禁止事項", p: "公序良俗に反する動画の投稿、他者の権利を侵害する無断転載、不正なアクセス、およびマネーロンダリング目的の利用を固く禁じます。" },
        { h: "4. 著作権とコンテンツ保護", p: "VLYPはAIによる自動著作権スキャンを導入しています。投稿された動画内に無断の音楽使用が検知された場合、システムは自動的に当該動画を非公開にする権利を有します。安全な投稿のために、VLYPが提供するBGMライブラリの利用を推奨します。" }
      ]
    },
    EN: {
      title: "Terms of Service",
      sections: [
        { h: "1. Service Overview", p: "VLYP is a platform for posting, viewing, and tipping game clips. Users can purchase digital coins to support creators." },
        { h: "2. Coin Purchase", p: "Purchased coins are non-refundable. Coins can only be used for sending gifts within the site." },
        { h: "3. Prohibited Actions", p: "Posting illegal content, unauthorized reproduction, and fraudulent access are strictly prohibited." },
        { h: "4. Copyright & Content Protection", p: "VLYP uses AI-powered copyright scanning. If unauthorized music usage is detected in a video, the system reserves the right to automatically set the video to private. We recommend using the VLYP Royalty-Free BGM library for safe posting." }
      ]
    },
    KR: {
      title: "이용약관",
      sections: [
        { h: "1. 서비스 개요", p: "VLYP는 게임 플레이 비디오 게시, 시청 및 팁 기능을 제공하는 플랫폼입니다. 사용자는 디지털 코인을 구매하여 크리에이터를 후원할 수 있습니다." },
        { h: "2. 코인 구매 및 이용", p: "구매한 코인은 환불이 불가능합니다. 코인은 사이트 내 기프트 전송용으로만 사용할 수 있습니다." },
        { h: "3. 금지 사항", p: "공서양속에 반하는 동영상 게시, 타인의 권리를 침해하는 무단 전재, 부정 액세스 등을 엄격히 금지합니다." },
        { h: "4. 저작권 및 콘텐츠 보호", p: "VLYP는 AI 자동 저작권 스캔을 도입했습니다. 게시된 영상 내에 무단 음악 사용이 감지되면 시스템은 해당 영상을 자동으로 비공개 처리할 권리가 있습니다. 안전한 게시를 위해 VLYP가 제공하는 BGM 라이브러리 이용을 권장합니다." }
      ]
    },
    CN: {
      title: "服务条款",
      sections: [
        { h: "1. 服务概览", p: "VLYP 是一个用于发布、观看和打赏游戏视频的平台。用户可以购买数字代币来支持创作者。" },
        { h: "2. 代币购买", p: "购买的代币不可退款。代币仅限在网站内赠送礼物使用。" },
        { h: "3. 禁止行为", p: "严禁发布非法内容、未经授权的复制以及欺诈性访问。" },
        { h: "4. 著作权与内容保护", p: "VLYP 引入了 AI 自动著作权扫描。如果检测到视频中未经授权使用音乐，系统有权自动将该视频设为隐私。为了安全发布，建议使用 VLYP 提供的免版权 BGM 库。" }
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
