"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'JP' | 'EN';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

// Simple translation dictionary
const translations = {
  JP: {
    "nav.home": "ホーム",
    "nav.search": "検索",
    "nav.post": "投稿",
    "nav.activity": "通知",
    "nav.profile": "マイページ",
    "nav.studio": "スタジオ",
    "nav.settings": "設定",
    "nav.logout": "ログアウト",
    "feed.following": "フォロー中",
    "feed.foryou": "おすすめ",
    "action.like": "いいね",
    "action.chat": "チャット",
    "action.share": "シェア",
    "action.gift": "ギフト",
    "action.report": "通報",
    "post.title": "動画を投稿する",
    "studio.views": "総再生数",
    "studio.likes": "総いいね",
    "studio.revenue": "収益ダッシュボード",
    "settings.title": "設定",
    "settings.save": "保存する"
  },
  EN: {
    "nav.home": "Home",
    "nav.search": "Search",
    "nav.post": "Post",
    "nav.activity": "Activity",
    "nav.profile": "Profile",
    "nav.studio": "Studio",
    "nav.settings": "Settings",
    "nav.logout": "Logout",
    "feed.following": "Following",
    "feed.foryou": "For You",
    "action.like": "Like",
    "action.chat": "Chat",
    "action.share": "Share",
    "action.gift": "Gift",
    "action.report": "Report",
    "post.title": "Publish Clip",
    "studio.views": "Total Views",
    "studio.likes": "Total Likes",
    "studio.revenue": "Revenue Dashboard",
    "settings.title": "Settings",
    "settings.save": "Save Changes"
  }
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'JP',
  setLang: () => {},
  t: () => ''
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>('JP');

  useEffect(() => {
    const saved = localStorage.getItem('vlyp_lang') as Language;
    if (saved === 'EN' || saved === 'JP') {
      setLangState(saved);
    } else {
      const browserLang = navigator.language.startsWith('ja') ? 'JP' : 'EN';
      setLangState(browserLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('vlyp_lang', newLang);
  };

  const t = (key: string): string => {
    return (translations[lang] as Record<string, string>)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
