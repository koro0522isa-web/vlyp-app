import { Metadata, ResolvingMetadata } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

/** ビルド時やプレビューで env が空のとき createClient を呼ばない（supabaseUrl is required 対策） */
function createSupabaseAnon(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

type Props = {
  params: Promise<{ id: string }>
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;

  const supabase = createSupabaseAnon();
  if (!supabase) {
    return { title: 'VLYP' };
  }

  // Fetch clip data
  const { data: clip } = await supabase
    .from('clips')
    .select('*, profiles(display_name)')
    .eq('id', id)
    .single();

  if (!clip) {
    return {
      title: 'Clip not found | VLYP',
    };
  }

  const title = `${clip.title} by @${clip.profiles?.display_name || 'Player'}`;
  const description = `Watch this amazing ${clip.game_title || 'gaming'} play on VLYP!`;
  
  let imageUrl = '/ogp.png'; // Use our own OGP image as fallback

  // Extract YouTube ID if legacy YouTube clip
  const ytMatch = (clip.url || clip.video_url)?.match(/(?:v=|\/embed\/|\.be\/)([^&?/]{11})/);
  if (ytMatch) {
    imageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [imageUrl],
      videos: clip.video_url && !ytMatch ? [{ url: clip.video_url }] : [],
      type: 'video.other',
    },
    twitter: {
      card: ytMatch ? 'summary_large_image' : 'player',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ClipPage({ params }: Props) {
  const { id } = await params;
  // ユーザーがブラウザで開いた場合は、メイン画面（フィード）の該当クリップへリダイレクト
  redirect(`/?clip=${id}`);
}
