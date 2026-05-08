"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Play, Square, Settings, Users, Eye, DollarSign, 
  Activity, Wifi, WifiOff, CheckCircle,
  Monitor, Video
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Stream {
  id: number;
  title: string;
  status: 'starting' | 'live' | 'partial' | 'ended' | 'failed';
  platforms: string[];
  viewer_count: number;
  started_at: string;
  vlyp_score: number;
}

interface PlatformStatus {
  platform: string;
  connected: boolean;
  viewers?: number;
  status?: 'live' | 'offline' | 'error';
}

export default function StreamingDashboard() {
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([
    { platform: 'youtube', connected: false },
    { platform: 'twitch', connected: false },
    { platform: 'kick', connected: false }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSettings, setStreamSettings] = useState({
    title: '',
    description: '',
    category: 'Gaming',
    tags: ['gaming', 'vlyp'],
    language: 'en',
    isMature: false,
    delaySeconds: 0
  });

  const fetchStreamStatus = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: stream } = await supabase
      .from('streams')
      .select('*')
      .eq('user_id', session.user.id)
      .in('status', ['starting', 'live', 'partial'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (stream) {
      setCurrentStream(stream);
      setIsStreaming(true);
    }
  }, []);

  const checkPlatformConnections = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('youtube_connected, twitch_connected, kick_connected')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      setPlatformStatuses([
        { platform: 'youtube', connected: profile.youtube_connected },
        { platform: 'twitch', connected: profile.twitch_connected },
        { platform: 'kick', connected: profile.kick_connected }
      ]);
    }
  }, []);

  useEffect(() => {
    fetchStreamStatus();
    checkPlatformConnections();
    
    // Subscribe to stream updates
    const channel = supabase
      .channel('stream-updates')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'streams' },
        (payload: any) => {
          if (payload.new) {
            setCurrentStream(payload.new as Stream);
            setIsStreaming(payload.new.status === 'live' || payload.new.status === 'partial');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStreamStatus, checkPlatformConnections]);

  const startStreaming = async () => {
    try {
      const selectedPlatforms = platformStatuses
        .filter(p => p.connected)
        .map(p => p.platform);

      if (selectedPlatforms.length === 0) {
        alert('Please connect at least one platform first');
        return;
      }

      const response = await fetch('/api/streaming/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          ...streamSettings
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentStream(result.stream);
        setIsStreaming(true);
      } else {
        alert(`Failed to start streaming: ${result.error}`);
      }
    } catch (error) {
      console.error('Streaming error:', error);
      alert('Failed to start streaming');
    }
  };

  const stopStreaming = async () => {
    if (!currentStream) return;

    try {
      const response = await fetch('/api/streaming/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId: currentStream.id })
      });

      if (response.ok) {
        setIsStreaming(false);
        setCurrentStream(null);
      }
    } catch (error) {
      console.error('Stop streaming error:', error);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return <Video className="w-5 h-5 text-red-500" />;
      case 'twitch': return <Video className="w-5 h-5 text-purple-500" />;
      case 'kick': return <Monitor className="w-5 h-5 text-green-500" />;
      default: return <Video className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stream Status Card */}
      <div className="bg-[#09090B] border border-white/10 rounded-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Stream Control</h2>
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 font-black text-sm uppercase">LIVE</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-gray-500 rounded-full" />
                <span className="text-gray-500 font-black text-sm uppercase">OFFLINE</span>
              </>
            )}
          </div>
        </div>

        {/* Current Stream Info */}
        {currentStream && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 bg-white/5 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">{currentStream.title}</h3>
                <p className="text-zinc-400 text-sm mt-1">
                  Started {new Date(currentStream.started_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-2xl font-black">
                  <Eye className="w-6 h-6" />
                  {currentStream.viewer_count.toLocaleString()}
                </div>
                <p className="text-zinc-400 text-sm">Viewers</p>
              </div>
            </div>

            {/* Platform Status */}
            <div className="grid grid-cols-3 gap-4">
              {currentStream.platforms.map((platform) => (
                <div key={platform} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl">
                  {getPlatformIcon(platform)}
                  <span className="text-sm font-black uppercase">{platform}</span>
                  <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stream Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Stream Title</label>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-blue-500/50 outline-none font-bold"
                value={streamSettings.title}
                onChange={(e) => setStreamSettings({ ...streamSettings, title: e.target.value })}
                placeholder="Enter your stream title..."
                disabled={isStreaming}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Category</label>
              <select
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-blue-500/50 outline-none font-bold"
                value={streamSettings.category}
                onChange={(e) => setStreamSettings({ ...streamSettings, category: e.target.value })}
                disabled={isStreaming}
              >
                <option value="Gaming">Gaming</option>
                <option value="Just Chatting">Just Chatting</option>
                <option value="Music">Music</option>
                <option value="Art">Art</option>
                <option value="Sports">Sports</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Description</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-blue-500/50 outline-none font-bold min-h-[100px]"
                value={streamSettings.description}
                onChange={(e) => setStreamSettings({ ...streamSettings, description: e.target.value })}
                placeholder="Tell your viewers about your stream..."
                disabled={isStreaming}
              />
            </div>

            {/* Platform Connections */}
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Connected Platforms</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {platformStatuses.map((platform) => (
                  <div
                    key={platform.platform}
                    className={`p-3 rounded-xl border flex items-center gap-2 ${
                      platform.connected
                        ? 'bg-green-500/10 border-green-500/30 text-green-500'
                        : 'bg-white/5 border-white/10 text-zinc-500'
                    }`}
                  >
                    {platform.connected ? (
                      <Wifi className="w-4 h-4" />
                    ) : (
                      <WifiOff className="w-4 h-4" />
                    )}
                    <span className="text-xs font-black uppercase">{platform.platform}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          {!isStreaming ? (
            <button
              onClick={startStreaming}
              disabled={!streamSettings.title || platformStatuses.filter(p => p.connected).length === 0}
              className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              Go Live
            </button>
          ) : (
            <button
              onClick={stopStreaming}
              className="flex-1 py-4 bg-gray-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-500 transition-all"
            >
              <Square className="w-5 h-5" />
              End Stream
            </button>
          )}

          <button className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stream Stats */}
      {isStreaming && currentStream && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#09090B] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-5 h-5 text-blue-500" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Viewers</span>
            </div>
            <div className="text-2xl font-black">{currentStream.viewer_count.toLocaleString()}</div>
          </div>

          <div className="bg-[#09090B] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">VLYP Score</span>
            </div>
            <div className="text-2xl font-black">{Math.round(currentStream.vlyp_score)}</div>
          </div>

          <div className="bg-[#09090B] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-purple-500" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Platforms</span>
            </div>
            <div className="text-2xl font-black">{currentStream.platforms.length}</div>
          </div>

          <div className="bg-[#09090B] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Earnings</span>
            </div>
            <div className="text-2xl font-black">$0.00</div>
          </div>
        </div>
      )}
    </div>
  );
}
