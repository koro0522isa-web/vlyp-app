"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import { Coins, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { PROFILE_REFRESH_EVENT } from '@/lib/dm-events';

const COIN_PACKS = [
  { id: 'pack_100', amount: 100, price: 150, popular: false },
  { id: 'pack_500', amount: 500, price: 700, popular: true },
  { id: 'pack_1000', amount: 1000, price: 1300, popular: false },
  { id: 'pack_5000', amount: 5000, price: 6000, popular: false },
];

export default function CoinsPage() {
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      setUser(session.user);

      const { data } = await supabase.from('wallets').select('coins').eq('user_id', session.user.id).maybeSingle();
      if (data) setBalance(data.coins);
      
      setIsLoading(false);
    };
    fetchBalance();
  }, []);

  // コイン購入の Checkout 成功後、Sidebar / 本ページの残高を更新
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('success') === 'true') {
      window.dispatchEvent(new CustomEvent(PROFILE_REFRESH_EVENT));
    }
  }, []);

  useEffect(() => {
    const refreshBalance = () => {
      void (async () => {
        if (!user?.id) return;
        const { data } = await supabase.from('wallets').select('coins').eq('user_id', user.id).maybeSingle();
        if (data) setBalance(data.coins);
      })();
    };
    window.addEventListener(PROFILE_REFRESH_EVENT, refreshBalance);
    return () => window.removeEventListener(PROFILE_REFRESH_EVENT, refreshBalance);
  }, [user?.id]);

  const handlePurchase = async (packId: string) => {
    if (!user) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: packId,
          userId: user.id,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error(error);
      alert('決済の準備に失敗しました。しばらくしてから再度お試しください。');
      setIsLoading(false);
    }
  };

  if (isLoading && !user) return <div className="flex h-screen bg-black items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>;

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-20 md:pb-0 p-6 md:p-12 relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <Link href="/" className="p-3 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black italic tracking-tighter text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] uppercase">VLYP COINS</h1>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 mb-12 shadow-2xl shadow-yellow-500/5">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 border-4 border-yellow-300/20">
                <Coins className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-500/70 mb-2">Current Balance</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-6xl font-black italic tracking-tighter text-white">{balance.toLocaleString()}</p>
                  <span className="text-xl font-bold text-yellow-500">C</span>
                </div>
              </div>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">Top up your wallet to support<br/>your favorite creators.</p>
            </div>
          </div>

          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500 mb-6 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-zinc-400" /> Buy Coins
            <div className="h-[1px] flex-1 bg-white/5" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COIN_PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => handlePurchase(pack.id)}
                className={`relative bg-zinc-900 border p-6 rounded-[2rem] flex items-center justify-between group hover:scale-[1.02] active:scale-95 transition-all duration-300 ${
                  pack.popular ? 'border-yellow-500 shadow-[0_0_30px_rgba(250,204,21,0.15)] bg-yellow-500/5' : 'border-white/10 hover:border-white/20'
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[9px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${pack.popular ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'bg-white/5 border-white/10 text-zinc-400'}`}>
                    <Coins className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-black italic tracking-tighter text-white">{pack.amount.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Coins</p>
                  </div>
                </div>
                <div className="bg-blue-600 group-hover:bg-blue-500 text-white font-black text-sm px-6 py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
                  ¥{pack.price.toLocaleString()}
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-[10px] text-zinc-600 font-bold mt-12 uppercase tracking-widest">
            * Payments are securely processed by Stripe.
          </p>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
