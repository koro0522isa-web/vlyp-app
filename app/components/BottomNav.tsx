"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Home as HomeIcon,
  Search,
  Plus,
  Clapperboard,
  User,
  Bell,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function BottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchUser();
  }, []);

  const { t } = useLanguage();

  const navItems = [
    { icon: HomeIcon, label: t('nav.home'), href: '/' },
    { icon: Search, label: t('nav.search'), href: '/search' },
    { icon: Plus, label: t('nav.post'), href: user ? '/post' : '/login', isCenter: true },
    { icon: Bell, label: t('nav.activity'), href: user ? '/notifications' : '/login' },
    { icon: User, label: t('nav.profile'), href: user ? `/profile/${user.id}` : '/login' },
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
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-400'
                  : 'text-zinc-600 active:text-zinc-300'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[8px] font-black uppercase tracking-wider ${
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
