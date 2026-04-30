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
  Swords,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [vlypId, setVlypId] = useState<string>('Player');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username, vlyp_id, is_pro, avatar_url')
          .eq('id', currentUser.id)
          .maybeSingle();
        setVlypId(profile?.display_name || profile?.username || profile?.vlyp_id || 'Player');
        setAvatarUrl(profile?.avatar_url || null);
        setIsPro(profile?.is_pro || false);

        const { data: wallet } = await supabase
          .from('wallets')
          .select('coins')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        setCoins(wallet?.coins || 0);
      }
    };
    fetchUser();
  }, []);

  const handleProUpgrade = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: 'pro', userId: user.id }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      console.error(error);
    }
  };

  const { t } = useLanguage();

  const navItems = [
    { icon: <HomeIcon />, label: t('nav.home'), href: '/' },
    { icon: <Search />, label: t('nav.search'), href: '/search' },
    { icon: <Swords />, label: 'Battle', href: '/battle' },
    { icon: <MessageSquare />, label: 'Messages', href: '/messages' },
    { icon: <Clapperboard />, label: 'Studio & Edit', href: '/studio' },
    { icon: <Settings />, label: t('nav.settings'), href: '/settings' },
  ];

  return (
    <aside className="w-20 lg:w-72 bg-[#09090B] border-r border-white/5 flex flex-col z-40 flex-shrink-0 hidden md:flex relative overflow-hidden">
      {/* Pro Subtle Background Glow */}
      {isPro && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 animate-rainbow" />
      )}
      
      <style jsx global>{`
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
      `}</style>

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
            <Link key={item.href} href={item.href} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 group ${isActive ? 'bg-white/10 text-blue-400 font-black' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}>
              <span className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-blue-400' : ''}`}>{item.icon}</span>
              <span className="hidden lg:block text-[10px] uppercase tracking-[0.2em] font-black">{item.label}</span>
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
                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Pro Profile</p>
              </div>
            </Link>
          </div>
        )}

        <div className="flex gap-2">
          <Link href={user ? '/post' : '/login'} className={`flex-1 py-4 ${isPro ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-blue-600'} rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center shadow-lg hover:scale-[1.02] active:scale-95`}>
            {user ? (isPro ? 'Pro Post' : 'Post') : 'Login'}
          </Link>
          {user && (
            <Link href="/coins" className="w-12 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 flex flex-col items-center justify-center transition-all">
              <Coins className="w-4 h-4 text-yellow-500 mb-0.5" />
              <span className="text-[8px] font-black text-yellow-500">{coins}</span>
            </Link>
          )}
        </div>
        
        {user && !isPro && (
          <button onClick={handleProUpgrade} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-black text-[10px] uppercase tracking-widest text-zinc-400 flex items-center justify-center gap-2 transition-all">
            <Crown className="w-4 h-4" />
            Upgrade to Pro
          </button>
        )}
        
        <div className="pt-2 text-center flex flex-col gap-2">
          <Link href="/legal" className="text-[9px] font-black text-zinc-600 hover:text-cyan-400 uppercase tracking-widest transition-colors">Legal & Pricing</Link>
          <p className="text-[8px] text-zinc-800 font-bold uppercase tracking-widest">© VLYP 2026</p>
        </div>
      </div>
    </aside>
  );
}
