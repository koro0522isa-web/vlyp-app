"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'JP' | 'EN' | 'KR' | 'CN';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  JP: {
    "nav.home": "ホーム", "nav.search": "検索", "nav.post": "投稿", "nav.activity": "通知",
    "nav.profile": "マイページ", "nav.studio": "スタジオ", "nav.settings": "設定", "nav.logout": "ログアウト",
    "feed.following": "フォロー中", "feed.foryou": "おすすめ",
    "action.like": "いいね", "action.chat": "チャット", "action.share": "シェア", "action.gift": "ギフト", "action.report": "通報",
    "post.title": "動画を投稿する", "studio.views": "総再生数", "studio.likes": "総いいね", "studio.revenue": "収益ダッシュボード",
    "settings.title": "設定", "settings.save": "保存する",
    "legal.terms": "利用規約", "legal.privacy": "プライバシーポリシー", "legal.notice": "特定商取引法に基づく表記",
    "post.titleLabel": "タイトル", "post.fileLabel": "動画ファイルを選択 (MP4/WebM)", "post.gameLabel": "ゲームタイトル",
    "post.uploadBtn": "投稿", "common.cancel": "キャンセル",
    "post.uploadError": "アップロードに失敗しました。設定を確認してください。",
    "post.sizeError": "ファイルサイズが大きすぎます (最大 200MB)",
    "post.duplicateError": "この動画は既に投稿されています。"
  },
  EN: {
    "nav.home": "Home", "nav.search": "Search", "nav.post": "Post", "nav.activity": "Activity",
    "nav.profile": "Profile", "nav.studio": "Studio", "nav.settings": "Settings", "nav.logout": "Logout",
    "feed.following": "Following", "feed.foryou": "For You",
    "action.like": "Like", "action.chat": "Chat", "action.share": "Share", "action.gift": "Gift", "action.report": "Report",
    "post.title": "Publish Clip", "studio.views": "Total Views", "studio.likes": "Total Likes", "studio.revenue": "Revenue Dashboard",
    "settings.title": "Settings", "settings.save": "Save Changes",
    "legal.terms": "Terms of Service", "legal.privacy": "Privacy Policy", "legal.notice": "Legal Notice",
    "post.titleLabel": "Title", "post.fileLabel": "Select Video (MP4/WebM)", "post.gameLabel": "Game Title",
    "post.uploadBtn": "Publish", "common.cancel": "Cancel",
    "post.uploadError": "Upload failed. Check your settings.",
    "post.sizeError": "File too large (Max 200MB)",
    "post.duplicateError": "This video has already been posted."
  },
  KR: {
    "nav.home": "홈", "nav.search": "검색", "nav.post": "게시", "nav.activity": "알림",
    "nav.profile": "마이페이지", "nav.studio": "스튜디오", "nav.settings": "설정", "nav.logout": "로그아웃",
    "feed.following": "팔로잉", "feed.foryou": "추천",
    "action.like": "좋아요", "action.chat": "채팅", "action.share": "공유", "action.gift": "선물", "action.report": "신고",
    "post.title": "클립 게시", "studio.views": "총 조회수", "studio.likes": "총 좋아요", "studio.revenue": "수익 대시보드",
    "settings.title": "설정", "settings.save": "변경사항 저장",
    "legal.terms": "이용약관", "legal.privacy": "개인정보처리방침", "legal.notice": "특정상거래법 표기",
    "post.titleLabel": "제목", "post.fileLabel": "비디오 선택 (MP4/WebM)", "post.gameLabel": "게임 제목",
    "post.uploadBtn": "게시하기", "common.cancel": "취소",
    "post.uploadError": "업로드 실패. 설정을 확인하세요.",
    "post.sizeError": "파일이 너무 큽니다 (최대 200MB)",
    "post.duplicateError": "이미 게시된 동영상입니다."
  },
  CN: {
    "nav.home": "首页", "nav.search": "搜索", "nav.post": "发布", "nav.activity": "动态",
    "nav.profile": "个人主页", "nav.studio": "创作者中心", "nav.settings": "设置", "nav.logout": "退出登录",
    "feed.following": "关注", "feed.foryou": "推荐",
    "action.like": "赞", "action.chat": "评论", "action.share": "分享", "action.gift": "打赏", "action.report": "举报",
    "post.title": "发布视频", "studio.views": "总浏览量", "studio.likes": "总获赞", "studio.revenue": "收益中心",
    "settings.title": "设置", "settings.save": "保存修改",
    "legal.terms": "服务条款", "legal.privacy": "隐私政策", "legal.notice": "法律声明",
    "post.titleLabel": "标题", "post.fileLabel": "选择视频 (MP4/WebM)", "post.gameLabel": "游戏标题",
    "post.uploadBtn": "发布", "common.cancel": "取消",
    "post.uploadError": "上传失败，请检查设置。",
    "post.sizeError": "文件太大（最大 200MB）",
    "post.duplicateError": "该视频已发布。"
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
    if (saved === 'EN' || saved === 'JP' || saved === 'KR' || saved === 'CN') {
      setLangState(saved);
    } else {
      const browserLang = navigator.language;
      if (browserLang.startsWith('ja')) setLangState('JP');
      else if (browserLang.startsWith('ko')) setLangState('KR');
      else if (browserLang.startsWith('zh')) setLangState('CN');
      else setLangState('EN');
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
