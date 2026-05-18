"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { Save, User, ArrowLeft, Loader2, LogOut, MessageSquare, Eye, Globe, Crown, Check, Gift, Copy, Users } from 'lucide-react';
import { useLanguage } from "../contexts/LanguageContext";
import { useProMonthlyCoins } from "../hooks/useProMonthlyCoins";

function SettingsContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState(""); // @IDになる部分
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [proTrialEndsAt, setProTrialEndsAt] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [copiedRef, setCopiedRef] = useState(false);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Pro月50コイン自動付与
  useProMonthlyCoins();

  // ── ?upgrade=pro 自動 Checkout ───────────────────────────
  // LP「7日間Pro無料トライアル」CTA → signup → settings?upgrade=pro
  // 着地と同時に Stripe Checkout を自動発火させて 1 タップで購入導線を短縮
  useEffect(() => {
    if (loading) return;
    if (isPro) return;
    if (searchParams.get('upgrade') !== 'pro') return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ packId: 'pro' }),
        });
        const data = await res.json();
        if (data.url) {
          // 二重発火防止: URL から ?upgrade=pro を外す
          window.history.replaceState({}, '', '/settings');
          window.location.href = data.url;
        }
      } catch (e) {
        console.error('auto-upgrade checkout error:', e);
      }
    })();
  }, [loading, isPro, searchParams]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      setUser(session.user);

      // プロフィール情報の取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        setUsername(profile.vlyp_id || profile.username || "");
        setDisplayName(profile.display_name || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || "");
        setIsPro(profile.is_pro || false);
        setProTrialEndsAt(profile.pro_trial_ends_at || null);

        // リファラルコード: なければ生成してupsert
        if (profile.referral_code) {
          setReferralCode(profile.referral_code);
        } else {
          const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
          await supabase.from('profiles').update({ referral_code: newCode }).eq('id', session.user.id);
          setReferralCode(newCode);
        }

        // 招待した人数
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('referred_by', session.user.id);
        setReferralCount(count || 0);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // プロフィールの更新（テーブル構造に合わせて調整してください）
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        vlyp_id: username,
        display_name: displayName,
        bio: bio,
        avatar_url: avatarUrl,
        updated_at: new Date()
      });

    setSaving(false);
    if (error) {
      alert("エラーが発生しました: " + error.message);
    } else {
      alert("プロフィールを更新しました！");
    }
  };

  const handleBillingPortal = async () => {
    setBillingPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert('ポータルの取得に失敗しました');
    } finally {
      setBillingPortalLoading(false);
    }
  };

  const handleLogout = async () => {
    if(!confirm("ログアウトしますか？")) return;
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#09090B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto p-6 md:p-12">
          <div className="flex items-center gap-4 mb-10">
            <button onClick={() => router.push('/')} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">{t('settings.title')}</h1>
          </div>

          <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] space-y-8 shadow-2xl backdrop-blur-md">

            {/* Profile Preview & Avatar Upload */}
            <div className="flex items-center gap-5 p-5 bg-white/[0.03] rounded-2xl border border-white/5 relative group">
              <label className="cursor-pointer relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-blue-500/30 group-hover:opacity-50 transition-opacity" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-2xl font-black border-2 border-blue-500/30 group-hover:opacity-50 transition-opacity">
                    {displayName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black uppercase">Edit</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user) return;
                    setSaving(true);
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}.${fileExt}`;
                    const filePath = `${user.id}/${fileName}`;
                    
                    const { error } = await supabase.storage.from('avatars').upload(filePath, file);
                    if (error) {
                      alert("アップロード失敗: " + error.message);
                    } else {
                      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                      setAvatarUrl(data.publicUrl);
                    }
                    setSaving(false);
                  }}
                />
              </label>
              <div className="min-w-0">
                <p className="text-lg font-black italic tracking-tight uppercase truncate">
                  {displayName || 'Player'}
                </p>
                <p className="text-blue-400 text-sm font-bold">@{username || 'username'}</p>
                {bio && (
                  <p className="text-zinc-500 text-xs mt-1 line-clamp-1">{bio}</p>
                )}
              </div>
              {user && (
                <button
                  onClick={() => router.push(`/profile/${user.id}`)}
                  className="ml-auto p-2 hover:bg-white/10 rounded-xl transition-all text-zinc-500 hover:text-blue-400"
                  title="View Profile"
                >
                  <Eye className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Account Settings */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <User className="w-5 h-5 text-blue-500" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">Account Profile</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display Name"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">VLYP ID (@username)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    maxLength={160}
                    rows={3}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                  <p className="text-[9px] text-zinc-600 font-bold mt-1 text-right">{bio.length}/160</p>
                </div>
              </div>
            </div>

            {/* Pro Status & Benefits */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Crown className="w-5 h-5 text-purple-500" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">VLYP Pro Status</h2>
              </div>
              
              <div className={`p-6 rounded-3xl border ${isPro ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/10 border-purple-500/30' : 'bg-white/5 border-white/10'}`}>
                {isPro ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-widest text-white">
                          {proTrialEndsAt && new Date(proTrialEndsAt) > new Date() ? 'Pro Trial Active' : 'Pro Plan Active'}
                        </p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">
                          {proTrialEndsAt && new Date(proTrialEndsAt) > new Date()
                            ? `無料トライアル残り ${Math.max(0, Math.ceil((new Date(proTrialEndsAt).getTime() - Date.now()) / 86400000))} 日`
                            : 'You are supporting the platform!'}
                        </p>
                      </div>
                    </div>
                    {proTrialEndsAt && new Date(proTrialEndsAt) > new Date() && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl text-center">
                        <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">
                          トライアル終了後は自動で月額¥980に移行します
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                        <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-1">AI Narration</p>
                        <p className="text-[10px] font-bold text-zinc-300 uppercase">Unlimited</p>
                      </div>
                      <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                        <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-1">Upload Size</p>
                        <p className="text-[10px] font-bold text-zinc-300 uppercase">Up to 500MB</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">Upgrade to Pro to unlock AI tools,<br/>premium badges, and higher limits.</p>
                    <button 
                      onClick={async () => {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session?.access_token) return;
                        const res = await fetch('/api/checkout', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({ packId: 'pro' }),
                        });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                      }}
                      className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                      7日間無料トライアルを始める
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Referral Program */}
            {referralCode && (
              <div className="space-y-5 p-6 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                  <Gift className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">Referral Program</h2>
                  <span className="ml-auto px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                    +50 Coins Each
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-bold">
                  友達を招待すると、あなたと友達それぞれに <span className="text-emerald-400 font-black">50コイン</span>プレゼント！
                </p>

                {/* Referral Code */}
                <div>
                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5 block">Your Invite Code</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center">
                      <span className="font-black text-emerald-400 tracking-[0.3em] text-sm">{referralCode}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://vlyp.app/login?ref=${referralCode}`);
                        setCopiedRef(true);
                        setTimeout(() => setCopiedRef(false), 2000);
                      }}
                      className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${copiedRef ? 'bg-emerald-500 text-black' : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                    >
                      {copiedRef ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedRef ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 p-3 bg-black/30 rounded-xl border border-white/5">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">招待済み</p>
                      <p className="text-lg font-black text-white">{referralCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-black/30 rounded-xl border border-white/5">
                    <Gift className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">獲得コイン</p>
                      <p className="text-lg font-black text-yellow-400">{referralCount * 50}C</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Language Settings */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Globe className="w-5 h-5 text-blue-500" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">Language / 言語</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLang('JP')}
                  className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                    lang === 'JP' ? 'bg-white/10 border-blue-500/50 text-blue-400' : 'bg-black/50 border-white/10 text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  日本語 (JP)
                </button>
                <button
                  onClick={() => setLang('EN')}
                  className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                    lang === 'EN' ? 'bg-white/10 border-blue-500/50 text-blue-400' : 'bg-black/50 border-white/10 text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  English (EN)
                </button>
                <button
                  onClick={() => setLang('KR')}
                  className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                    lang === 'KR' ? 'bg-white/10 border-blue-500/50 text-blue-400' : 'bg-black/50 border-white/10 text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  한국어 (KR)
                </button>
                <button
                  onClick={() => setLang('CN')}
                  className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                    lang === 'CN' ? 'bg-white/10 border-blue-500/50 text-blue-400' : 'bg-black/50 border-white/10 text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  中文 (CN)
                </button>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.98]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : t('settings.save')}
            </button>
          </div>

          {isPro && (
            <div className="mt-6 text-center">
              <button
                onClick={handleBillingPortal}
                disabled={billingPortalLoading}
                className="text-xs font-bold text-purple-400 flex items-center justify-center gap-2 mx-auto hover:text-purple-300 p-2 transition-colors"
              >
                {billingPortalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                プランを管理・解約する
              </button>
            </div>
          )}

          <div className="mt-4 text-center">
            <button onClick={handleLogout} className="text-xs font-bold text-red-500 flex items-center justify-center gap-2 mx-auto hover:text-red-400 p-2">
              <LogOut className="w-4 h-4" /> {t('nav.logout')}
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
