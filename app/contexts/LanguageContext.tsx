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
    "nav.home": "ホーム", "nav.search": "検索", "nav.post": "投稿", "nav.login": "ログイン", "nav.proPost": "Pro 投稿", "nav.activity": "通知",
    "nav.profile": "マイページ", "nav.studio": "スタジオ", "nav.settings": "設定", "nav.logout": "ログアウト",
    "feed.following": "フォロー中", "feed.foryou": "おすすめ",
    "action.like": "いいね", "action.chat": "チャット", "action.share": "シェア", "action.gift": "ギフト", "action.report": "通報",
    "post.title": "動画を投稿する", "studio.views": "総再生数", "studio.likes": "総いいね", "studio.revenue": "収益ダッシュボード",
    "settings.title": "設定", "settings.save": "保存する",
    "legal.terms": "利用規約", "legal.privacy": "プライバシーポリシー", "legal.notice": "特定商取引法に基づく表記",
    "post.titleLabel": "タイトル", "post.fileLabel": "動画ファイルを選択 (MP4/WebM)", "post.gameLabel": "ゲームタイトル",
    "post.uploadBtn": "投稿", "common.cancel": "キャンセル",
    "post.uploadError": "アップロードに失敗しました。設定を確認してください。",
    "post.sizeLimitMsg": "最大 50MB まで（最高に熱い瞬間を切り取ろう！）",
    "post.sizeError": "ファイルサイズが大きすぎます (最大 50MB)",
    "post.duplicateError": "この動画は既に投稿されています。",
    "studio.title": "クリエイター・スタジオ", "studio.myContent": "自分のコンテンツ", "studio.status": "状態", "studio.date": "投稿日",
    "studio.published": "公開中", "studio.pending": "審査中", "studio.noClips": "まだ動画がありません。最初の動画を投稿しましょう！",
    "mission.title": "デイリーミッション", "mission.goal": "10動画視聴で1コインGET!", "mission.claim": "報酬を受け取る", "mission.completed": "完了",
    "mission.rewarded": "1コイン獲得しました！", "studio.topSupporters": "トップ・サポーター",
    "feed.trending": "トレンド", "feed.emptyTitle": "まだクリップがありません",
    "feed.emptyDesc": "最初の神プレイを投稿しよう。", "feed.uploadCta": "動画を投稿", "feed.viewsLabel": "視聴",
    "comments.title": "コメント", "comments.subtitle": "リアルタイム", "comments.emptyLine1": "まだコメントはありません",
    "comments.emptyLine2": "会話を始めよう", "comments.reply": "返信", "comments.like": "いいね",
    "comments.replyingTo": "返信先", "comments.placeholder": "コメントを入力...", "comments.placeholderReply": "返信を書く...",
    "comments.guidelines": "コミュニティガイドラインに準拠してください", "comments.justNow": "たった今",
    "tiktok.chat": "コメント", "tiktok.save": "保存", "tiktok.saved": "保存済", "tiktok.share": "共有",
    "tiktok.copied": "コピー済", "tiktok.gift": "ギフト", "nav.notifications": "通知",
    "sidebar.battle": "バトル", "sidebar.messages": "メッセージ", "sidebar.studioEdit": "スタジオ",
    "sidebar.upgradePro": "Pro にアップグレード", "common.streak": "連続",
    "notif.empty": "まだ通知はありません", "notif.emptyHint": "いいねやギフトがあるとここに表示されます。",
    "notif.likedClip": "あなたのクリップにいいねしました。", "notif.giftCoins": "{n} コインを贈りました！🎉",
    "notif.followedYou": "あなたをフォローし始めました。"
  },
  EN: {
    "nav.home": "Home", "nav.search": "Search", "nav.post": "Post", "nav.login": "Login", "nav.proPost": "Pro Post", "nav.activity": "Activity",
    "nav.profile": "Profile", "nav.studio": "Studio", "nav.settings": "Settings", "nav.logout": "Logout",
    "feed.following": "Following", "feed.foryou": "For You",
    "action.like": "Like", "action.chat": "Chat", "action.share": "Share", "action.gift": "Gift", "action.report": "Report",
    "post.title": "Publish Clip", "studio.views": "Total Views", "studio.likes": "Total Likes", "studio.revenue": "Revenue Dashboard",
    "settings.title": "Settings", "settings.save": "Save Changes",
    "legal.terms": "Terms of Service", "legal.privacy": "Privacy Policy", "legal.notice": "Legal Notice",
    "post.titleLabel": "Title", "post.fileLabel": "Select Video (MP4/WebM)", "post.gameLabel": "Game Title",
    "post.uploadBtn": "Publish", "common.cancel": "Cancel",
    "post.uploadError": "Upload failed. Check your settings.",
    "post.sizeLimitMsg": "Max 50MB (Capture your hottest moments!)",
    "post.sizeError": "File too large (Max 50MB)",
    "post.duplicateError": "This video has already been posted.",
    "studio.title": "Creator Studio", "studio.myContent": "My Content", "studio.status": "Status", "studio.date": "Date",
    "studio.published": "Published", "studio.pending": "Pending", "studio.noClips": "No clips yet. Start publishing!",
    "mission.title": "Daily Mission", "mission.goal": "Watch 10 videos to get 1 Coin!", "mission.claim": "Claim Reward", "mission.completed": "Completed",
    "mission.rewarded": "1 Coin rewarded!", "studio.topSupporters": "Top Supporters",
    "feed.trending": "Trending", "feed.emptyTitle": "No clips yet", "feed.emptyDesc": "Be the first to share your epic gaming moments.",
    "feed.uploadCta": "Upload Video", "feed.viewsLabel": "views",
    "comments.title": "Comments", "comments.subtitle": "Real-time", "comments.emptyLine1": "No comments yet.",
    "comments.emptyLine2": "Start the conversation.", "comments.reply": "Reply", "comments.like": "Like",
    "comments.replyingTo": "Replying to", "comments.placeholder": "Add to the discussion...",
    "comments.placeholderReply": "Write your reply...", "comments.guidelines": "Community guidelines apply",
    "comments.justNow": "Just now",
    "tiktok.chat": "Chat", "tiktok.save": "Save", "tiktok.saved": "Saved", "tiktok.share": "Share",
    "tiktok.copied": "Copied", "tiktok.gift": "Gift", "nav.notifications": "Notifications",
    "sidebar.battle": "Battle", "sidebar.messages": "Messages", "sidebar.studioEdit": "Studio & Edit",
    "sidebar.upgradePro": "Upgrade to Pro", "common.streak": "streak",
    "notif.empty": "No notifications yet", "notif.emptyHint": "Likes and gifts on your clips will appear here.",
    "notif.likedClip": "liked your clip.", "notif.giftCoins": "sent you {n} coins! 🎉", "notif.followedYou": "started following you."
  },
  KR: {
    "nav.home": "홈", "nav.search": "검색", "nav.post": "게시", "nav.login": "로그인", "nav.proPost": "Pro 게시", "nav.activity": "알림",
    "nav.profile": "마이페이지", "nav.studio": "스튜디오", "nav.settings": "설정", "nav.logout": "로그아웃",
    "feed.following": "팔로잉", "feed.foryou": "추천",
    "action.like": "좋아요", "action.chat": "채팅", "action.share": "공유", "action.gift": "선물", "action.report": "신고",
    "post.title": "클립 게시", "studio.views": "총 조회수", "studio.likes": "총 좋아요", "studio.revenue": "수익 대시보드",
    "settings.title": "설정", "settings.save": "변경사항 저장",
    "legal.terms": "이용약관", "legal.privacy": "개인정보처리방침", "legal.notice": "특정상거래법 표기",
    "post.titleLabel": "제목", "post.fileLabel": "비디오 선택 (MP4/WebM)", "post.gameLabel": "게임 제목",
    "post.uploadBtn": "게시하기", "common.cancel": "취소",
    "post.uploadError": "업로드 실패. 설정을 확인하세요.",
    "post.sizeLimitMsg": "최대 50MB까지 (가장 뜨거운 순간을 포착하세요!)",
    "post.sizeError": "파일이 너무 큽니다 (최대 50MB)",
    "post.duplicateError": "이미 게시된 동영상입니다.",
    "studio.title": "크리에이터 스튜디오", "studio.myContent": "내 콘텐츠", "studio.status": "상태", "studio.date": "날짜",
    "studio.published": "게시됨", "studio.pending": "대기 중", "studio.noClips": "아직 클립이 없습니다. 게시를 시작해 보세요!",
    "mission.title": "데일리 미션", "mission.goal": "동영상 10개 시청하고 1코인 받기!", "mission.claim": "보상 받기", "mission.completed": "완료됨",
    "mission.rewarded": "1코인을 획득했습니다!", "studio.topSupporters": "최고 서포터",
    "feed.trending": "트렌딩", "feed.emptyTitle": "아직 클립이 없습니다", "feed.emptyDesc": "첫 영상을 올려보세요.",
    "feed.uploadCta": "업로드", "feed.viewsLabel": "조회",
    "comments.title": "댓글", "comments.subtitle": "실시간", "comments.emptyLine1": "댓글이 없습니다",
    "comments.emptyLine2": "대화를 시작하세요", "comments.reply": "답글", "comments.like": "좋아요",
    "comments.replyingTo": "답글 대상", "comments.placeholder": "댓글 입력...", "comments.placeholderReply": "답글 작성...",
    "comments.guidelines": "커뮤니티 가이드라인을 준수하세요", "comments.justNow": "방금",
    "tiktok.chat": "채팅", "tiktok.save": "저장", "tiktok.saved": "저장됨", "tiktok.share": "공유",
    "tiktok.copied": "복사됨", "tiktok.gift": "선물", "nav.notifications": "알림",
    "sidebar.battle": "배틀", "sidebar.messages": "메시지", "sidebar.studioEdit": "스튜디오",
    "sidebar.upgradePro": "Pro 업그레이드", "common.streak": "연속",
    "notif.empty": "알림이 없습니다", "notif.emptyHint": "좋아요나 선물이 오면 여기에 표시됩니다.",
    "notif.likedClip": "회원님의 클립에 좋아요를 눌렀습니다.", "notif.giftCoins": "{n} 코인을 보냈습니다! 🎉",
    "notif.followedYou": "회원님을 팔로우하기 시작했습니다."
  },
  CN: {
    "nav.home": "首页", "nav.search": "搜索", "nav.post": "发布", "nav.login": "登录", "nav.proPost": "Pro 发布", "nav.activity": "动态",
    "nav.profile": "个人主页", "nav.studio": "创作者中心", "nav.settings": "设置", "nav.logout": "退出登录",
    "feed.following": "关注", "feed.foryou": "推荐",
    "action.like": "赞", "action.chat": "评论", "action.share": "分享", "action.gift": "打赏", "action.report": "举报",
    "post.title": "发布视频", "studio.views": "总浏览量", "studio.likes": "总获赞", "studio.revenue": "收益中心",
    "settings.title": "设置", "settings.save": "保存修改",
    "legal.terms": "服务条款", "legal.privacy": "隐私政策", "legal.notice": "法律声明",
    "post.titleLabel": "标题", "post.fileLabel": "选择视频 (MP4/WebM)", "post.gameLabel": "游戏标题",
    "post.uploadBtn": "发布", "common.cancel": "取消",
    "post.uploadError": "上传失败，请检查设置。",
    "post.sizeLimitMsg": "最大 50MB（捕捉你最燃的瞬间！）",
    "post.sizeError": "文件太大（最大 50MB）",
    "post.duplicateError": "该视频已发布。",
    "studio.title": "創作者中心", "studio.myContent": "我的内容", "studio.status": "状态", "studio.date": "日期",
    "studio.published": "已发布", "studio.pending": "审核中", "studio.noClips": "还没有视频，开始发布吧！",
    "mission.title": "每日任务", "mission.goal": "观看10个视频即可获得1个金币！", "mission.claim": "领取奖励", "mission.completed": "已完成",
    "mission.rewarded": "恭喜！获得1个金幣！", "studio.topSupporters": "顶级支持者",
    "feed.trending": "热门", "feed.emptyTitle": "还没有视频", "feed.emptyDesc": "快来发布第一条精彩剪辑。",
    "feed.uploadCta": "上传视频", "feed.viewsLabel": "次播放",
    "comments.title": "评论", "comments.subtitle": "实时", "comments.emptyLine1": "还没有评论",
    "comments.emptyLine2": "开始讨论吧", "comments.reply": "回复", "comments.like": "赞",
    "comments.replyingTo": "回复", "comments.placeholder": "发表评论...", "comments.placeholderReply": "写回复...",
    "comments.guidelines": "请遵守社区准则", "comments.justNow": "刚刚",
    "tiktok.chat": "评论", "tiktok.save": "保存", "tiktok.saved": "已保存", "tiktok.share": "分享",
    "tiktok.copied": "已复制", "tiktok.gift": "打赏", "nav.notifications": "通知",
    "sidebar.battle": "对战", "sidebar.messages": "消息", "sidebar.studioEdit": "创作中心",
    "sidebar.upgradePro": "升级 Pro", "common.streak": "连续",
    "notif.empty": "暂无通知", "notif.emptyHint": "有人点赞或打赏你的视频时会显示在这里。",
    "notif.likedClip": "赞了你的视频。", "notif.giftCoins": "向你赠送了 {n} 枚金币！🎉", "notif.followedYou": "开始关注你了。"
  }
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'JP',
  setLang: () => {},
  t: () => ''
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>('JP');

  // 既定は日本語。設定で保存した言語のみ上書き（プロダクト方針：日本語 UI 基準）
  useEffect(() => {
    const saved = localStorage.getItem('vlyp_lang') as Language;
    if (saved === 'EN' || saved === 'JP' || saved === 'KR' || saved === 'CN') {
      setLangState(saved);
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
