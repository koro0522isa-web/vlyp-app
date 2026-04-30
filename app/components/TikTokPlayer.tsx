"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Gift, Gamepad2, Check, UserPlus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface TikTokPlayerProps {
  clip: any;
  isActive: boolean;
  userLikes: number[];
  onLike: (id: number, ownerId: string) => void;
  onComment: (id: number, ownerId: string) => void;
  onShare: (clip: any) => void;
  onGift: (clip: any) => void;
  onFollow: (targetId: string) => void;
  renderTitle: (title: string) => any;
  isCopied: boolean;
  isFollowing: boolean;
}

export default function TikTokPlayer({
  clip,
  isActive,
  userLikes,
  onLike,
  onComment,
  onShare,
  onGift,
  onFollow,
  renderTitle,
  isCopied,
  isFollowing
}: TikTokPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showHeart, setShowHeart] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: 0, y: 0 });
  const { t } = useLanguage();

  const isLiked = userLikes.includes(clip.id);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHeartPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);

    if (!isLiked) {
      onLike(clip.id, clip.user_id);
    }
  };

  return (
    <div 
      className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden"
      onDoubleClick={handleDoubleClick}
    >
      {/* ビデオ本体 */}
      <video
        ref={videoRef}
        src={clip.video_url}
        className="h-full w-full object-contain pointer-events-none"
        loop
        playsInline
      />

      {/* ダブルタップ・ハート演出 */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0], rotate: [-20, 0, 10] }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute pointer-events-none z-50"
            style={{ left: heartPos.x - 40, top: heartPos.y - 40 }}
          >
            <Heart className="w-24 h-24 text-pink-500 fill-pink-500 shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* グラデーションオーバーレイ */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {/* 右側アクションバー (TikTok風) */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20">
        {/* プロフィール画像 & フォローボタン */}
        <div className="relative mb-2">
          <Link href={`/profile/${clip.user_id}`} className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-800 block relative">
            <Image 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${clip.profiles?.display_name}`} 
              alt="avatar"
              fill
              className="object-cover"
            />
          </Link>
          {!isFollowing && (
            <motion.button 
              whileTap={{ scale: 0.5 }}
              onClick={() => onFollow(clip.user_id)}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-pink-500 rounded-full p-0.5 border-2 border-black hover:bg-pink-400 transition-colors"
            >
              <UserPlus className="w-3 h-3 text-white" />
            </motion.button>
          )}
          {isFollowing && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-full p-0.5 border-2 border-black">
              <Check className="w-3 h-3 text-black" />
            </div>
          )}
        </div>

        {/* いいね */}
        <button onClick={() => onLike(clip.id, clip.user_id)} className="flex flex-col items-center group">
          <motion.div whileTap={{ scale: 0.7 }} className="p-2">
            <Heart className={`w-8 h-8 transition-colors ${isLiked ? 'fill-pink-500 text-pink-500' : 'text-white'}`} />
          </motion.div>
          <span className="text-xs font-bold text-white shadow-sm">{clip.likes || 0}</span>
        </button>

        {/* コメント */}
        <button onClick={() => onComment(clip.id, clip.user_id)} className="flex flex-col items-center">
          <div className="p-2"><MessageCircle className="w-8 h-8 text-white" /></div>
          <span className="text-xs font-bold text-white shadow-sm">Chat</span>
        </button>

        {/* シェア */}
        <button onClick={() => onShare(clip)} className="flex flex-col items-center">
          <div className={`p-2 rounded-full transition-all ${isCopied ? 'bg-green-500' : ''}`}>
            {isCopied ? <Check className="w-8 h-8 text-white" /> : <Share2 className="w-8 h-8 text-white" />}
          </div>
          <span className="text-xs font-bold text-white shadow-sm">Share</span>
        </button>

        {/* ギフト */}
        <button onClick={() => onGift(clip)} className="flex flex-col items-center">
          <div className="p-2 bg-yellow-400/20 rounded-full border border-yellow-400/30">
            <Gift className="w-8 h-8 text-yellow-400" />
          </div>
          <span className="text-xs font-bold text-yellow-400 shadow-sm uppercase">Gift</span>
        </button>
      </div>

      {/* 左下テキスト情報 */}
      <div className="absolute bottom-10 left-6 right-20 pointer-events-none z-20">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg font-black text-white italic drop-shadow-lg">@{clip.profiles?.display_name || "Player"}</span>
          {clip.game_title && (
            <div className="flex items-center gap-1 bg-blue-600/30 backdrop-blur-md px-3 py-1 rounded-full border border-blue-400/30">
              <Gamepad2 className="w-3 h-3 text-blue-300" />
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest">{clip.game_title}</span>
            </div>
          )}
        </div>
        <h2 className="text-sm font-bold text-white line-clamp-3 drop-shadow-md leading-relaxed mb-4">
          {renderTitle(clip.title)}
        </h2>
      </div>

      {/* 再生プログレスバー */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-30">
        {isActive && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 15, ease: "linear", repeat: Infinity }}
            className="h-full bg-white/60"
          />
        )}
      </div>
    </div>
  );
}
