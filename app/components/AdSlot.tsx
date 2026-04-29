"use client";

import React from 'react';
import { ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';

interface AdSlotProps {
  type?: 'banner' | 'video' | 'sponsored';
}

export default function AdSlot({ type = 'banner' }: AdSlotProps) {
  // ここにGoogle AdSenseのパブリッシャーIDを入れれば本物の広告が出ます
  // 現在は「自社広告（スポンサー募集）」のデザインを表示します
  
  return (
    <div className="video-section h-screen w-full snap-start flex items-center justify-center p-2 lg:p-6 pb-28 lg:pb-6 relative">
      <div className="relative h-full aspect-[9/16] bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-[3rem] overflow-hidden border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.1)] flex flex-col items-center justify-center p-10 text-center">
        
        {/* Background Decoration */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-blue-500"></div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Sponsored</span>
          </div>

          <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-tight">
            Grow your Gaming<br/><span className="text-blue-500">Brand on VLYP</span>
          </h2>

          <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-[250px] mx-auto">
            Advertise to millions of gamers worldwide with VLYP Ads Engine.
          </p>

          <div className="pt-8">
            <button className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-400 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95">
              Learn More <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-10 flex flex-col items-center gap-2 opacity-30">
            <ShieldCheck className="w-5 h-5 text-zinc-500" />
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Secure Advertising Platform</p>
          </div>
        </div>

        {/* AdSense Placeholder (Hidden by default, uncomment to use AdSense) */}
        {/* 
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
             data-ad-slot="XXXXXXXXXX"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        */}
      </div>
    </div>
  );
}
