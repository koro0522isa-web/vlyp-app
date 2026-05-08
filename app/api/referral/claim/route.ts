import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/referral/claim
 * Body: { referral_code: string }
 *
 * 1. Verify calling user is authenticated
 * 2. Find the owner of referral_code
 * 3. Make sure this user hasn't claimed a referral before (referred_by is null)
 * 4. Grant +50 coins to both parties
 * 5. Set profiles.referred_by = referrer.id for caller
 */
export async function POST(request: Request) {
  try {
    const { referral_code } = await request.json();
    if (!referral_code) return NextResponse.json({ error: 'Missing referral_code' }, { status: 400 });

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch caller's profile
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id, wallet_coins, referred_by, referral_code')
      .eq('id', user.id)
      .maybeSingle();

    if (!callerProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Already used a referral?
    if (callerProfile.referred_by) {
      return NextResponse.json({ error: 'Referral already claimed' }, { status: 409 });
    }

    // Can't refer yourself
    if (callerProfile.referral_code === referral_code) {
      return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 });
    }

    // Find referrer
    const { data: referrer } = await supabase
      .from('profiles')
      .select('id, wallet_coins')
      .eq('referral_code', referral_code)
      .maybeSingle();

    if (!referrer) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });

    // Grant 50 coins to caller
    await supabase
      .from('profiles')
      .update({
        wallet_coins: (callerProfile.wallet_coins || 0) + 50,
        referred_by: referrer.id,
      })
      .eq('id', user.id);

    // Grant 50 coins to referrer
    await supabase
      .from('profiles')
      .update({ wallet_coins: (referrer.wallet_coins || 0) + 50 })
      .eq('id', referrer.id);

    return NextResponse.json({ success: true, coins_granted: 50 });
  } catch (err: any) {
    console.error('[VLYP] Referral claim error:', err);
    return Next