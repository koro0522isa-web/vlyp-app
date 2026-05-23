"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, DollarSign, Film } from 'lucide-react';

/**
 * Unified sub-navigation for all /studio/* pages.
 * Drop this near the top of each studio page below the page header.
 */
const TABS = [
  { href: '/studio', label: 'Overview', icon: Home, exact: true },
  { href: '/studio/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/studio/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/studio/content', label: 'Content', icon: Film },
];

export default function StudioTabs() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 border-b border-white/5 mb-8 overflow-x-auto no-scrollbar">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative inline-flex items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${
              active
                ? 'text-blue-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
            {active && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
