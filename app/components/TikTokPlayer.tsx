"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Gift, Gamepad2, Check, UserPlus, Volume2, VolumeX, Play, Pause } from 'lucide-react';
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
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeout = useRef<NodeJS.Timeout>(undefined);
  const { t } = useLanguage();

  const isLiked = userLikes.includes(clip.id);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setProgress(0);
      }
    }
  }, [isActive]);

  // Real-time progress tracking synced to actual video duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    const updateProgress = () => {
      if (video.duration > 0) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
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

  const togglePause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPaused(false);
    } else {
      videoRef.current.pause();
      setIsPaused(true);
    }
    // Show controls briefly
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 1500);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  return (
    <div 
      className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden"
      onDoubleClick={handleDoubleClick}
      onClick={togglePause}
    >
      {/* ビデオ本体 */}
      <video
        ref={videoRef}
        src={clip.video_url}
        className="h-full w-full object-contain pointer-events-none"
        loop
        playsInline
        muted={isMuted}
      />

      {/* Pause/Play indicator */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
          >
            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
              {isPaused ? <Play className="w-10 h-10 text-white ml-1" /> : <Pause className="w-10 h-10 text-white" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Mute button */}
      <button 
        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
        className="absolute top-20 right-4 z-30 p-2.5 bg-black/30 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-all"
      >
        {isMuted ? <VolumeX className="w-4 h-4 text-white/70" /> : <Volume2 className="w-4 h-4 text-white/70" />}
      </button>

      {/* 右側アクションバー (TikTok風) */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20" onClick={(e) => e.stopPropagation()}>
        {/* プロフィール画像 & フォローボタン */}
        <div className="relative mb-2">
          <Link href={`/profile/${clip.user_id}`} className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-zinc-800 block relative">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${clip.profiles?.display_name || clip.user_id}`} 
              alt="avatar"
              className="w-full h-full object-cover"
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
            <Heart className={`w-8 h-8 transition-all ${isLiked ? 'fill-pink-500 text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]' : 'text-white'}`} />
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
          <span className="text-xs font-bold text-white shadow-sm">{isCopied ? 'Copied!' : 'Share'}</span>
        </button>

        {/* ギフト */}
        <button onClick={() => onGift(clip)} className="flex flex-col items-center">
          <motion.div 
            whileTap={{ scale: 0.8, rotate: -10 }}
            className="p-2 bg-yellow-400/20 rounded-full border border-yellow-400/30"
          >
            <Gift className="w-8 h-8 text-yellow-400" />
          </motion.div>
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

      {/* Real video progress bar — synced to actual playback */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-30">
        <motion.div 
          className="h-full bg-white/80"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
