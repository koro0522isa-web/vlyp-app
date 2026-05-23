"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Home as HomeIcon,
  Clapperboard,
  Settings,
  Search,
  User,
  MessageSquare,
  Crown,
  Coins,
  Trophy,
  Sparkles,
  Bell,
  BarChart2,
  Wand2,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { DM_UNREAD_EVENT, PROFILE_REFRESH_EVENT, NOTIF_UNREAD_EVENT } from '@/lib/dm-events';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [vlypId, setVlypId] = useState<string>('Player');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [coins, setCoins] = useState(0);
  const [dmUnread, setDmUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);

  const loadProfileAndWallet = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username, vlyp_id, is_pro, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    setVlypId(profile?.display_name || profile?.username || profile?.vlyp_id || 'Player');
    setAvatarUrl(profile?.avatar_url || null);
    setIsPro(profile?.is_pro || false);

    const { data: wallet } = await supabase
      .from('wallets')
      .select('coins')
      .eq('user_id', userId)
      .maybeSingle();
    setCoins(wallet?.coins || 0);
  };

  const loadDmUnread = async (userId: string) => {
    const { count, error } = await supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
    if (!error && count !== null) setDmUnread(count);
  };

  const loadNotifUnread = async (userId: string) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (!error && count !== null) setNotifUnread(count);
  };

  // userはAuthContextから取得 → 変化があったときだけプロフィール再取得
  useEffect(() => {
    if (user) {
      loadProfileAndWallet(user.id);
      loadDmUnread(user.id);
      loadNotifUnread(user.id);
    } else {
      setDmUnread(0);
      setNotifUnread(0);
    }
  }, [user]);

  useEffect(() => {
    const onDmUnread = (e: Event) => {
      const t = (e as CustomEvent<{ total: number }>).detail?.total;
      if (typeof t === 'number') setDmUnread(t);
    };
    const onNotifUnread = (e: Event) => {
      const t = (e as CustomEvent<{ total: number }>).detail?.total;
      if (typeof t === 'number') setNotifUnread(t);
    };
    const onProfileRefresh = () => {
      if (user) {
        loadProfileAndWallet(user.id);
        loadNotifUnread(user.id);
      }
    };
    window.addEventListener(DM_UNREAD_EVENT, onDmUnread);
    window.addEventListener(NOTIF_UNREAD_EVENT, onNotifUnread);
    window.addEventListener(PROFILE_REFRESH_EVENT, onProfileRefresh);
    return () => {
      window.removeEventListener(DM_UNREAD_EVENT, onDmUnread);
      window.removeEventListener(NOTIF_UNREAD_EVENT, onNotifUnread);
      window.removeEventListener(PROFILE_REFRESH_EVENT, onProfileRefresh);
    };
  }, [user]);

  const handleProUpgrade = async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ packId: 'pro' }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      console.error(error);
    }
  };

  const { t } = useLanguage();

  const navItems = [
    { icon: <HomeIcon />, label: t('nav.home'), href: '/', badge: 0 },
    { icon: <Search />, label: t('nav.search'), href: '/search', badge: 0 },
    { icon: <Bell />, label: t('nav.notifications'), href: '/notifications', badge: notifUnread },
    { icon: <Trophy />, label: 'ランキング', href: '/leaderboard', badge: 0 },
    { icon: <MessageSquare />, label: t('sidebar.messages'), href: '/messages', badge: dmUnread },
    { icon: <Clapperboard />, label: t('sidebar.studioEdit'), href: '/studio', badge: 0 },
    { icon: <Wand2 />, label: 'AI Edit', href: '/edit', badge: 0 },
    { icon: <Settings />, label: t('nav.settings'), href: '/settings', badge: 0 },
  ];

  return (
    <aside className="w-20 lg:w-72 bg-[#09090B] border-r border-white/5 flex flex-col z-40 flex-shrink-0 hidden md:flex relative overflow-hidden">
      {/* Pro Subtle Background Glow */}
      {isPro && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 animate-rainbow" />
      )}
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rainbow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .animate-rainbow {
          background-size: 200% 200%;
          animation: rainbow 3s linear infinite;
        }
        .pro-glow-card {
          position: relative;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 1rem;
          padding: 1px;
          overflow: hidden;
        }
        .pro-glow-card::before {
          content: '';
          position: absolute;
          inset: -100%;
          background: conic-gradient(from 0deg, transparent, #3b82f6, #ec4899, transparent);
          animation: rotate 3s linear infinite;
        }
        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }
      `}} />

      <div className="p-6 lg:p-8">
        <Link href="/">
          <h1 className="text-3xl font-black italic tracking-tighter text-blue-500 hidden lg:block">VLYP</h1>
          <span className="text-2xl font-black italic text-blue-500 lg:hidden block text-center">V</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 lg:px-6 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${isActive ? 'bg-white/10 text-blue-400 font-black' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}>
              <span className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-blue-400' : ''}`}>{item.icon}</span>
              <span className="hidden lg:block text-[10px] uppercase tracking-[0.2em] font-black">{item.label}</span>
              {item.badge > 0 && (
                <span className="absolute top-2 left-8 lg:left-auto lg:right-3 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white border-2 border-[#09090B]">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 lg:p-6 border-t border-white/5 space-y-4 bg-[#0d0d0f]/50 backdrop-blur-xl">
        {user && (
          <div className={isPro ? 'pro-glow-card' : ''}>
            <Link href={`/profile/${user.id}`} className={`relative z-10 flex items-center gap-3 p-3 ${isPro ? 'bg-[#0f0f12]' : 'bg-white/5'} rounded-[0.9rem] border border-white/5 hover:bg-white/10 transition-all group`}>
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${isPro ? 'from-purple-600 to-pink-600 shadow-lg shadow-purple-500/20' : 'from-zinc-700 to-zinc-900'} flex items-center justify-center text-xs font-black flex-shrink-0 border border-white/10 overflow-hidden`}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  vlypId.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <p className="text-xs font-black text-zinc-200 truncate group-hover:text-blue-400 transition-colors">@{vlypId}</p>
                  {isPro && <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />}
                </div>
                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                  {isPro ? 'Pro Profile' : 'Your Profile'}
                </p>
              </div>
            </Link>
          </div>
        )}

        <div className="flex gap-2">
          <Link href={user ? '/post' : '/login'} className={`flex-1 py-4 ${isPro ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-blue-600'} rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center shadow-lg hover:scale-[1.02] active:scale-95`}>
            {user ? (isPro ? t('nav.proPost') : t('nav.post')) : t('nav.login')}
          </Link>
          {user && (
            <Link href="/coins" className="w-12 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 flex flex-col items-center justify-center transition-all">
              <Coins className="w-4 h-4 text-yellow-500 mb-0.5" />
              <span className="text-[8px] font-black text-yellow-500">{coins}</span>
            </Link>
          )}
        </div>
        
        {user && !isPro && (
          <button 
            onClick={handleProUpgrade} 
            className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] active:scale-95 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
            <Crown className="w-4 h-4 animate-bounce" />
            {t('sidebar.upgradePro')}
          </button>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shimmer {
            100% { transform: translateX(100%); }
          }
          .group-hover\\:animate-shimmer {
            animation: shimmer 1.5s infinite;
          }
        `}} />
        
        <div className="pt-2 text-center flex flex-col gap-2">
          <Link href="/legal" className="text-[9px] font-black text-zinc-600 hover:text-cyan-400 uppercase tracking-widest transition-colors">Legal</Link>
          <Link href="/privacy" className="text-[9px] font-black text-zinc-600 hover:text-cyan-400 uppercase tracking-widest transition-colors">Privacy</Link>
        </div>
      </div>
    </aside>
  );
}
