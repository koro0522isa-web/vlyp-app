import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials not configured');
  return createClient(url, key);
}

// 月次収益プール分配 - 管理者専用エンドポイント
// POST /api/monetization/distribute-pool
// Body: { month: "YYYY-MM", extra_ad_revenue?: number }
// Headers: { "x-admin-secret": process.env.ADMIN_SECRET }
export async function POST(request: NextRequest) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { month?: string; extra_ad_revenue?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const month = body.month || new Date().toISOString().slice(0, 7); // デフォルトは今月
  const extraAdRevenue = typeof body.extra_ad_revenue === 'number' ? body.extra_ad_revenue : 0;

  const supabaseAdmin = getAdminClient();

  try {
    const { data, error } = await supabaseAdmin.rpc('distribute_monthly_revenue_pool', {
      p_month: month,
      p_extra_ad_revenue: extraAdRevenue
    });

    if (error) {
      console.error('Distribution error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// GET /api/monetization/distribute-pool?month=YYYY-MM
// 分配結果の確認（管理者専用）
export async function GET(request: NextRequest) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  const supabaseAdmin = getAdminClient();

  const [{ data: pool }, { data: snapshots }] = await Promise.all([
    supabaseAdmin
      .from('monthly_revenue_pools')
      .select('*')
      .eq('month', month)
      .maybeSingle(),
    supabaseAdmin
      .from('monthly_view_snapshots')
      .select('*, profiles(display_name, username)')
      .eq('pool_id', (await supabaseAdmin.from('monthly_revenue_pools').select('id').eq('month', month).maybeSingle()).data?.id || 0)
      .order('revenue_allocated', { ascending: false })
      .limit(50)
  ]);

  return NextResponse.json({
    month,
    pool: pool || null,
    topCreators: snapshots || [],
    rpm: pool ? Math.round((pool.pool_amount / Math.max(pool.total_qualifying_views, 1)) * 1000 * 100) / 100 : 0
  });
}
