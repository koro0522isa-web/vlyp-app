"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { 
  Send, Loader2, ArrowLeft, MessageSquare, CheckCheck, Ghost, Trash2, Image as ImageIcon
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
  const targetUserId = searchParams.get('u');

  const [user, setUser] = useState<any>(null);
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<ChatPartner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Refs for latest state in realtime callback
  const userRef = useRef<any>(null);
  const selectedPartnerRef = useRef<ChatPartner | null>(null);

  // Keep refs in sync
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { selectedPartnerRef.current = selectedPartner; }, [selectedPartner]);

  // Init: fetch session + partners + target user
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      
      const currentUser = session.user;
      setUser(currentUser);
      userRef.current = currentUser;

      await fetchChatPartners(currentUser.id);
      
      // If a target user is specified via ?u=xxx, open that chat
      if (targetUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .eq('id', targetUserId)
          .maybeSingle();
        if (profile) {
          setSelectedPartner(profile);
          selectedPartnerRef.current = profile;
          await fetchMessages(currentUser.id, targetUserId);
        }
      }
      setIsLoading(false);
    };
    init();
  }, [targetUserId]);

  // Realtime subscription - uses refs to avoid stale closure
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`dm-${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          const currentPartner = selectedPartnerRef.current;
          
          // If from current chat partner, add to messages
          if (currentPartner && newMsg.sender_id === currentPartner.id) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            
            // Mark as read
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          }
          
          // Refresh partner list to show new conversations
          fetchChatPartners(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when partner is selected
  useEffect(() => {
    if (selectedPartner) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedPartner]);

  const fetchChatPartners = async (userId: string) => {
    try {
      // Get all unique partner IDs from messages
      const { data: sent } = await supabase
        .from('messages')
        .select('receiver_id, content, created_at')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });
      
      const { data: received } = await supabase
        .from('messages')
        .select('sender_id, content, created_at')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false });

      const partnerMap = new Map<string, { last_message: string; last_message_at: string }>();
      
      sent?.forEach(m => {
        if (!partnerMap.has(m.receiver_id) || m.created_at > partnerMap.get(m.receiver_id)!.last_message_at) {
          partnerMap.set(m.receiver_id, { last_message: m.content, last_message_at: m.created_at });
        }
      });
      
      received?.forEach(m => {
        if (!partnerMap.has(m.sender_id) || m.created_at > partnerMap.get(m.sender_id)!.last_message_at) {
          partnerMap.set(m.sender_id, { last_message: m.content, last_message_at: m.created_at });
        }
      });

      if (partnerMap.size === 0) return;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', Array.from(partnerMap.keys()));

      if (profiles) {
        const partnersWithLastMsg = profiles.map(p => ({
          ...p,
          last_message: partnerMap.get(p.id)?.last_message || '',
          last_message_at: partnerMap.get(p.id)?.last_message_at || '',
        })).sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || ''));
        
        setChatPartners(partnersWithLastMsg);
      }
    } catch (e) {
      console.error('Error fetching chat partners:', e);
    }
  };

  const fetchMessages = async (userId: string, partnerId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .or(`sender_id.eq.${partnerId},receiver_id.eq.${partnerId}`)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }
    if (data) setMessages(data);

    // Mark received messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', userId)
      .eq('is_read', false);
  };

  const sendMessage = async () => {
    if (!user || !selectedPartner || !newMessage.trim()) return;
    setSendError(null);
    setIsSending(true);

    const messageContent = newMessage.trim();
    
    // Optimistic update - add message to UI immediately
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: selectedPartner.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedPartner.id,
          content: messageContent
        })
        .select()
        .single();

      if (error) {
        console.error('Send message error:', error);
        setSendError(`送信失敗: ${error.message}`);
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        setNewMessage(messageContent); // Restore the message text
        return;
      }

      if (data) {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
        // Refresh partner list to update last message
        fetchChatPartners(user.id);
      }
    } catch (e: any) {
      console.error('Send message exception:', e);
      setSendError(`エラー: ${e.message}`);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const selectPartner = async (partner: ChatPartner) => {
    setSelectedPartner(partner);
    selectedPartnerRef.current = partner;
    setSendError(null);
    if (user) await fetchMessages(user.id, partner.id);
  };

  const deleteMessage = async (msgId: string) => {
    if (!confirm('このメッセージを削除しますか？')) return;
    await supabase.from('messages').delete().eq('id', msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
             d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
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
          <div className="p-6 border-b border-white/5 space-y-4">
            <h1 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-blue-400" /> Messages
            </h1>
            
            {/* User Search Bar */}
            <div className="relative">
              <input 
                type="text"
                placeholder="Search players to chat..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold focus:border-blue-500/50 outline-none transition-all"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (!val) return;
                    const { data } = await supabase
                      .from('profiles')
                      .select('id, display_name, username, avatar_url')
                      .or(`display_name.ilike.%${val}%,username.ilike.%${val}%`)
                      .limit(1)
                      .maybeSingle();
                    if (data) {
                      selectPartner(data);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-zinc-600 font-black uppercase">Enter</span>
            </div>
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
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-sm font-black border border-blue-500/30 flex-shrink-0 overflow-hidden">
                    {partner.avatar_url ? (
                      <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      partner.display_name?.charAt(0)?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="min-w-0 text-left flex-1">
                    <p className="text-sm font-black truncate">{partner.display_name || 'Player'}</p>
                    {partner.last_message && (
                      <p className="text-[10px] text-zinc-600 font-medium truncate mt-0.5">
                        {partner.last_message}
                      </p>
                    )}
                  </div>
                  {partner.last_message_at && (
                    <span className="text-[8px] text-zinc-700 font-bold flex-shrink-0" suppressHydrationWarning>
                      {formatTime(partner.last_message_at)}
                    </span>
                  )}
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
                <button onClick={() => { setSelectedPartner(null); selectedPartnerRef.current = null; }} className="p-2 hover:bg-white/10 rounded-full md:hidden">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Link href={`/profile/${selectedPartner.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-sm font-black border border-blue-500/30 overflow-hidden">
                    {selectedPartner.avatar_url ? (
                      <img src={selectedPartner.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      selectedPartner.display_name?.charAt(0)?.toUpperCase() || '?'
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black">{selectedPartner.display_name}</p>
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Direct Message</p>
                  </div>
                </Link>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <MessageSquare className="w-12 h-12 text-zinc-800" />
                    <p className="text-zinc-700 text-xs font-bold uppercase tracking-widest">Send the first message!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;
                    const isTemp = msg.id.startsWith('temp-');
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: isTemp ? 0.7 : 1, y: 0, scale: 1 }}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}
                      >
                        <div className={`max-w-[75%] px-5 py-3.5 rounded-2xl text-sm font-medium leading-relaxed relative ${
                          isMine 
                            ? 'bg-blue-600 text-white rounded-br-md' 
                            : 'bg-white/5 text-zinc-300 border border-white/10 rounded-bl-md'
                        }`}>
                          {msg.content}
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                            <span className="text-[8px] opacity-50" suppressHydrationWarning>
                              {formatTime(msg.created_at)}
                            </span>
                            {isMine && !isTemp && <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-cyan-300' : 'opacity-50'}`} />}
                            {isTemp && <Loader2 className="w-3 h-3 animate-spin opacity-50" />}
                          </div>

                          {/* Delete on hover */}
                          {isMine && !isTemp && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}
                              className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error Display */}
              <AnimatePresence>
                {sendError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mx-5 mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-bold"
                  >
                    {sendError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              <div className="p-5 border-t border-white/5 bg-black/50">
                <div className="relative flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    maxLength={2000}
                  />
                  <button 
                    onClick={sendMessage} 
                    disabled={isSending || !newMessage.trim()}
                    className="p-3.5 bg-blue-600 rounded-xl text-white disabled:opacity-30 transition-all hover:bg-blue-500 active:scale-95 flex-shrink-0"
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
