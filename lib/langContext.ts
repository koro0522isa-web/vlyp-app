import { useState, useEffect } from 'react';

export const LANGUAGES = {
  JP: { home: "ホーム", post: "投稿", studio: "スタジオ", settings: "設定", logout: "ログアウト", connect: "アカウント接続", game: "ゲーム", follow: "フォロー" },
  EN: { home: "HOME", post: "POST", studio: "STUDIO", settings: "SETTINGS", logout: "LOGOUT", connect: "CONNECT", game: "GAMES", follow: "FOLLOW" },
  KR: { home: "홈", post: "게시", studio: "스튜디오", settings: "설정", logout: "로그아웃", connect: "계정 연결", game: "게임", follow: "팔로우" },
  CN: { home: "首页", post: "发布", studio: "工作室", settings: "设置", logout: "登出", connect: "连接帳号", game: "游戏", follow: "关注" }
};

export type LangType = keyof typeof LANGUAGES;

// 言語を保存・取得する関数
export const getStoredLang = (): LangType => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('vlyp_lang') as LangType) || 'JP';
  }
  return 'JP';
};