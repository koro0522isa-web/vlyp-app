"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldAlert, 
  Trash2, 
  CheckCircle, 
  ExternalLink, 
  Loader2, 
  ArrowLeft,
  AlertTriangle,
  Lock,
  UserX
} from 'lucide-react';

const ADMIN_EMAIL = "koro0522isa@gmail.com"; 

export default function AdminDashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'reports' | 'withdrawals'>('reports');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== ADMIN_EMAIL) {
        window.location.href = '/';
        return;
      }
      setIsAuthorized(true);
      await Promise.all([fetchReports(), fetchWithdrawals()]);
    } catch (error) {
      console.error("Auth error:", error);
      window.location.href = '/';
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('*, clips (*)')
      .order('created_at', { ascending: false });
    if (!error) setReports(data || []);
  };

  const fetchWithdrawals = async () => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*, profiles:profiles!user_id(display_name, username)')
      .order('created_at', { ascending: false });
    if (!error) setWithdrawals(data || []);
  };

  const handleBan = async (clipId: number, reportId: number) => {
    if (!confirm("Ban this clip?")) return;
    await supabase.from('clips').update({ status: 'banned' }).eq('id', clipId);
    await supabase.from('reports').delete().eq('id', reportId);
    fetchReports();
  };

  const dismissReport = async (reportId: number) => {
    await supabase.from('reports').delete().eq('id', reportId);
    fetchReports();
  };

  const handleCompleteWithdrawal = async (requestId: string) => {
    if (!confirm("Mark as Paid?")) return;
    await supabase.from('withdrawal_requests').update({ status: 'completed' }).eq('id', requestId);
    fetchWithdrawals();
  };

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center text-blue-500"><Loader2 className="animate-spin" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-6">
            <button onClick={() => window.location.href = '/'} className="p-3 bg-white/5 border border-white/5 rounded-2xl"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-4xl font-black italic tracking-tighter flex items-center gap-3 uppercase"><ShieldAlert className="text-orange-500" /> Admin Panel</h1>
          </div>
        </div>

        <div className="flex gap-8 mb-10 border-b border-white/5">
          <button onClick={() => setActiveTab('reports')} className={`pb-4 text-xs font-black uppercase tracking-widest ${activeTab === 'reports' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-zinc-500'}`}>Reports ({reports.length})</button>
          <button onClick={() => setActiveTab('withdrawals')} className={`pb-4 text-xs font-black uppercase tracking-widest ${activeTab === 'withdrawals' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-zinc-500'}`}>Withdrawals ({withdrawals.filter(w => w.status === 'pending').length})</button>
        </div>

        {activeTab === 'reports' ? (
          <div className="space-y-6">
            {reports.length === 0 ? <p className="text-zinc-500 py-20 text-center uppercase font-black">All Clear</p> : reports.map(r => (
              <div key={r.id} className="bg-white/5 border border-white/10 p-8 rounded-[3rem] flex gap-8 items-center">
                <div className="flex-1">
                  <span className="bg-red-600 text-[9px] font-black px-2 py-1 rounded uppercase tracking-tighter">Report</span>
                  <h3 className="text-xl font-black uppercase mt-2">{r.clips?.title || 'Unknown'}</h3>
                  <p className="text-orange-400 text-xs font-bold mt-1">Reason: {r.reason}</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => dismissReport(r.id)} className="px-6 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest">Dismiss</button>
                  <button onClick={() => handleBan(r.clip_id, r.id)} className="px-6 py-3 bg-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Ban</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {withdrawals.length === 0 ? <p className="text-zinc-500 py-20 text-center uppercase font-black">No Requests</p> : withdrawals.map(w => (
              <div key={w.id} className="bg-white/5 border border-white/10 p-8 rounded-[3rem] flex gap-8 items-center">
                <div className="flex-1">
                  <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-tighter ${w.status === 'pending' ? 'bg-emerald-600' : 'bg-zinc-800'}`}>{w.status}</span>
                  <h3 className="text-xl font-black mt-2">@{w.profiles?.display_name}</h3>
                  <p className="text-4xl font-black italic text-emerald-400 mt-1">¥{w.amount.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 mt-4 font-mono bg-black/30 p-4 rounded-xl">{w.bank_info}</p>
                </div>
                {w.status === 'pending' && <button onClick={() => handleCompleteWithdrawal(w.id)} className="px-8 py-4 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20">Mark Paid</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}