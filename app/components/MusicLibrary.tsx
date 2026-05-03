"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Music, Play, Pause, Heart, Search, Filter, Plus,
  Clock, TrendingUp, Volume2, Download, Share2,
  ChevronRight, X, Check
} from 'lucide-react';
import { motion } from 'framer-motion';

interface MusicTrack {
  id: number;
  title: string;
  artist: string;
  url: string;
  duration: number;
  genres: string[];
  mood: string;
  tags: string[];
  bpm?: number;
  key?: string;
  play_count: number;
  like_count: boolean;
  uploaded_by: string;
  created_at: string;
}

const GENRES = [
  'Electronic', 'Hip Hop', 'Rock', 'Pop', 'Jazz', 
  'Classical', 'Phonk', 'Lo-Fi', 'EDM', 'Trap'
];

const MOODS = [
  { value: 'energetic', label: '🔥 Energetic', color: 'bg-red-500' },
  { value: 'chill', label: '🌊 Chill', color: 'bg-blue-500' },
  { value: 'epic', label: '⚡ Epic', color: 'bg-yellow-500' },
  { value: 'dark', label: '🌙 Dark', color: 'bg-purple-500' },
  { value: 'happy', label: '😊 Happy', color: 'bg-green-500' },
  { value: 'neutral', label: '⚪ Neutral', color: 'bg-gray-500' }
];

export default function MusicLibrary() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<MusicTrack[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState<number | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchMusicLibrary();
    checkUserPermissions();
  }, []);

  useEffect(() => {
    filterTracks();
  }, [tracks, selectedGenre, selectedMood, searchQuery]);

  const fetchMusicLibrary = async () => {
    try {
      const response = await fetch('/api/music/library');
      const data = await response.json();
      
      if (data.success) {
        setTracks(data.tracks);
        setFilteredTracks(data.tracks);
      }
    } catch (error) {
      console.error('Failed to fetch music library:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserPermissions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
    }
  };

  const filterTracks = () => {
    let filtered = [...tracks];

    if (selectedGenre) {
      filtered = filtered.filter(track => 
        track.genres.includes(selectedGenre)
      );
    }

    if (selectedMood) {
      filtered = filtered.filter(track => 
        track.mood === selectedMood
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(track =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredTracks(filtered);
  };

  const toggleLike = async (trackId: number) => {
    if (!user) {
      alert('Please login to like tracks');
      return;
    }

    const newLikedTracks = new Set(likedTracks);
    if (likedTracks.has(trackId)) {
      newLikedTracks.delete(trackId);
    } else {
      newLikedTracks.add(trackId);
    }
    
    setLikedTracks(newLikedTracks);

    // Update like count in database
    try {
      await fetch(`/api/music/like/${trackId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Failed to update like:', error);
    }
  };

  const playTrack = (trackId: number) => {
    if (isPlaying === trackId) {
      setIsPlaying(null);
    } else {
      setIsPlaying(trackId);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMoodColor = (mood: string) => {
    const moodObj = MOODS.find(m => m.value === mood);
    return moodObj ? moodObj.color : 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Music className="w-8 h-8 text-purple-500" />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Music Library</h1>
            <p className="text-zinc-400 text-sm">Background music for your clips</p>
          </div>
        </div>
        
        {user && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-500 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Upload Track
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-[#09090B] border border-white/10 rounded-3xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search tracks..."
              className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-xl focus:border-purple-500/50 outline-none font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Genre Filter */}
          <select
            className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:border-purple-500/50 outline-none font-bold"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            <option value="">All Genres</option>
            {GENRES.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>

          {/* Mood Filter */}
          <select
            className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:border-purple-500/50 outline-none font-bold"
            value={selectedMood}
            onChange={(e) => setSelectedMood(e.target.value)}
          >
            <option value="">All Moods</option>
            {MOODS.map(mood => (
              <option key={mood.value} value={mood.value}>{mood.label}</option>
            ))}
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSelectedGenre('');
              setSelectedMood('');
              setSearchQuery('');
            }}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Tracks List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-zinc-400 mt-4">Loading music library...</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg font-bold">No tracks found</p>
            <p className="text-zinc-500 text-sm mt-2">Try adjusting your filters or upload some music</p>
          </div>
        ) : (
          filteredTracks.map((track, index) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#09090B] border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-6">
                {/* Play Button */}
                <button
                  onClick={() => playTrack(track.id)}
                  className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 transition-all group-hover:scale-110"
                >
                  {isPlaying === track.id ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-1" />
                  )}
                </button>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white truncate">{track.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${getMoodColor(track.mood)}`}>
                      {track.mood}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <span>{track.artist}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(track.duration)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {track.play_count} plays
                    </span>
                  </div>
                  
                  {/* Genres */}
                  <div className="flex gap-2 mt-2">
                    {track.genres.slice(0, 3).map(genre => (
                      <span key={genre} className="px-2 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-zinc-400">
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleLike(track.id)}
                    className={`p-3 rounded-xl transition-all ${
                      likedTracks.has(track.id)
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-white/5 text-zinc-400 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${likedTracks.has(track.id) ? 'fill-current' : ''}`} />
                  </button>
                  
                  <button className="p-3 bg-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                    <Download className="w-5 h-5" />
                  </button>
                  
                  <button className="p-3 bg-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Audio Player (shown when playing) */}
              {isPlaying === track.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-white/10"
                >
                  <audio
                    controls
                    autoPlay
                    className="w-full"
                    src={track.url}
                  />
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50">
          <div className="bg-[#09090B] border border-white/10 rounded-3xl p-8 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Upload Music Track</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-zinc-400 mb-6">
              Upload your own background music tracks. Pro users only.
            </p>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Track title"
                className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:border-purple-500/50 outline-none font-bold"
              />
              
              <input
                type="text"
                placeholder="Artist name"
                className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:border-purple-500/50 outline-none font-bold"
              />
              
              <input
                type="url"
                placeholder="Audio URL"
                className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:border-purple-500/50 outline-none font-bold"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="BPM"
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:border-purple-500/50 outline-none font-bold"
                />
                
                <select className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:border-purple-500/50 outline-none font-bold">
                  <option value="">Select mood</option>
                  {MOODS.map(mood => (
                    <option key={mood.value} value={mood.value}>{mood.label}</option>
                  ))}
                </select>
              </div>
              
              <button className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-purple-500 transition-all">
                Upload Track
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
