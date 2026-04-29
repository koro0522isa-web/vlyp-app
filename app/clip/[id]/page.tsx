import { Metadata, ResolvingMetadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

// Initialize Supabase admin client for server-side fetching
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

type Props = {
  params: { id: string }
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  
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
  
  let imageUrl = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop'; // Default gaming fallback

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
  // ユーザーがブラウザで開いた場合は、メイン画面（フィード）の該当クリップへリダイレクト
  redirect(`/?clip=${params.id}`);
}
