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
  ShieldCheck,
  User,
  MessageSquare
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [vlypId, setVlypId] = useState<string>('Player');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username, vlyp_id')
          .eq('id', currentUser.id)
          .maybeSingle();
        setVlypId(profile?.display_name || profile?.username || profile?.vlyp_id || 'Player');
      }
    };
    fetchUser();
  }, []);

  const { t } = useLanguage();

    { icon: <HomeIcon />, label: t('nav.home'), href: '/' },
    { icon: <Search />, label: t('nav.search'), href: '/search' },
    { icon: <MessageSquare />, label: 'Messages', href: '/messages' },
    { icon: <Clapperboard />, label: t('nav.studio'), href: '/studio' },
    { icon: <Settings />, label: t('nav.settings'), href: '/settings' },
  ];

  return (
    <aside className="w-20 lg:w-72 bg-[#09090B] border-r border-white/5 flex flex-col z-40 flex-shrink-0 hidden md:flex">
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
            <Link key={item.href} href={item.href} className={`flex items-center gap-5 p-4 rounded-2xl cursor-pointer transition-all duration-200 group ${isActive ? 'bg-blue-600/10 text-blue-400 font-black' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}>
              <span className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-blue-400' : ''}`}>{item.icon}</span>
              <span className="hidden lg:block text-[10px] uppercase tracking-widest font-black">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 lg:p-6 border-t border-white/5 space-y-4">
        {user && (
          <Link href={`/profile/${user.id}`} className="hidden lg:flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-xs font-black flex-shrink-0 border border-blue-500/30">{vlypId.charAt(0).toUpperCase()}</div>
            <div className="min-w-0">
              <p className="text-xs font-black text-zinc-200 truncate group-hover:text-blue-400 transition-colors">@{vlypId}</p>
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">View Profile</p>
            </div>
          </Link>
        )}
        <Link href={user ? '/post' : '/login'} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]">
          {user ? t('nav.post') : 'Login'}
        </Link>
        <div className="pt-2 text-center flex flex-col gap-3">
          <Link href="/legal" className="text-xs font-black text-zinc-400 hover:text-cyan-400 uppercase tracking-widest transition-colors">Legal & Pricing</Link>
          <div className="flex justify-center gap-4">
            <Link href="/terms" className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">Terms</Link>
            <Link href="/privacy" className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">Privacy</Link>
          </div>
          <a href="mailto:vlypgameclip@gmail.com" className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-colors mt-2">Support / vlypgameclip@gmail.com</a>
        </div>
      </div>
    </aside>
  );
}
