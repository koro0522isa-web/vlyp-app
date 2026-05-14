import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vlyp-app.vercel.app';

  if (!url || !key) return { title: 'VLYP' };

  const supabase = createClient(url, key);
  const { data: profile } = await supabase
    .from('profiles')
    .select('vlyp_id, display_name, bio, avatar_url')
    .eq('id', id)
    .single();

  if (!profile) return { title: 'Player | VLYP' };

  const name = profile.display_name || profile.vlyp_id || 'Player';
  const title = `@${profile.vlyp_id || name} | VLYP`;
  const description = profile.bio
    ? `${profile.bio} — VLYPでゲームクリップを公開中`
    : `@${profile.vlyp_id || name} のゲームクリップをVLYPで見る`;

  const image = profile.avatar_url ?? `${siteUrl}/ogp.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 400, height: 400, alt: name }],
      type: 'profile',
      url: `${siteUrl}/profile/${id}`,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [image],
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
