"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  ArrowLeft,
  Loader2,
  Info,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Users,
  Eye,
  Gift,
  Crown,
  Zap,
  Trophy
} from 'lucide-react';
import Link from 'next/link';

export default function RevenueDashboard() {
  const [earnings, setEarnings] = useState<any>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [giftEarnings, setGiftEarnings] = useState<number>(0);
  const [rpmEarnings, setRpmEarnings] = useState<number>(0);
  const [currentMonthRpm, setCurrentMonthRpm] = useState<number | null>(null);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login';
      return;
    }
    setUser(session.user);

    // 1. 収益データの取得
    const [{ data: earnData }, { data: profileData }] = await Promise.all([
      supabase.from('creator_earnings').select('*').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('profiles').select('is_pro, is_monetized').eq('id', session.user.id).maybeSingle()
    ]);
    setEarnings(earnData);
    setProfile(profileData);

    // 2. 収益化条件のチェック
    const { data: eligData } = await supabase.rpc('check_monetization_eligibility', { p_user_id: session.user.id });
    if (eligData && eligData[0]) {
      setEligibility(eligData[0]);
    }

    // 3. ギフト収益の集計（今月）
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: txData } = await supabase
      .from('transactions')
      .select('amount, platform_fee')
      .eq('receiver_id', session.user.id)
      .eq('type', 'gift')
      .gte('created_at', thisMonthStart);
    if (txData) {
      const giftTotal = txData.reduce((sum, tx) => sum + ((tx.amount || 0) - (tx.platform_fee || 0)), 0);
      setGiftEarnings(giftTotal);
    }

    // 4. 今月のRPMスナップショット取得
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: poolData } = await supabase
      .from('monthly_revenue_pools')
      .select('pool_amount, total_qualifying_views, status')
      .eq('month', currentMonth)
      .maybeSingle();
    if (poolData && poolData.total_qualifying_views > 0) {
      const rpm = (poolData.pool_amount / poolData.total_qualifying_views) * 1000;
      setCurrentMonthRpm(Math.round(rpm * 100) / 100);
    }

    // 5. RPM収益（今月のスナップショットから）
    const { data: snapshotData } = await supabase
      .from('monthly_view_snapshots')
      .select('revenue_allocated')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (snapshotData) setRpmEarnings(snapshotData.revenue_allocated || 0);

    setIsLoading(false);
  };

  const handleWithdraw = async () => {
    if (!earnings || earnings.available_balance < 1000) {
      alert("出金可能残高が1,000円に達していません。");
      return;
    }

    const bankInfo = prompt("振込先の銀行情報を入力してください（銀行名、支店名、口座種別、口座番号、名義）:");
    if (!bankInfo) return;

    setIsRequesting(true);
    const { data, error } = await supabase.rpc('request_withdrawal', {
      p_user_id: user.id,
      p_amount: Math.floor(earnings.available_balance),
      p_bank_info: bankInfo
    });

    if (error) {
      alert("申請に失敗しました: " + error.message);
    } else {
      alert("出金申請を受け付けました。運営による送金をお待ちください。");
      fetchRevenueData();
    }
    setIsRequesting(false);
  };

  if (isLoading) return <div className="flex h-screen bg-black items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>;

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-20 md:pb-0 p-6 md:p-12 relative">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-12">
            <Link href="/studio" className="p-3 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Revenue Dashboard</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Balance Card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 p-10 rounded-[3rem] shadow-2xl shadow-blue-600/20 relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-200/70 mb-4">Available Balance</p>
                <div className="flex items-baseline gap-2 mb-10">
                  <span className="text-2xl font-black text-blue-200">¥</span>
                  <h2 className="text-7xl font-black italic tracking-tighter text-white">
                    {earnings?.available_balance?.toLocaleString() || '0'}
                  </h2>
                </div>
                <button 
                  onClick={handleWithdraw}
                  disabled={isRequesting || !earnings || earnings.available_balance < 1000}
                  className="bg-white text-blue-600 px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isRequesting ? <Loader2 className="animate-spin w-4 h-4" /> : "Request Withdrawal"}
                </button>
              </div>
              <DollarSign className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 -rotate-12 group-hover:scale-110 transition-transform duration-700" />
            </div>

            {/* Stats Card */}
            <div className="bg-zinc-900 border border-white/5 p-10 rounded-[3rem] flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">Total Career Earnings</p>
                <p className="text-4xl font-black italic tracking-tighter text-zinc-300">¥{earnings?.total_earned?.toLocaleString() || '0'}</p>
              </div>
              <div className="pt-6 border-t border-white/5 mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  <span>Gift Fee</span>
                  <span className={profile?.is_pro ? 'text-purple-400' : 'text-white'}>{profile?.is_pro ? '10% (Pro)' : '30%'}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  <span>RPM Pool</span>
                  <span className="text-white">50% of Pro revenue</span>
                </div>
              </div>
            </div>
          </div>

          {/* 収益内訳カード */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {/* RPM収益 */}
            <div className="bg-zinc-900 border border-white/5 p-6 rounded-[2rem]">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-blue-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Dynamic RPM</p>
              </div>
              <p className="text-3xl font-black italic tracking-tighter text-white">¥{rpmEarnings.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-zinc-600 mt-1">
                {currentMonthRpm !== null ? `今月のRPM: ¥${currentMonthRpm}/1000再生` : '今月分配前'}
              </p>
            </div>

            {/* ギフト収益 */}
            <div className="bg-zinc-900 border border-white/5 p-6 rounded-[2rem]">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-4 h-4 text-yellow-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Gift Earnings</p>
              </div>
              <p className="text-3xl font-black italic tracking-tighter text-white">¥{giftEarnings.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-zinc-600 mt-1">
                手数料差引後 ({profile?.is_pro ? '10%' : '30%'}手数料)
              </p>
            </div>

            {/* Pro手数料アップセル or プロバッジ */}
            {!profile?.is_pro ? (
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/30 border border-purple-500/30 p-6 rounded-[2rem] relative overflow-hidden">
                <Crown className="absolute -right-4 -top-4 w-20 h-20 text-purple-500/20" />
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">Pro特典</p>
                  <p className="text-sm font-black text-white mb-1">ギフト手数料 30% → 10%</p>
                  <p className="text-[10px] font-bold text-purple-300/70 mb-4">Proになると3倍稼げます</p>
                  <Link
                    href="/post?upgrade=pro"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
                  >
                    <Crown className="w-3 h-3" /> Upgrade Pro
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/20 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center">
                <Crown className="w-10 h-10 text-purple-400 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">Pro Active</p>
                <p className="text-xs font-bold text-purple-300/70">ギフト手数料 10%<br/>スケジュール投稿 有効</p>
              </div>
            )}
          </div>

          {/* Monetization Progress */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-emerald-500" /> Monetization Program
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-1">Unlock ad revenue and tips by growing your channel.</p>
              </div>
              {eligibility?.eligible ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-white/5 text-zinc-500 px-4 py-2 rounded-full border border-white/10">
                  <Lock className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Requirement 1: Followers */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <Users className="w-4 h-4" /> Followers
                  </div>
                  <span className="text-sm font-black italic">{eligibility?.current_followers || 0} / {eligibility?.needed_followers || 100}</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000" 
                    style={{ width: `${Math.min(100, ((eligibility?.current_followers || 0) / (eligibility?.needed_followers || 100)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Requirement 2: Views */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <Eye className="w-4 h-4" /> Total Views
                  </div>
                  <span className="text-sm font-black italic">{eligibility?.current_views || 0} / {eligibility?.needed_views || 1000}</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000" 
                    style={{ width: `${Math.min(100, ((eligibility?.current_views || 0) / (eligibility?.needed_views || 1000)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] font-medium text-blue-200/70 leading-relaxed space-y-2">
                <p>
                  収益化が有効になると、<span className="text-white font-bold italic">ダイナミックRPM</span>で月間視聴数に応じた収益が得られます。毎月1日にPro課金収益の50%がクリエイタープールに入り、視聴数シェアで分配されます。
                </p>
                <p>
                  ギフト収益はリアルタイムで反映されます。<span className={profile?.is_pro ? 'text-purple-400 font-bold' : 'text-white'}>Pro会員は手数料10%</span>（通常30%）で3倍有利です。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
