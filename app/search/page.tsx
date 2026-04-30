"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import {
  Search as SearchIcon,
  Gamepad2,
  Eye,
  Heart,
  Loader2,
  TrendingUp,
  X,
  Sparkles,
  Users,
} from 'lucide-react';

const POPULAR_GAMES = [
  "ALL",
  "VALORANT",
  "Apex Legends",
  "League of Legends",
  "Street Fighter 6",
  "Overwatch 2",
  "Minecraft",
  "Fortnite",
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [trendingClips, setTrendingClips] = useState<any[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState('ALL');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch trending data on load
  useEffect(() => {
    const fetchTrending = async () => {
      // Trending clips
      const { data: clips } = await supabase
        .from('clips')
        .select('*')
        .neq('status', 'banned')
        .order('views', { ascending: false })
        .limit(8);

      if (clips) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, username');
        const clipsWithProfiles = clips.map(clip => ({
          ...clip,
          profiles: profiles?.find(p => p.id === clip.user_id) || { display_name: 'Player' }
        }));
        setTrendingClips(clipsWithProfiles);
      }

      // Trending creators (users with most clips)
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, display_name, username, vlyp_id')
        .limit(6);

      if (creatorsData) {
        // Get clip counts for each creator
        const creatorsWithStats = await Promise.all(
          creatorsData.map(async (creator) => {
            const { count } = await supabase
              .from('clips')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', creator.id)
              .neq('status', 'banned');
            return { ...creator, clipCount: count || 0 };
          })
        );
        setTrendingCreators(creatorsWithStats.filter(c => c.clipCount > 0).sort((a, b) => b.clipCount - a.clipCount));
      }
    };
    fetchTrending();
  }, []);

  const performSearch = useCallback(async (searchQuery: string, game: string) => {
    setIsSearching(true);
    setHasSearched(true);

    let queryBuilder = supabase
      .from('clips')
      .select('*')
      .neq('status', 'banned')
      .order('created_at', { ascending: false })
      .limit(50);

    if (searchQuery.trim()) {
      // Sanitize input: escape special SQL pattern characters
      const sanitized = searchQuery.replace(/[%_\\]/g, '\\$&');
      queryBuilder = queryBuilder.or(
        `title.ilike.%${sanitized}%,game_title.ilike.%${sanitized}%`
      );
    }

    if (game !== 'ALL') {
      queryBuilder = queryBuilder.eq('game_title', game);
    }

    const { data: clips } = await queryBuilder;

    if (clips) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username');
      const clipsWithProfiles = clips.map(clip => ({
        ...clip,
        profiles: profiles?.find(p => p.id === clip.user_id) || { display_name: 'Player' }
      }));
      setResults(clipsWithProfiles);
    } else {
      setResults([]);
    }

    setIsSearching(false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() && selectedGame === 'ALL') {
      setHasSearched(false);
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query, selectedGame);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedGame, performSearch]);

  const getYouTubeId = (url: string) => {
    const match = url?.match(/(?:v=|\/embed\/|\.be\/)([^&?/]{11})/);
    return match ? match[1] : null;
  };

  const clearSearch = () => {
    setQuery('');
    setSelectedGame('ALL');
    setHasSearched(false);
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-20 md:pb-0">
        {/* Search Header */}
        <div className="sticky top-0 z-20 bg-[#09090B]/95 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="relative">
              <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search clips, games, creators..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-12 text-sm font-medium focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all placeholder:text-zinc-600"
                id="search-input"
              />
              {(query || selectedGame !== 'ALL') && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              )}
            </div>

            {/* Game filter tags */}
            <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
              {POPULAR_GAMES.map((game) => (
                <button
                  key={game}
                  onClick={() => setSelectedGame(game)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    selectedGame === game
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300 border border-white/5'
                  }`}
                >
                  {game === 'ALL' ? '🔥 All' : game}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Search Results */}
          {hasSearched ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-500 flex items-center gap-3">
                  <SearchIcon className="w-4 h-4" />
                  {isSearching ? 'Searching...' : `${results.length} Results`}
                </h2>
              </div>

              {isSearching ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                  <SearchIcon className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-500 font-black uppercase text-xs tracking-widest mb-2">No clips found</p>
                  <p className="text-zinc-700 text-xs">Try a different keyword or game filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.map((clip) => (
                    <ClipCard key={clip.id} clip={clip} getYouTubeId={getYouTubeId} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Discovery View */
            <div className="space-y-12">
              {/* Trending Creators */}
              {trendingCreators.length > 0 && (
                <section>
                  <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-6 flex items-center gap-3">
                    <Users className="w-4 h-4 text-blue-400" /> Top Creators
                    <div className="h-[1px] flex-1 bg-white/5" />
                  </h2>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {trendingCreators.map((creator) => (
                      <Link
                        key={creator.id}
                        href={`/profile/${creator.id}`}
                        className="flex-shrink-0 group"
                      >
                        <div className="w-32 bg-white/5 border border-white/10 rounded-3xl p-5 text-center hover:bg-white/[0.08] hover:border-blue-500/20 transition-all">
                          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-lg font-black border-2 border-blue-500/30 mb-3 group-hover:scale-110 transition-transform">
                            {creator.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <p className="text-xs font-black truncate group-hover:text-blue-400 transition-colors">
                            {creator.display_name || 'Player'}
                          </p>
                          <p className="text-[9px] text-zinc-600 font-bold mt-1">
                            {creator.clipCount} clips
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Trending Clips */}
              <section>
                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-6 flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-orange-400" /> Trending Clips
                  <div className="h-[1px] flex-1 bg-white/5" />
                </h2>
                {trendingClips.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {trendingClips.map((clip) => (
                      <ClipCard key={clip.id} clip={clip} getYouTubeId={getYouTubeId} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-700 font-bold text-xs uppercase tracking-widest">
                    No clips yet
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function ClipCard({ clip, getYouTubeId }: { clip: any; getYouTubeId: (url: string) => string | null }) {
  const vid = getYouTubeId(clip.url || clip.video_url);

  return (
    <Link href={`/?clip=${clip.id}`} className="group">
      <div className="relative aspect-[9/16] bg-zinc-900 rounded-3xl overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all duration-300 shadow-lg hover:shadow-blue-500/5">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Game tag */}
        {clip.game_title && (
          <div className="absolute top-3 left-3">
            <div className="bg-blue-500/20 border border-blue-500/30 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Gamepad2 className="w-2.5 h-2.5 text-blue-400" />
              <span className="text-[8px] font-black text-blue-300 uppercase tracking-wider">
                {clip.game_title}
              </span>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-xs font-black uppercase line-clamp-2 italic mb-2 group-hover:text-blue-300 transition-colors">
            {clip.title}
          </p>
          <p className="text-[10px] text-zinc-400 font-bold mb-2">
            @{clip.profiles?.display_name || 'Player'}
          </p>
          <div className="flex gap-3">
            <span className="text-[9px] text-zinc-500 flex items-center gap-1 font-bold">
              <Eye className="w-2.5 h-2.5" />{clip.views || 0}
            </span>
            <span className="text-[9px] text-zinc-500 flex items-center gap-1 font-bold">
              <Heart className="w-2.5 h-2.5" />{clip.likes || 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
