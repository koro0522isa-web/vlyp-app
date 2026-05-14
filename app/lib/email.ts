import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'VLYP <noreply@vlyp.app>';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vlyp-app.vercel.app';

// ─── ウェルカムメール ───────────────────────────────────────────
export async function sendWelcomeEmail(to: string, vlypId: string) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'VLYPへようこそ！ゲームクリップを投稿しよう',
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090B;font-family:-apple-system,sans-serif;color:#fff;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:28px;font-weight:900;color:#a78bfa;margin:0;">VLYP</h1>
      <p style="color:#52525b;font-size:12px;margin:4px 0 0;">日本のゲーマーのためのクリッププラットフォーム</p>
    </div>
    <h2 style="font-size:20px;font-weight:800;margin:0 0 12px;">ようこそ、@${vlypId} さん！</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0 0 24px;">
      VLYPへの登録ありがとうございます。<br>
      ゲームのベストシーンをショート動画で共有しましょう。
    </p>
    <div style="background:#18181b;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 12px;">まずやること</p>
      <p style="font-size:13px;color:#a1a1aa;margin:0 0 8px;">① プロフィールを設定する</p>
      <p style="font-size:13px;color:#a1a1aa;margin:0 0 8px;">② 動画を投稿してみる</p>
      <p style="font-size:13px;color:#a1a1aa;margin:0;">③ 他のゲーマーの動画を見る</p>
    </div>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${BASE_URL}/post" style="display:inline-block;background:#a78bfa;color:#000;font-weight:800;font-size:14px;padding:14px 32px;border-radius:100px;text-decoration:none;">
        最初のクリップを投稿する
      </a>
    </div>
    <p style="color:#3f3f46;font-size:11px;text-align:center;margin:0;">
      © 2026 VLYP Inc. · <a href="${BASE_URL}/settings" style="color:#52525b;">配信停止</a>
    </p>
  </div>
</body>
</html>`,
  });
}

// ─── フォロー通知 ───────────────────────────────────────────────
export async function sendFollowEmail(to: string, followerVlypId: string) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `@${followerVlypId} さんがあなたをフォローしました`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#09090B;font-family:-apple-system,sans-serif;color:#fff;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <h1 style="font-size:22px;font-weight:900;color:#a78bfa;margin:0 0 24px;">VLYP</h1>
    <p style="font-size:16px;font-weight:700;margin:0 0 8px;">
      @${followerVlypId} さんがあなたをフォローしました！
    </p>
    <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">フォローし返してつながりを広げましょう。</p>
    <a href="${BASE_URL}/profile/${followerVlypId}" style="display:inline-block;background:#a78bfa;color:#000;font-weight:800;font-size:14px;padding:12px 28px;border-radius:100px;text-decoration:none;">
      プロフィールを見る
    </a>
    <p style="color:#3f3f46;font-size:11px;margin:32px 0 0;">© 2026 VLYP Inc.</p>
  </div>
</body>
</html>`,
  });
}

// ─── 投げ銭受信通知 ─────────────────────────────────────────────
export async function sendGiftReceivedEmail(to: string, senderVlypId: string, amount: number, clipTitle: string) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `@${senderVlypId} さんから ${amount}コインをもらいました！`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#09090B;font-family:-apple-system,sans-serif;color:#fff;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <h1 style="font-size:22px;font-weight:900;color:#a78bfa;margin:0 0 24px;">VLYP</h1>
    <div style="background:#18181b;border:1px solid #fbbf24;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="font-size:32px;margin:0 0 8px;">🪙</p>
      <p style="font-size:22px;font-weight:900;color:#fbbf24;margin:0 0 4px;">${amount} コイン</p>
      <p style="color:#a1a1aa;font-size:13px;margin:0;">「${clipTitle}」へのサポート</p>
    </div>
    <p style="font-size:14px;color:#a1a1aa;margin:0 0 24px;">
      @${senderVlypId} さんがあなたの動画を気に入ってくれました！
    </p>
    <a href="${BASE_URL}" style="display:inline-block;background:#fbbf24;color:#000;font-weight:800;font-size:14px;padding:12px 28px;border-radius:100px;text-decoration:none;">
      VLYPを開く
    </a>
    <p style="color:#3f3f46;font-size:11px;margin:32px 0 0;">© 2026 VLYP Inc.</p>
  </div>
</body>
</html>`,
  });
}

// ─── 新規コメント通知 ───────────────────────────────────────────
export async function sendCommentEmail(to: string, commenterVlypId: string, comment: string, clipId: number) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `@${commenterVlypId} さんがコメントしました`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#09090B;font-family:-apple-system,sans-serif;color:#fff;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <h1 style="font-size:22px;font-weight:900;color:#a78bfa;margin:0 0 24px;">VLYP</h1>
    <p style="font-size:15px;font-weight:700;margin:0 0 12px;">@${commenterVlypId} さんのコメント:</p>
    <div style="background:#18181b;border-left:3px solid #a78bfa;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <p style="font-size:14px;color:#e4e4e7;margin:0;">"${comment.slice(0, 100)}${comment.length > 100 ? '...' : ''}"</p>
    </div>
    <a href="${BASE_URL}/clip/${clipId}" style="display:inline-block;background:#a78bfa;color:#000;font-weight:800;font-size:14px;padding:12px 28px;border-radius:100px;text-decoration:none;">
      動画を見る
    </a>
    <p style="color:#3f3f46;font-size:11px;margin:32px 0 0;">© 2026 VLYP Inc.</p>
  </div>
</body>
</html>`,
  });
}
