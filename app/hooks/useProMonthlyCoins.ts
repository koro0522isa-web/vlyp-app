"use client";

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Pro会員に月50コインを自動付与するフック。
 * profiles.pro_coins_claimed_month (TEXT, e.g. "2026-05") と比較して
 * 未付与なら wallet_coins += 50 して更新する。
 */
export function useProMonthlyCoins() {
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_pro, wallet_coins, pro_coins_claimed_month')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!profile?.is_pro) return;

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        if (profile.pro_coins_claimed_month === currentMonth) return;

        // Grant 50 coins for this month
        const newCoins = (profile.wallet_coins || 0) + 50;
        await supabase
          .from('profiles')
          .update({
            wallet_coins: newCoins,
            pro_coins_claimed_month: currentMonth,
          })
          .eq('id', session.user.id);

        console.log('[VLYP] Pro monthly coins granted: +50 (total:', newCoins, ')');
      } catch (err) {
        console.error('[VLYP] Pro monthly coins error:', err);
      }
    })();
  }, []);
}
