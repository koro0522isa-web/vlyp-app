"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Home as HomeIcon,
  Search,
  Plus,
  User,
  MessageSquare,
  Trophy,
  Wand2,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { DM_UNREAD_EVENT } from '@/lib/dm-events';

export default function BottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [dmUnread, setDmUnread] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const session = user ? { user } : null;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const { count } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', u.id)
          .eq('is_read', false);
        setDmUnread(count ?? 0);
      } else {
        setDmUnread(0);
      }
    };
    fetchUser();

    const onDmUnread = (e: Event) => {
      const t = (e as CustomEvent<{ total: number }>).detail?.total;
      if (typeof t === 'number') setDmUnread(t);
    };
    window.addEventListener(DM_UNREAD_EVENT, onDmUnread);
    return () => window.removeEventListener(DM_UNREAD_EVENT, onDmUnread);
  }, []);

  const { t } = useLanguage();

  const navItems = [
    { icon: HomeIcon, label: t('nav.home'), href: '/', badge: 0 },
    { icon: Search, label: t('nav.search'), href: '/search', badge: 0 },
    { icon: Plus, label: t('nav.post'), href: user ? '/post' : '/login', isCenter: true, badge: 0 },
    { icon: Trophy, label: 'Rank', href: '/leaderboard', badge: 0 },
    { icon: Wand2, label: 'AI Edit', href: '/edit', badge: 0 },
    { icon: MessageSquare, label: 'DM', href: '/messages', badge: dmUnread },
    { icon: User, label: t('nav.profile'), href: user ? `/profile/${user.id}` : '/login', badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-[#09090B]/90 backdrop-blur-xl border-t border-white/10" />

      <div className="relative flex items-center justify-around px-2 py-2 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

          if (item.isCenter) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="relative -mt-6"
              >
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/40 hover:bg-blue-500 active:scale-90 transition-all">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-400'
                  : 'text-zinc-600 active:text-zinc-300'
              }`}
            >
              <span className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
              <span className={`text-[7px] font-black uppercase tracking-wider ${
                isActive ? 'text-blue-400' : 'text-zinc-600'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 bg-blue-400 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
