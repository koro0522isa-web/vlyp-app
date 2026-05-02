"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { 
  Send, Loader2, ArrowLeft, MessageSquare, CheckCheck, Ghost, Trash2, Image as ImageIcon, Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { broadcastDmUnread } from '@/lib/dm-events';

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

  const fetchChatPartners = useCallback(async (userId: string) => {
    try {
      const { data: allMsgs, error } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, created_at')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const partnerMap = new Map<string, { last_message: string; last_message_at: string }>();

      allMsgs?.forEach(m => {
        const partnerId = m.sender_id === userId ? m.receiver_id : m.sender_id;
        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, { last_message: m.content, last_message_at: m.created_at });
        }
      });

      const { data: unreadRows } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', userId)
        .eq('is_read', false);

      const unreadByPartner = new Map<string, number>();
      unreadRows?.forEach(row => {
        const sid = row.sender_id;
        unreadByPartner.set(sid, (unreadByPartner.get(sid) || 0) + 1);
      });

      const totalUnread = unreadRows?.length ?? 0;
      broadcastDmUnread(totalUnread);

      if (partnerMap.size === 0) {
        setChatPartners([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', Array.from(partnerMap.keys()));

      if (profiles) {
        const partnersWithLastMsg = profiles
          .map(p => ({
            ...p,
            last_message: partnerMap.get(p.id)?.last_message || '',
            last_message_at: partnerMap.get(p.id)?.last_message_at || '',
            unread_count: unreadByPartner.get(p.id) || 0,
          }))
          .sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || ''));

        setChatPartners(partnersWithLastMsg);
      }
    } catch (error: any) {
      console.error('Error fetching chat partners:', error);
      setSendError('会話の読み込みに失敗しました。Supabase の messages テーブルと RLS を確認してください。');
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (userId: string, partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
        return;
      }

      if (data) {
        setMessages(data.slice(-200));
      } else {
        setMessages([]);
      }

      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', partnerId)
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (updateError) {
        console.error('Error marking messages as read:', updateError);
      } else {
        // 一覧の未読バッジと Sidebar の件数を更新
        await fetchChatPartners(userId);
      }
    } catch (e) {
      console.error('Unexpected error fetching messages:', e);
    }
  }, [fetchChatPartners]);

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
  }, [targetUserId, fetchChatPartners, fetchMessages]);

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
          table: 'messages'
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Only process if it involves the current user
          if (newMsg.receiver_id !== user.id && newMsg.sender_id !== user.id) return;

          const currentPartner = selectedPartnerRef.current;
          
          // If message is in current conversation, add to list
          if (currentPartner && (newMsg.sender_id === currentPartner.id || newMsg.receiver_id === currentPartner.id)) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            
            // 受信メッセージは開いている会話内なら既読にする（await で失敗も捕捉）
            if (newMsg.receiver_id === user.id) {
              const { error: readErr } = await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMsg.id);
              if (readErr) console.error('既読更新エラー:', readErr);
            }
          }

          fetchChatPartners(user.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // 他端末・別タブで既読になったとき未読バッジを再計算
          fetchChatPartners(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchChatPartners]);

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
        <div className={`w-full md:w-80 lg:w-[400px] border-r border-white/5 flex flex-col flex-shrink-0 bg-[#0c0c0e] ${selectedPartner ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 text-white">
                <MessageSquare className="w-6 h-6 text-blue-500" /> Inbox
              </h1>
              <div className="px-3 py-1 bg-blue-600/20 rounded-full border border-blue-500/30">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{chatPartners.length} Chats</span>
              </div>
            </div>
            
            {/* User Search Bar */}
            <div className="relative group">
              <input 
                type="text"
                placeholder="Search players..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold focus:border-blue-500/50 outline-none transition-all group-hover:bg-white/[0.07]"
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
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 group-focus-within:opacity-100 transition-opacity">
                <span className="text-[8px] text-zinc-500 font-black uppercase border border-white/20 px-1.5 py-0.5 rounded">Enter</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-10">
            {chatPartners.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-8 bg-white/[0.02] rounded-[2rem] border border-dashed border-white/5 mx-4">
                <Ghost className="w-12 h-12 text-zinc-800 mb-4" />
                <p className="text-zinc-600 font-black text-[10px] uppercase tracking-widest">No conversations yet</p>
                <p className="text-zinc-700 text-[8px] mt-2 uppercase font-bold">Discover players to start chatting</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatPartners.map(partner => (
                  <button
                    key={partner.id}
                    onClick={() => selectPartner(partner)}
                    className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 relative group ${
                      selectedPartner?.id === partner.id 
                        ? 'bg-blue-600/10 border border-blue-500/20 shadow-lg shadow-blue-500/5' 
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${selectedPartner?.id === partner.id ? 'from-blue-500 to-blue-700' : 'from-zinc-800 to-zinc-900'} flex items-center justify-center text-lg font-black border-2 ${selectedPartner?.id === partner.id ? 'border-blue-400' : 'border-white/5'} overflow-hidden shadow-xl group-hover:scale-105 transition-transform duration-300`}>
                        {partner.avatar_url ? (
                          <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          partner.display_name?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      {partner.unread_count && partner.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#0c0c0e] animate-bounce">
                          <span className="text-[8px] font-black text-white">{partner.unread_count}</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 text-left flex-1">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className={`text-sm font-black truncate ${selectedPartner?.id === partner.id ? 'text-blue-400' : 'text-zinc-200'}`}>
                          {partner.display_name || 'Player'}
                        </p>
                        {partner.last_message_at && (
                          <span className="text-[8px] text-zinc-700 font-bold uppercase" suppressHydrationWarning>
                            {formatTime(partner.last_message_at)}
                          </span>
                        )}
                      </div>
                      {partner.last_message && (
                        <p className={`text-[11px] font-medium truncate ${partner.unread_count ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          {partner.last_message}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-black relative ${!selectedPartner ? 'hidden md:flex' : 'flex'}`}>
          {selectedPartner ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/80 backdrop-blur-3xl z-10">
                <div className="flex items-center gap-4">
                  <button onClick={() => { setSelectedPartner(null); selectedPartnerRef.current = null; }} className="p-2 hover:bg-white/10 rounded-full md:hidden">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <Link href={`/profile/${selectedPartner.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-sm font-black border-2 border-blue-500/30 overflow-hidden shadow-2xl">
                      {selectedPartner.avatar_url ? (
                        <img src={selectedPartner.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedPartner.display_name?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <p className="text-base font-black italic tracking-tight">{selectedPartner.display_name}</p>
                      {selectedPartner.username && (
                        <p className="text-[9px] text-zinc-500 font-bold tracking-wide">
                          @{selectedPartner.username}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="p-3 hover:bg-white/5 rounded-2xl text-zinc-500 transition-all" title="Call">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </button>
                  <button className="p-3 hover:bg-white/5 rounded-2xl text-zinc-500 transition-all" title="Video Call">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-gradient-to-b from-transparent to-blue-500/5">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 opacity-20">
                    <MessageSquare className="w-20 h-20 text-white" />
                    <p className="text-white text-xs font-black uppercase tracking-[0.4em]">Start the legend</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.sender_id === user?.id;
                    const isTemp = msg.id.startsWith('temp-');
                    const nextMsg = messages[idx + 1];
                    const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
                    
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: isMine ? 20 : -20, scale: 0.95 }}
                        animate={{ opacity: isTemp ? 0.7 : 1, x: 0, scale: 1 }}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'} group mb-1`}
                      >
                        <div className={`max-w-[75%] px-6 py-4 rounded-[2rem] text-sm font-medium leading-relaxed relative shadow-2xl transition-all hover:scale-[1.01] ${
                          isMine 
                            ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white ' + (isLastInGroup ? 'rounded-br-md' : '') 
                            : 'bg-[#1a1a1c] text-zinc-300 border border-white/10 ' + (isLastInGroup ? 'rounded-bl-md' : '')
                        }`}>
                          {msg.content}
                          <div className={`flex items-center gap-1.5 mt-2 ${isMine ? 'justify-end' : ''}`}>
                            <span className="text-[8px] font-black uppercase opacity-40" suppressHydrationWarning>
                              {formatTime(msg.created_at)}
                            </span>
                            {isMine && !isTemp && <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-cyan-300' : 'opacity-30'}`} />}
                            {isTemp && <Loader2 className="w-3 h-3 animate-spin opacity-30" />}
                          </div>

                          {/* Delete on hover */}
                          {isMine && !isTemp && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}
                              className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-full transition-all text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
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
                    className="mx-8 mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 font-black uppercase tracking-widest flex items-center gap-3"
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    {sendError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Area */}
              <div className="p-8 border-t border-white/5 bg-[#09090b]/80 backdrop-blur-3xl">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (window.confirm("Send 10 coins as a gift?")) {
                        setNewMessage("🎁 Sent 10 VLYP Coins!");
                      }
                    }}
                    className="p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-[1.5rem] text-yellow-500 hover:bg-yellow-400 hover:text-black transition-all group"
                    title="Gift Coins"
                  >
                    <Coins className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                  <button className="p-4 bg-white/5 border border-white/10 rounded-[1.5rem] text-zinc-500 hover:text-white transition-all">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <div className="relative flex-1 group">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Type your message..."
                      className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-8 pr-16 text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-all group-hover:bg-white/[0.08]"
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
                      className={`absolute right-3 top-3 bottom-3 px-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        isSending || !newMessage.trim() 
                          ? 'bg-zinc-800 text-zinc-600' 
                          : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30 active:scale-95'
                      }`}
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-[8px] text-zinc-700 font-black uppercase tracking-[0.4em] mt-4 text-center">Encrypted & Secure Messaging</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-black to-blue-900/10">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-blue-600/10 rounded-[3rem] border border-blue-500/20 flex items-center justify-center mx-auto shadow-2xl">
                  <MessageSquare className="w-10 h-10 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white mb-2">Direct Messaging</h2>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Select a player to begin</p>
                </div>
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
