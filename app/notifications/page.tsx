"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { Bell, Heart, Gift, UserPlus, ArrowLeft, Loader2, Crown, AlertCircle, XCircle } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { broadcastNotifUnread } from '@/lib/dm-events';

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      // 通知とアクションした人のプロフィールを取得
      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!actor_id(display_name, username, avatar_url),
          clip:clips!clip_id(title, video_url, url)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data);
        // 既読にする
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', session.user.id)
          .eq('is_read', false);
        broadcastNotifUnread(0);
      }
      setLoading(false);
    };

    fetchNotifications();
  }, []);

  if (loading) {
    return <div className="h-screen bg-[#09090B] flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-24 md:pb-0 p-6 md:p-12 relative">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-10 sticky top-0 bg-[#09090B]/90 backdrop-blur-xl z-10 py-4 border-b border-white/5">
            <button onClick={() => window.history.back()} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all md:hidden">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3">
              <Bell className="w-6 h-6 text-blue-400" /> {t('nav.notifications')}
            </h1>
          </div>

          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/30 border border-dashed border-white/10 rounded-[2rem]">
                <Bell className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 font-black uppercase text-xs tracking-widest">{t('notif.empty')}</p>
                <p className="text-zinc-600 text-[10px] font-bold mt-2">{t('notif.emptyHint')}</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`flex items-start gap-4 p-5 rounded-3xl border transition-all ${notif.is_read ? 'bg-zinc-900/40 border-white/5 hover:bg-white/5' : 'bg-blue-900/10 border-blue-500/20 shadow-lg shadow-blue-500/5'}`}>
                  {/* Icon */}
                  <div className="relative shrink-0 mt-1">
                    <Link href={`/profile/${notif.actor_id}`}>
                      {notif.actor?.avatar_url ? (
                        <img src={notif.actor.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-zinc-800" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-lg font-black border-2 border-zinc-800">
                          {notif.actor?.display_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </Link>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#09090B]">
                      {notif.type === 'like' && <div className="w-full h-full bg-pink-500 rounded-full flex items-center justify-center"><Heart className="w-3 h-3 text-white fill-white" /></div>}
                      {notif.type === 'gift' && <div className="w-full h-full bg-yellow-500 rounded-full flex items-center justify-center"><Gift className="w-3 h-3 text-white" /></div>}
                      {notif.type === 'follow' && <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center"><UserPlus className="w-3 h-3 text-white" /></div>}
                      {notif.type === 'new_member' && <div className="w-full h-full bg-purple-500 rounded-full flex items-center justify-center"><Crown className="w-3 h-3 text-white" /></div>}
                      {notif.type === 'payment_failed' && <div className="w-full h-full bg-red-500 rounded-full flex items-center justify-center"><AlertCircle className="w-3 h-3 text-white" /></div>}
                      {notif.type === 'subscription_cancelled' && <div className="w-full h-full bg-zinc-600 rounded-full flex items-center justify-center"><XCircle className="w-3 h-3 text-white" /></div>}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      {notif.actor_id && (
                        <Link href={`/profile/${notif.actor_id}`} className="font-bold text-white hover:text-blue-400 transition-colors mr-1">
                          {notif.actor?.display_name || 'Player'}
                        </Link>
                      )}
                      <span className="text-zinc-400 font-medium">
                        {notif.type === 'like' && t('notif.likedClip')}
                        {notif.type === 'gift' && t('notif.giftCoins').replace('{n}', String(notif.amount ?? 0))}
                        {notif.type === 'follow' && t('notif.followedYou')}
                        {notif.type === 'new_member' && 'があなたのファンクラブに参加しました！'}
                        {notif.type === 'payment_failed' && '決済に失敗しました。支払い方法をご確認ください。'}
                        {notif.type === 'subscription_cancelled' && 'サブスクリプションがキャンセルされました。'}
                      </span>
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mt-1">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Clip Thumbnail (if applicable) */}
                  {notif.clip_id && notif.clip && (
                    <Link href={`/?clip=${notif.clip_id}`} className="shrink-0">
                      <div className="w-12 h-16 bg-zinc-800 rounded-lg overflow-hidden border border-white/10 hover:border-blue-500 transition-colors">
                        {(notif.clip.url || notif.clip.video_url)?.match(/youtube\.com|youtu\.be/) ? (
                          <img 
                            src={`https://img.youtube.com/vi/${(notif.clip.url || notif.clip.video_url)?.match(/(?:v=|\/embed\/|\.be\/)([^&?/]{11})/)?.[1]}/mqdefault.jpg`} 
                            className="w-full h-full object-cover opacity-80"
                            alt=""
                          />
                        ) : (
                          <video 
                            src={`${notif.clip.video_url || notif.clip.url}#t=0.1`} 
                            className="w-full h-full object-cover opacity-80"
                            preload="metadata"
                            muted 
                            playsInline 
                          />
                        )}
                      </div>
                    </Link>
                  )}
                </div>
              )))}
            </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
