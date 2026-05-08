import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Revenue calculation and monetization API
export async function GET(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // 'day', 'week', 'month', 'year'
    const userId = session.user.id;

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Fetch user's revenue data
    const [
      { data: adRevenue },
      { data: subscriptionRevenue },
      { data: giftRevenue },
      { data: clipRevenue },
      { data: streamRevenue }
    ] = await Promise.all([
      // Ad revenue from clips
      supabase
        .from('ad_revenue')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'paid'),
      
      // Subscription revenue (Pro users watching their content)
      supabase
        .from('subscription_revenue')
        .select('*')
        .eq('creator_id', userId)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'paid'),
      
      // Gift/VLYP coin revenue
      supabase
        .from('gift_transactions')
        .select('*')
        .eq('receiver_id', userId)
        .gte('created_at', startDate.toISOString()),
      
      // Premium clip sales
      supabase
        .from('clip_sales')
        .select('*')
        .eq('creator_id', userId)
        .gte('created_at', startDate.toISOString()),
      
      // Streaming revenue
      supabase
        .from('stream_revenue')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'paid')
    ]);

    // Calculate totals
    const revenueData = {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      
      // Revenue sources
      adRevenue: {
        amount: adRevenue?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
        transactions: adRevenue?.length || 0,
        cpm: calculateCPM(adRevenue || [])
      },
      
      subscriptionRevenue: {
        amount: subscriptionRevenue?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
        transactions: subscriptionRevenue?.length || 0,
        subscribers: subscriptionRevenue?.length || 0
      },
      
      giftRevenue: {
        amount: giftRevenue?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
        transactions: giftRevenue?.length || 0,
        gifts: giftRevenue?.length || 0
      },
      
      clipRevenue: {
        amount: clipRevenue?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
        transactions: clipRevenue?.length || 0,
        sales: clipRevenue?.length || 0
      },
      
      streamRevenue: {
        amount: streamRevenue?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
        transactions: streamRevenue?.length || 0,
        streams: streamRevenue?.length || 0,
        avgViewers: calculateAverageViewers(streamRevenue || [])
      },
      
      // Totals
      totalRevenue: 0,
      totalTransactions: 0
    };

    // Calculate total revenue
    revenueData.totalRevenue = 
      revenueData.adRevenue.amount +
      revenueData.subscriptionRevenue.amount +
      revenueData.giftRevenue.amount +
      revenueData.clipRevenue.amount +
      revenueData.streamRevenue.amount;

    revenueData.totalTransactions = 
      revenueData.adRevenue.transactions +
      revenueData.subscriptionRevenue.transactions +
      revenueData.giftRevenue.transactions +
      revenueData.clipRevenue.transactions +
      revenueData.streamRevenue.transactions;

    // Get performance metrics
    const { data: performance } = await supabase
      .from('performance_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    return NextResponse.json({
      success: true,
      revenue: revenueData,
      performance: performance || [],
      payoutInfo: await getPayoutInfo(userId)
    });

  } catch (error) {
    console.error('Revenue API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, amount, metadata } = await request.json();

    // Create revenue record
    const { data: revenue, error } = await supabase
      .from('revenue_records')
      .insert({
        user_id: session.user.id,
        type,
        amount,
        metadata,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !revenue) {
      console.error('Revenue record creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create revenue record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      revenue
    });

  } catch (error) {
    console.error('Revenue creation API error:', error);
    return NextResponse.json(
      { error: 'Failed to create revenue record' },
      { status: 500 }
    );
  }
}

function calculateCPM(adRevenue: any[]): number {
  const totalImpressions = adRevenue.reduce((sum, item) => sum + (item.impressions || 0), 0);
  const totalRevenue = adRevenue.reduce((sum, item) => sum + (item.amount || 0), 0);
  return totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0;
}

function calculateAverageViewers(streamRevenue: any[]): number {
  if (streamRevenue.length === 0) return 0;
  const totalViewers = streamRevenue.reduce((sum, item) => sum + (item.avg_viewers || 0), 0);
  return Math.round(totalViewers / streamRevenue.length);
}

async function getPayoutInfo(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('payout_method, payout_email, payout_address, total_earnings, pending_payouts')
    .eq('id', userId)
    .single();

  const { data: pendingPayouts } = await supabase
    .from('payouts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending');

  return {
    method: profile?.payout_method || 'paypal',
    email: profile?.payout_email,
    address: profile?.payout_address,
    totalEarnings: profile?.total_earnings || 0,
    pendingAmount: pendingPayouts?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
    nextPayoutDate: getNextPayoutDate()
  };
}

function getNextPayoutDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}
