"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { Crown, Check, Loader2, ArrowLeft, Star, Zap, Shield, Users, Gift, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MembershipPage() {
  const params = useParams();
  const username = params?.username as string;

  const [creator, setCreator] = useState<any>(null);
  const [tier, setTier] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!username) return;
    fetchData();
  }, [username]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user ?? null);

    // クリエイター情報取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();
    if (!profile) { setIsLoading(false); return; }
    setCreator(profile);

    // ファンクラブティア取得
    const { data: tierData } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('creator_id', profile.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    setTier(tierData);

    // メンバー数
    const { count } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', profile.id)
      .eq('status', 'active');
    setMemberCount(count ?? 0);

    // 自分がメンバーかチェック
    if (session?.user) {
      const { data: myMembership } = await supabase
        .from('memberships')
        .select('id, status')
        .eq('user_id', session.user.id)
        .eq('creator_id', profile.id)
        .maybeSingle();
      setIsMember(myMembership?.status === 'active');
    }

    setIsLoading(false);
  };

  const handleJoin = async () => {
    if (!currentUser || !tier) return;
    setIsJoining(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const res = await fetch('/api/membership/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tier_id: tier.id, creator_username: username }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Failed');
    } catch (e: any) {
      alert('エラーが発生しました: ' + e.message);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#09090B] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="flex h-screen bg-[#09090B] items-center justify-center text-zinc-400">
        <div className="text-center">
          <p className="text-xl font-black mb-2">クリエイターが見つかりません</p>
          <Link href="/" className="text-blue-400 text-sm">ホームへ</Link>
        </div>
      </div>
    );
  }

  const DEFAULT_BENEFITS = [
    'メンバー専用バッジ',
    '限定動画・コンテンツへのアクセス',
    'コメントが目立つ（ネオン発光）',
    'ギフト手数料 10% 優遇',
    'Discord限定ロール',
  ];

  const benefits = tier?.benefits ?? DEFAULT_BENEFITS;
  const priceYen = tier?.price_yen ?? 500;
  const tierName = tier?.name ?? 'Fan';

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* ヒーローセクション */}
        <div className="relative min-h-[300px] bg-gradient-to-b from-purple-900/40 via-pink-900/20 to-[#09090B] flex flex-col items-center justify-end pb-8 pt-16 px-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent" />

          <Link href={`/profile/${username}`} className="absolute top-4 left-4 flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-bold">
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* クリエイターアバター */}
          <div className="relative mb-4 z-10">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-500/50 shadow-2xl shadow-purple-500/30">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-black text-white">
                  {(creator.display_name || creator.username || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="w-4 h-4 text-black" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-white z-10 text-center">
            {creator.display_name || creator.username}のファンクラブ
          </h1>
          <p className="text-zinc-400 text-sm z-10 mt-1 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {memberCount.toLocaleString()} メンバー
          </p>
        </div>

        <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
          {/* 加入済みバッジ */}
          {isMember && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/40 rounded-2xl p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="font-black text-white">メンバーです ✓</p>
                <p className="text-sm text-purple-300">すべての特典が有効です</p>
              </div>
            </motion.div>
          )}

          {/* ティアカード */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-br from-purple-900/50 to-pink-900/30 border border-purple-500/30 rounded-3xl overflow-hidden"
          >
            {/* ティアヘッダー */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-yellow-300" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-200">FAN CLUB</span>
                </div>
                <h2 className="text-xl font-black text-white">{tierName}</h2>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-white">¥{priceYen.toLocaleString()}</p>
                <p className="text-[10px] text-purple-200 font-bold">/ 月</p>
              </div>
            </div>

            {/* 特典リスト */}
            <div className="p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">特典</p>
              <ul className="space-y-3">
                {benefits.map((b: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="w-5 h-5 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-purple-400" />
                    </div>
                    {b}
                  </li>
                ))}
              </ul>

              {/* 加入ボタン */}
              {!isMember ? (
                <button
                  onClick={handleJoin}
                  disabled={isJoining || !currentUser}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isJoining ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : !currentUser ? (
                    <>
                      <Lock className="w-4 h-4" />
                      ログインして加入
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      ¥{priceYen.toLocaleString()}/月で加入する
                    </>
                  )}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full mt-6 py-4 bg-zinc-800 text-zinc-500 font-black text-sm uppercase tracking-widest rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  加入済み
                </button>
              )}

              {!currentUser && (
                <Link href="/login" className="block text-center mt-3 text-[11px] text-purple-400 font-bold hover:text-purple-300">
                  アカウントをお持ちの方はこちら
                </Link>
              )}
            </div>
          </motion.div>

          {/* 手数料説明 */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-[11px] text-zinc-500 leading-relaxed space-y-1">
            <p className="font-black text-zinc-400 mb-2">💡 収益の仕組み</p>
            <p>• 月額料金の <strong className="text-white">70%</strong> がクリエイターに入ります</p>
            <p>• VLYPが <strong className="text-white">30%</strong> の手数料を受け取ります</p>
            <p>• いつでもキャンセル可能です</p>
            <p>• 支払いはStripeで安全に処理されます</p>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
