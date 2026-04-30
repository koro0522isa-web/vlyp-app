"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PlayerContextType {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(true); // デフォルトはミュート（ブラウザの自動再生制限対策）
  const [volume, setVolume] = useState(1);

  // ローカルストレージから設定を復元
  useEffect(() => {
    const savedMute = localStorage.getItem('vlyp_muted');
    if (savedMute !== null) {
      setIsMuted(savedMute === 'true');
    }
  }, []);

  // 設定を保存
  const handleSetIsMuted = (muted: boolean) => {
    setIsMuted(muted);
    localStorage.setItem('vlyp_muted', muted.toString());
  };

  return (
    <PlayerContext.Provider value={{ 
      isMuted, 
      setIsMuted: handleSetIsMuted, 
      volume, 
      setVolume 
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
