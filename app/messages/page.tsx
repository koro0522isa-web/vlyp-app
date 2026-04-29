"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { 
  Send, Loader2, ArrowLeft, MessageSquare, User, CheckCheck, Ghost
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetUserId = searchParams.get('u');
  
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(targetUserId);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/');
        return;
      }
      setUser(session.user);
      fetchConversations(session.user.id);
    });
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat);
      fetchTargetProfile(activeChat);
      
      // リアルタイム購読
      const channel = supabase
        .channel(`chat:${user?.id}:${activeChat}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user?.id}`
        }, (payload) => {
          if (payload.new.sender_id === activeChat) {
            setMessages(prev => [...prev, payload.new]);
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [activeChat, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async (userId: string) => {
    setIsLoading(true);
    // 最近のメッセージをやり取りした相手をユニークに取得
    const { data } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, created_at')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (data) {
      const participantIds = new Set();
      data.forEach(m => {
        if (m.sender_id !== userId) participantIds.add(m.sender_id);
        if (m.receiver_id !== userId) participantIds.add(m.receiver_id);
      });

      if (participantIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, vlyp_id')
          .in('id', Array.from(participantIds));
        setConversations(profiles || []);
      }
    }
    setIsLoading(false);
  };

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const fetchTargetProfile = async (chatId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', chatId).single();
    if (data) setActiveProfile(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !user || isSending) return;
    setIsSending(true);
    const msg = {
      sender_id: user.id,
      receiver_id: activeChat,
      content: newMessage
    };
    
    const { data, error } = await supabase.from('messages').insert(msg).select().single();
    if (!error && data) {
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    }
    setIsSending(false);
  };

  return (
    <div className="flex h-screen bg-[#09090B] text-zinc-100 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        {/* Conversations List (Sidebar in mobile/Left on desktop) */}
        <div className={`w-full md:w-80 border-r border-white/5 flex flex-col ${activeChat && 'hidden md:flex'}`}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-black uppercase tracking-widest text-xs text-blue-400">Messages</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {conversations.length === 0 && !isLoading && (
              <div className="p-10 text-center text-zinc-600">
                <Ghost className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">No chats yet</p>
              </div>
            )}
            {conversations.map(conv => (
              <div 
                key={conv.id} 
                onClick={() => setActiveChat(conv.id)}
                className={`p-6 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-all border-b border-white/5 ${activeChat === conv.id ? 'bg-white/5' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center font-black text-xs border border-white/10">
                  {conv.display_name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{conv.display_name}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">@{conv.vlyp_id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col h-full bg-[#0d0d0f] relative ${!activeChat && 'hidden md:flex items-center justify-center text-zinc-700'}`}>
          {!activeChat ? (
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-6 opacity-10" />
              <p className="text-sm font-black uppercase tracking-[0.3em]">Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-white/5 glass-morphism flex items-center gap-4 z-10">
                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 hover:bg-white/10 rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-black text-xs">
                  {activeProfile?.display_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{activeProfile?.display_name}</h3>
                  <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Online</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                <AnimatePresence>
                  {messages.map((m, i) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <motion.div 
                        key={m.id}
                        initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] px-5 py-3 rounded-3xl text-sm leading-relaxed ${
                          isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-white/5'
                        }`}>
                          {m.content}
                          <div className={`text-[8px] mt-1 flex items-center gap-1 ${isMe ? 'text-blue-200' : 'text-zinc-500'}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && <CheckCheck className="w-3 h-3" />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-6 border-t border-white/5 glass-morphism">
                <div className="flex gap-4 relative">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-5 px-6 pr-16 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all ${
                      newMessage.trim() ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-zinc-800 text-zinc-600'
                    }`}
                  >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
