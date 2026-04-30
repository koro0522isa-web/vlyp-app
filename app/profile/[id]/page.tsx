"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import {
  ArrowLeft, Heart, Eye, Video, UserPlus, UserCheck, Gamepad2, Loader2, X, Users, MessageSquare
} from 'lucide-react';

export default function ProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [clips, setClips] = useState<any[]>([]);
  const [stats, setStats] = useState({ views: 0, likes: 0, count: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Followers/Following modal
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<any[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user ?? null);

    // プロフィール取得
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!profileData) { router.push('/'); return; }
    setProfile(profileData);

    // クリップ取得
    const { data: clipsData } = await supabase
      .from('clips')
      .select('*')
      .eq('user_id', id)
      .neq('status', 'banned')
      .order('created_at', { ascending: false });

    if (clipsData) {
      setClips(clipsData);
      setStats({
        views: clipsData.reduce((s, c) => s + (c.views || 0), 0),
        likes: clipsData.reduce((s, c) => s + (c.likes || 0), 0),
        count: clipsData.length
      });
    }

    // フォロワー数
    const { count: fCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', id);
    setFollowersCount(fCount || 0);

    // フォロー中数
    const { count: ingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', id);
    setFollowingCount(ingCount || 0);

    // 自分がフォローしているか
    if (session?.user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', session.user.id)
        .eq('following_id', id)
        .maybeSingle();
      setIsFollowing(!!followData);
    }

    setIsLoading(false);
  };

  const handleFollow = async () => {
    if (!currentUser) return alert('ログインが必要です');
    if (currentUser.id === id) return;

    if (isFollowing) {
      await supabase.from('follows').delete()
        .match({ follower_id: currentUser.id, following_id: id });
      setIsFollowing(false);
      setFollowersCount(p => p - 1);
    } else {
      await supabase.from('follows').insert(
        { follower_id: currentUser.id, following_id: id }
      );
      // ★追加: フォロー通知を送る
      await supabase.from('notifications').insert({
        user_id: id,
        actor_id: currentUser.id,
        type: 'follow'
      });
      setIsFollowing(true);
      setFollowersCount(p => p + 1);
    }
  };

  const openFollowList = async (type: 'followers' | 'following') => {
    setShowFollowModal(type);
    setLoadingFollowList(true);

    try {
      if (type === 'followers') {
        const { data } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', id);

        if (data && data.length > 0) {
          const ids = data.map(d => d.follower_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, username, vlyp_id')
            .in('id', ids);
          setFollowList(profiles || []);
        } else {
          setFollowList([]);
        }
      } else {
        const { data } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', id);

        if (data && data.length > 0) {
          const ids = data.map(d => d.following_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, username, vlyp_id')
            .in('id', ids);
          setFollowList(profiles || []);
        } else {
          setFollowList([]);
        }
      }
    } catch (e) {
      console.error(e);
      setFollowList([]);
    }

    setLoadingFollowList(false);
  };

  const getYouTubeId = (url: string) => {
    const match = url?.match(/(?:v=|\/embed\/|\.be\/)([^&?/]{11})/);
    return match ? match[1] : null;
  };

  if (isLoading) return (
    <div className="h-screen bg-[#09090B] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-20 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#09090B]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-black uppercase tracking-widest text-sm">Profile</h1>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-10">
          {/* Profile Card */}
          <div className="bg-gradient-to-br from-blue-600/10 to-zinc-900 border border-white/10 rounded-[3rem] p-10 mb-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative">
              {/* Avatar */}
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-4xl font-black border-4 border-blue-500/30 shadow-2xl shadow-blue-500/20 flex-shrink-0 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profile?.display_name?.charAt(0)?.toUpperCase() || '?'
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-1">
                  {profile?.display_name || 'Player'}
                </h2>
                <p className="text-blue-400 font-bold text-sm mb-3">@{profile?.vlyp_id || profile?.username || 'unknown'}</p>

                {/* Bio */}
                {profile?.bio && (
                  <p className="text-zinc-400 text-sm leading-relaxed mb-6 max-w-md">
                    {profile.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex gap-8 justify-center md:justify-start mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-black">{stats.count}</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Clips</p>
                  </div>
                  <button onClick={() => openFollowList('followers')} className="text-center hover:opacity-70 transition-opacity">
                    <p className="text-2xl font-black">{followersCount}</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Followers</p>
                  </button>
                  <button onClick={() => openFollowList('following')} className="text-center hover:opacity-70 transition-opacity">
                    <p className="text-2xl font-black">{followingCount}</p>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Following</p>
                  </button>
                </div>

                <div className="flex gap-3 justify-center md:justify-start flex-wrap">
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                    <Eye className="w-3 h-3 text-blue-400" />
                    <span className="text-xs font-black">{stats.views.toLocaleString()} Views</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                    <Heart className="w-3 h-3 text-pink-400" />
                    <span className="text-xs font-black">{stats.likes.toLocaleString()} Likes</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center md:justify-start">
                {currentUser && currentUser.id !== id && (
                  <>
                    <button
                      onClick={handleFollow}
                      className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                        isFollowing
                          ? 'bg-white/10 border border-white/20 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400'
                          : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30'
                      }`}
                    >
                      {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
                    </button>
                    
                    <Link
                      href={`/messages?u=${id}`}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-black text-xs uppercase tracking-widest transition-all"
                    >
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      Message
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Clips Grid */}
          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-6 flex items-center gap-3">
            <Video className="w-4 h-4" /> Clips
            <div className="h-[1px] flex-1 bg-white/5" />
          </h3>

          {clips.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 font-black uppercase text-xs tracking-widest">No clips yet</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {clips.map(clip => {
                const vid = getYouTubeId(clip.url || clip.video_url);
                return (
                  <Link 
                    key={clip.id} 
                    href={`/?clip=${clip.id}`}
                    className="group relative aspect-[9/16] bg-zinc-900 rounded-3xl overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer"
                  >
                    {vid ? (
                      <img
                        src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                        alt={clip.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                      />
                    ) : (clip.video_url || clip.url) ? (
                      <video
                        src={`${clip.video_url || clip.url}#t=0.1`}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                        preload="metadata"
                        muted
                        playsInline
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {clip.game_title && (
                        <div className="flex items-center gap-1 mb-2">
                          <Gamepad2 className="w-3 h-3 text-blue-400" />
                          <span className="text-[9px] font-black text-blue-300 uppercase">{clip.game_title}</span>
                        </div>
                      )}
                      <p className="text-xs font-black uppercase line-clamp-2 italic">{clip.title}</p>
                      <div className="flex gap-3 mt-2">
                        <span className="text-[9px] text-zinc-400 flex items-center gap-1"><Eye className="w-2.5 h-2.5" />{clip.views || 0}</span>
                        <span className="text-[9px] text-zinc-400 flex items-center gap-1"><Heart className="w-2.5 h-2.5" />{clip.likes || 0}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Follow List Modal */}
      {showFollowModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowFollowModal(null)}>
          <div
            className="bg-[#0f0f11] border border-white/10 rounded-[2.5rem] w-full max-w-md mx-4 max-h-[70vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-xs text-blue-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {showFollowModal === 'followers' ? 'Followers' : 'Following'}
              </h3>
              <button onClick={() => setShowFollowModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {loadingFollowList ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : followList.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 font-bold text-xs uppercase tracking-widest">
                  No users
                </div>
              ) : (
                <div className="space-y-2">
                  {followList.map((user) => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.id}`}
                      onClick={() => setShowFollowModal(null)}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group"
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-sm font-black border border-blue-500/30 flex-shrink-0 group-hover:scale-110 transition-transform">
                        {user.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black truncate group-hover:text-blue-400 transition-colors">
                          {user.display_name || 'Player'}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-bold">
                          @{user.vlyp_id || user.username || 'unknown'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}