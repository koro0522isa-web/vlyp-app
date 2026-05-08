"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  DollarSign, TrendingUp, Users, Eye, Gift, CreditCard,
  Calendar, Download, Settings, Bell, ArrowUpRight,
  Target, Zap, Crown, Play, Video, Music
} from 'lucide-react';
import { motion } from 'framer-motion';

interface RevenueData {
  period: string;
  totalRevenue: number;
  totalTransactions: number;
  adRevenue: { amount: number; transactions: number; cpm: number };
  subscriptionRevenue: { amount: number; transactions: number; subscribers: number };
  giftRevenue: { amount: number; transactions: number; gifts: number };
  clipRevenue: { amount: number; transactions: number; sales: number };
  streamRevenue: { amount: number; transactions: number; streams: number; avgViewers: number };
}

interface PayoutInfo {
  method: string;
  email?: string;
  address?: string;
  totalEarnings: number;
  pendingAmount: number;
  nextPayoutDate: string;
}

export default function MonetizationDashboard() {
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [payoutInfo, setPayoutInfo] = useState<PayoutInfo | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [showPayoutSettings, setShowPayoutSettings] = useState(false);

  useEffect(() => {
    fetchRevenueData();
  }, [selectedPeriod]);

  const fetchRevenueData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/monetization/revenue?period=${selectedPeriod}`);
      const data = await response.json();
      
      if (data.success) {
        setRevenue(data.revenue);
        setPayoutInfo(data.payoutInfo);
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      default: return 'This Month';
    }
  };

  const revenueSources = [
    {
      name: 'Ad Revenue',
      icon: <Eye className="w-5 h-5" />,
      amount: revenue?.adRevenue.amount || 0,
      transactions: revenue?.adRevenue.transactions || 0,
      metric: revenue?.adRevenue.cpm ? `$${revenue.adRevenue.cpm.toFixed(2)} CPM` : 'No data',
      color: 'bg-blue-500',
      trend: '+12%'
    },
    {
      name: 'Subscriptions',
      icon: <Crown className="w-5 h-5" />,
      amount: revenue?.subscriptionRevenue.amount || 0,
      transactions: revenue?.subscriptionRevenue.subscribers || 0,
      metric: `${revenue?.subscriptionRevenue.subscribers || 0} subs`,
      color: 'bg-purple-500',
      trend: '+8%'
    },
    {
      name: 'Gifts & Tips',
      icon: <Gift className="w-5 h-5" />,
      amount: revenue?.giftRevenue.amount || 0,
      transactions: revenue?.giftRevenue.gifts || 0,
      metric: `${revenue?.giftRevenue.gifts || 0} gifts`,
      color: 'bg-pink-500',
      trend: '+25%'
    },
    {
      name: 'Clip Sales',
      icon: <Video className="w-5 h-5" />,
      amount: revenue?.clipRevenue.amount || 0,
      transactions: revenue?.clipRevenue.sales || 0,
      metric: `${revenue?.clipRevenue.sales || 0} sales`,
      color: 'bg-green-500',
      trend: '+15%'
    },
    {
      name: 'Streaming',
      icon: <Play className="w-5 h-5" />,
      amount: revenue?.streamRevenue.amount || 0,
      transactions: revenue?.streamRevenue.streams || 0,
      metric: `${formatNumber(revenue?.streamRevenue.avgViewers || 0)} avg viewers`,
      color: 'bg-red-500',
      trend: '+5%'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-500" />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Monetization</h1>
            <p className="text-zinc-400 text-sm">Track your earnings and revenue</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Period Selector */}
          <select
            className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl font-bold focus:border-purple-500/50 outline-none"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          
          <button
            onClick={() => setShowPayoutSettings(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 transition-all flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Payout Settings
          </button>
        </div>
      </div>

      {/* Total Revenue Card */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 border border-green-500/30 rounded-3xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm font-bold uppercase tracking-widest mb-2">
              {getPeriodLabel(selectedPeriod)} Revenue
            </p>
            <div className="flex items-baseline gap-4">
              <h2 className="text-5xl font-black text-white">
                {formatCurrency(revenue?.totalRevenue || 0)}
              </h2>
              <div className="flex items-center gap-1 text-green-200">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm font-bold">+18% vs last period</span>
              </div>
            </div>
            <p className="text-green-200 text-sm mt-2">
              {revenue?.totalTransactions || 0} transactions
            </p>
          </div>
          
          <div className="text-right">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-green-100 text-xs font-bold uppercase mb-1">Next Payout</p>
              <p className="text-white font-bold">
                {payoutInfo?.nextPayoutDate ? 
                  new Date(payoutInfo.nextPayoutDate).toLocaleDateString() : 
                  'TBD'
                }
              </p>
              <p className="text-green-200 text-sm mt-1">
                {formatCurrency(payoutInfo?.pendingAmount || 0)} pending
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {revenueSources.map((source, index) => (
          <motion.div
            key={source.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#09090B] border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-all group"
          >
            <div className={`w-12 h-12 ${source.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              {source.icon}
            </div>
            
            <div className="space-y-2">
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">{source.name}</p>
              <p className="text-2xl font-black text-white">{formatCurrency(source.amount)}</p>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-xs">{source.metric}</span>
                <span className="text-green-500 text-xs font-bold">{source.trend}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Content */}
        <div className="bg-[#09090B] border border-white/10 rounded-3xl p-6">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-green-500" />
            Top Performing Content
          </h3>
          
          <div className="space-y-4">
            {[
              { title: "Epic Headshot Compilation", views: 125000, revenue: 450, type: "clip" },
              { title: "Live Stream - Tournament Finals", views: 89000, revenue: 320, type: "stream" },
              { title: "Pro Tips & Tricks", views: 67000, revenue: 180, type: "clip" }
            ].map((content, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    content.type === 'clip' ? 'bg-blue-500/20' : 'bg-red-500/20'
                  }`}>
                    {content.type === 'clip' ? <Video className="w-5 h-5 text-blue-500" /> : <Play className="w-5 h-5 text-red-500" />}
                  </div>
                  <div>
                    <p className="font-bold text-white">{content.title}</p>
                    <p className="text-zinc-400 text-sm">{formatNumber(content.views)} views</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-500">{formatCurrency(content.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monetization Tips */}
        <div className="bg-[#09090B] border border-white/10 rounded-3xl p-6">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
            <Target className="w-6 h-6 text-purple-500" />
            Monetization Tips
          </h3>
          
          <div className="space-y-4">
            {[
              {
                icon: <Crown className="w-5 h-5 text-purple-500" />,
                title: "Enable Pro Features",
                description: "Pro users generate 3x more revenue on average",
                action: "Upgrade to Pro"
              },
              {
                icon: <Users className="w-5 h-5 text-blue-500" />,
                title: "Grow Your Audience",
                description: "Every 1K viewers adds ~$50/month in ad revenue",
                action: "View Analytics"
              },
              {
                icon: <Gift className="w-5 h-5 text-pink-500" />,
                title: "Enable Gifting",
                description: "Creators with gifting enabled earn 40% more",
                action: "Enable Gifting"
              }
            ].map((tip, index) => (
              <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">{tip.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">{tip.title}</h4>
                    <p className="text-zinc-400 text-sm mb-3">{tip.description}</p>
                    <button className="text-purple-400 text-sm font-bold hover:text-purple-300 transition-colors">
                      {tip.action} →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payout Settings Modal */}
      {showPayoutSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50">
          <div className="bg-[#09090B] border border-white/10 rounded-3xl p-8 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Payout Settings</h2>
              <button
                onClick={() => setShowPayoutSettings(false)}
                className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Payout Method</label>
                <select className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:border-purple-500/50 outline-none font-bold">
                  <option value="paypal">PayPal</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="crypto">Cryptocurrency</option>
                </select>
              </div>
              
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">PayPal Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:border-purple-500/50 outline-none font-bold"
                  defaultValue={payoutInfo?.email}
                />
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-zinc-400">Total Earnings</span>
                  <span className="text-lg font-black text-green-500">
                    {formatCurrency(payoutInfo?.totalEarnings || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-400">Pending Amount</span>
                  <span className="text-lg font-black text-yellow-500">
                    {formatCurrency(payoutInfo?.pendingAmount || 0)}
                  </span>
                </div>
              </div>
              
              <button className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-purple-500 transition-all">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
