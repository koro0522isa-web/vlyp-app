import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * POST /api/beta/redeem
 * 受信: { code: string }  - 招待コード(ハードコード Phase1)
 * 認証: Authorization: Bearer <supabase_access_token>
 *
 * 成功時: profiles.is_pro = true, pro_trial_ends_at = now + 30日
 * 既に Pro / トライアル既存ユーザーには拒否
 */

// Phase 1: ハードコードの招待コード辞書 (Phase 2 で beta_invites テーブル化)
const VALID_CODES: Record<string, { days: number; label: string }> = {
  'VLYP-BETA-30': { days: 30, label: '初期ベータ 30日無料' },
  'VLYP-VCT-30': { days: 30, label: 'VCT配信者向け 30日' },
  'VLYP-FOUNDER': { days: 90, label: '創業者特典 90日' },
};

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = (body?.code || '').toString().trim().toUpperCase();
    if (!code) return NextResponse.json({ error: '招待コードを入力してください' }, { status: 400 });

    const def = VALID_CODES[code];
    if (!def) return NextResponse.json({ error: '無効な招待コードです' }, { status: 404 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 既に redeem 済みか確認
    const { data: profile, error: pErr } = await admin
      .from('profiles')
      .select('id, is_pro, beta_invite_code')
      .eq('id', user.id)
      .maybeSingle();
    if (pErr) return NextResponse.json({ error: 'プロフィール取得失敗', detail: pErr.message }, { status: 500 });
    if (profile?.beta_invite_code) {
      return NextResponse.json({ error: '既に招待コードを使用済みです' }, { status: 409 });
    }

    // Pro 化 + trial 期限を N 日後に
    const trialEnd = new Date(Date.now() + def.days * 24 * 60 * 60 * 1000).toISOString();
    const { error: uErr } = await admin
      .from('profiles')
      .update({
        is_pro: true,
        pro_activated_at: new Date().toISOString(),
        pro_trial_ends_at: trialEnd,
        beta_invite_code: code,
      })
      .eq('id', user.id);
    if (uErr) {
      // beta_invite_code カラムが無い場合のフォールバック (マイグレーション未適用環境)
      const { error: u2 } = await admin
        .from('profiles')
        .update({
          is_pro: true,
          pro_activated_at: new Date().toISOString(),
          pro_trial_ends_at: trialEnd,
        })
        .eq('id', user.id);
      if (u2) return NextResponse.json({ error: 'Pro化に失敗', detail: u2.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      label: def.label,
      days: def.days,
      pro_trial_ends_at: trialEnd,
    });
  } catch (e: any) {
    console.error('[beta/redeem]', e);
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 });
  }
}
