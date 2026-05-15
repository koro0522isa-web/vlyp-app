import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `VLYP Clip #${id}`,
    robots: { index: false },
  };
}

export default async function EmbedPage({ params }: Props) {
  const { id } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vlyp-app.vercel.app';

  if (!url || !key) notFound();

  const supabase = createClient(url, key);
  const { data: clip } = await supabase
    .from('clips')
    .select('*, profiles(display_name, vlyp_id, avatar_url)')
    .eq('id', id)
    .single();

  if (!clip || clip.status === 'private') notFound();

  const videoUrl = clip.video_url || clip.url || '';
  const playerName = clip.profiles?.display_name || clip.profiles?.vlyp_id || 'Player';
  const gameTitle = clip.game_title || '';

  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{clip.title || 'VLYP Clip'}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; color: #fff; font-family: -apple-system, sans-serif; height: 100vh; display: flex; flex-direction: column; }
          video { width: 100%; flex: 1; object-fit: contain; background: #000; }
          .bar { padding: 8px 12px; background: #09090b; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid rgba(255,255,255,0.08); }
          .info { display: flex; flex-direction: column; }
          .title { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
          .meta { font-size: 11px; color: #71717a; }
          .logo { font-size: 14px; font-weight: 900; color: #a78bfa; text-decoration: none; white-space: nowrap; }
          .logo span { font-size: 10px; color: #52525b; display: block; font-weight: 400; text-align: right; }
        `}</style>
      </head>
      <body>
        <video
          src={videoUrl}
          controls
          autoPlay
          playsInline
          loop
          poster={clip.thumbnail_url ?? ''}
        />
        <div className="bar">
          <div className="info">
            <div className="title">{clip.title || 'VLYP Clip'}</div>
            <div className="meta">@{playerName}{gameTitle ? ` · ${gameTitle}` : ''}</div>
          </div>
          <a href={`${siteUrl}/clip/${id}`} target="_blank" rel="noopener noreferrer" className="logo">
            VLYP
            <span>で見る</span>
          </a>
        </div>
      </body>
    </html>
  );
}
