"use client";

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { Eye, Heart, Gamepad2, Play, TrendingUp, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const GAME_META: Record<string, { label: string; color: string; emoji: string; description: string }> = {
  valorant:   { label: 'Valorant',     color: '#ff4655', emoji: '🔫', description: 'Valorantのゲームクリップ・ハイライト集。神エイム・キルストリーク・チームプレイを投稿。' },
  apex:       { label: 'Apex Legends', color: '#da3700', emoji: '⚡', description: 'Apex Legendsのクリップ。チャンピオン瞬間・スクアッドワイプ・最高のムーブ。' },
  fortnite:   { label: 'Fortnite',     color: '#1fa1f1', emoji: '🏗️', description: 'フォートナイトのビルド・エリミネーション・面白シーンを共有。' },
  minecraft:  { label: 'Minecraft',    color: '#5d9e4d', emoji: '⛏️', description: 'マインクラフトの建築・サバイバル・モッドプレイを投稿。' },
  cod:        { label: 'Call of Duty', color: '#c5a028', emoji: '💣', description: 'CoD最高のキル・クラッチプレイ・マルチプレイヤーハイライト。' },
  overwatch:  { label: 'Overwatch 2',  color: '#f99e1a', emoji: '🦸', description: 'オーバーウォッチ2のウルト・スキル・チームファイトハイライト。' },
  lol:        { label: 'League of Legends', color: '#785a28', emoji: '⚔️', description: 'LoLのクラッチプレイ・ペンタキル・プロ級アウトプレイ集。' },
  genshin:    { label: 'Genshin Impact', color: '#4fc3f7', emoji: '✨', description: '原神の探索・戦闘・可愛いシーンを共有。' },
  pubg:       { label: 'PUBG',         color: '#fbbf24', emoji: '🪂', description: 'PUBG最高のウィナーウィナー・長距離スナイプ・クラッチ集。' },
  r6:         { label: 'Rainbow Six',  color: '#1c3a6e', emoji: '🛡️', description: 'レインボーシックスシージのオペレーター・アウトプレイ・ACE集。' },
};

export default function GameTagPage({ params: paramsPromise }: { params: Promise<{ game: string }> }) {
  const params = use(paramsPromise);
  const game = params.game.toLowerCase();
  const meta = GAME_META[game] || { label: params.game, color: '#3b82f6', emoji: '🎮', description: `${params.game}のゲームクリップ・ハイライト集。` };

  const [clips, setClips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalViews: 0, totalClips: 0 });

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('clips')
        .select('*, profiles:user_id(display_name, username, avatar_url, is_pro)')
        .ilike('game_tag', `%${params.game}%`)
        .neq('status', 'banned')
        .order('views', { ascending: false })
        .limit(60);

      if (data) {
        setClips(data);
        setStats({
          totalViews: data.reduce((s, c) => s + (c.views || 0), 0),
          totalClips: data.length,
        });
      }
      setIsLoading(false);
    };
    fetch();
  }, [params.game]);

  return (
    <div className="flex min-h-screen bg-[#09090B] text-zinc-100 font-sans">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">
        {/* Hero */}
        <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${meta.color}20 0%, #09090B 60%)` }}>
          <div className="max-w-7xl mx-auto px-6 py-16">
            <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 text-xs font-black uppercase tracking-widest mb-8 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <div className="flex items-center gap-6 mb-6">
              <span className="text-6xl">{meta.emoji}</span>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Gamepad2 className="w-5 h-5" style={{ color: meta.color }} />
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Game Tag</span>
                </div>
                <h1 className="text-5xl font-black italic tracking-tighter uppercase" style={{ color: meta.color }}>
                  #{meta.label}
                </h1>
                <p className="text-zinc-400 text-sm mt-2 max-w-xl">{meta.description}</p>
              </div>
            </div>
            <div className="flex gap-6 mt-6">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" style={{ color: meta.color }} />
                <span className="text-sm font-black">{stats.totalClips.toLocaleString()} Clips</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-black text-zinc-400">{stats.totalViews.toLocaleString()} Views</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clip Grid */}
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-500" /> Top Clips
            </h2>
            <Link href="/post" className="px-6 py-3 bg-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-colors">
              投稿する
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[9/16] bg-zinc-900 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : clips.length === 0 ? (
            <div className="text-center py-24">
              <span className="text-6xl mb-6 block">{meta.emoji}</span>
              <p className="text-zinc-500 font-black uppercase tracking-widest mb-4">まだクリップがありません</p>
              <Link href="/post" className="inline-block px-8 py-4 bg-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-colors">
                最初の{meta.label}クリップを投稿する →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {clips.map((clip, i) => {
                const profile = Array.isArray(clip.profiles) ? clip.profiles[0] : clip.profiles;
                return (
                  <motion.div
                    key={clip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group"
                  >
                    <Link href={`/?clip=${clip.id}`} className="block">
                      <div className="aspect-[9/16] relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-blue-500/30 transition-all">
                        {clip.thumbnail_url ? (
                          <img src={clip.thumbnail_url} alt={clip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : clip.video_url ? (
                          <video src={`${clip.video_url}#t=0.5`} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gamepad2 className="w-12 h-12 text-zinc-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs font-black truncate">{clip.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Eye className="w-3 h-3 text-zinc-300" />
                            <span className="text-zinc-300 text-[10px]">{(clip.views || 0).toLocaleString()}</span>
                            <Heart className="w-3 h-3 text-pink-400 ml-2" />
                            <span className="text-zinc-300 text-[10px]">{(clip.likes || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="absolute top-2 left-2">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: meta.color + '40', color: meta.color }}>
                            #{meta.label}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 px-1">
                        <p className="text-xs font-bold text-zinc-300 truncate">{clip.title}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">@{profile?.username || profile?.display_name || 'Player'}</p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
