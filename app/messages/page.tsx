"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { 
  Send, Loader2, ArrowLeft, MessageSquare, User, CheckCheck, Ghost
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ChatPartner {
  id: string;
  display_name: string;
  username?: string;
  avatar_url?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetUserId = searchParams.get('u');

  const [user, setUser] = useState<any>(null);
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<ChatPartner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      setUser(session.user);
      await fetchChatPartners(session.user.id);
      
      if (targetUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .eq('id', targetUserId)
          .maybeSingle();
        if (profile) {
          setSelectedPartner(profile);
          await fetchMessages(session.user.id, targetUserId);
        }
      }
      setIsLoading(false);
    };
    init();

    // リアルタイム購読のセットアップ
    const channel = supabase
      .channel('dm-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          // 自分が受信者、かつ現在開いている相手からのメッセージなら追加
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            // 相手からのメッセージ、または自分からのメッセージ（別タブなど）
            const isRelevant = (newMsg.sender_id === user?.id && newMsg.receiver_id === selectedPartner?.id) ||
                               (newMsg.sender_id === selectedPartner?.id && newMsg.receiver_id === user?.id);
            if (isRelevant) return [...prev, newMsg];
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, selectedPartner?.id, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChatPartners = async (userId: string) => {
    // Get unique conversation partners from direct_messages
    const { data: sent } = await supabase
      .from('direct_messages')
      .select('receiver_id')
      .eq('sender_id', userId);
    const { data: received } = await supabase
      .from('direct_messages')
      .select('sender_id')
      .eq('receiver_id', userId);

    const partnerIds = new Set<string>();
    sent?.forEach(m => partnerIds.add(m.receiver_id));
    received?.forEach(m => partnerIds.add(m.sender_id));

    if (partnerIds.size === 0) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', Array.from(partnerIds));

    if (profiles) setChatPartners(profiles);
  };

  const fetchMessages = async (userId: string, partnerId: string) => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) setMessages(data);

    // Mark as read
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', userId)
      .eq('is_read', false);
  };

  const sendMessage = async () => {
    if (!user || !selectedPartner || !newMessage.trim()) return;
    setIsSending(true);

    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: user.id,
        receiver_id: selectedPartner.id,
        content: newMessage.trim()
      })
      .select()
      .single();

    if (data) {
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    }
    setIsSending(false);
  };

  const selectPartner = async (partner: ChatPartner) => {
    setSelectedPartner(partner);
    if (user) await fetchMessages(user.id, partner.id);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#09090B] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex h-full overflow-hidden">
        {/* Chat List */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-white/5 flex flex-col flex-shrink-0 ${selectedPartner ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-white/5">
            <h1 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-blue-400" /> Messages
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {chatPartners.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Ghost className="w-16 h-16 text-zinc-800 mb-4" />
                <p className="text-zinc-600 font-bold text-xs uppercase tracking-widest">No conversations yet</p>
                <p className="text-zinc-700 text-[10px] mt-2">Visit a profile to send a message</p>
              </div>
            ) : (
              chatPartners.map(partner => (
                <button
                  key={partner.id}
                  onClick={() => selectPartner(partner)}
                  className={`w-full flex items-center gap-4 p-5 hover:bg-white/5 transition-all border-b border-white/[0.03] ${
                    selectedPartner?.id === partner.id ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-sm font-black border border-blue-500/30 flex-shrink-0">
                    {partner.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-black truncate">{partner.display_name || 'Player'}</p>
                    <p className="text-[10px] text-zinc-600 font-bold">@{partner.username || partner.display_name}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${!selectedPartner ? 'hidden md:flex' : 'flex'}`}>
          {selectedPartner ? (
            <>
              {/* Chat Header */}
              <div className="p-5 border-b border-white/5 flex items-center gap-4 bg-[#09090B]/90 backdrop-blur-xl">
                <button onClick={() => setSelectedPartner(null)} className="p-2 hover:bg-white/10 rounded-full md:hidden">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-sm font-black border border-blue-500/30">
                  {selectedPartner.display_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-black">{selectedPartner.display_name}</p>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Direct Message</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-zinc-700 text-xs font-bold uppercase tracking-widest">Send the first message!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] px-5 py-3.5 rounded-2xl text-sm font-medium leading-relaxed ${
                          isMine 
                            ? 'bg-blue-600 text-white rounded-br-md' 
                            : 'bg-white/5 text-zinc-300 border border-white/10 rounded-bl-md'
                        }`}>
                          {msg.content}
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                            <span className="text-[8px] opacity-50">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMine && <CheckCheck className="w-3 h-3 opacity-50" />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-5 border-t border-white/5 bg-black/50">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 pr-16 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button 
                    onClick={sendMessage} 
                    disabled={isSending || !newMessage.trim()}
                    className="absolute right-3 p-3 bg-blue-600 rounded-xl text-white disabled:opacity-30 transition-opacity hover:bg-blue-500"
                  >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-600 font-bold text-xs uppercase tracking-widest">Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
