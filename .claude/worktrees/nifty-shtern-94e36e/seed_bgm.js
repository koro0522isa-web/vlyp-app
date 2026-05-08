require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedBGM() {
  const bgms = [
    {
      title: 'Neon Drift',
      artist: 'VLYP AI Music',
      duration_seconds: 120,
      url: 'https://cdn.pixabay.com/download/audio/2022/10/18/audio_31c2730e64.mp3', // Synthwave placeholder
      is_premium: false,
    },
    {
      title: 'Phonk Aggressive',
      artist: 'NCS Release',
      duration_seconds: 155,
      url: 'https://cdn.pixabay.com/download/audio/2023/04/18/audio_249219e2c6.mp3', // Phonk placeholder
      is_premium: true,
    },
    {
      title: 'Lofi Chill Gaming',
      artist: 'VLYP Beats',
      duration_seconds: 180,
      url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', // Lofi placeholder
      is_premium: false,
    }
  ];

  for (const bgm of bgms) {
    const { data, error } = await supabase.from('bgm_library').insert(bgm);
    if (error) {
      console.error('Failed to insert', bgm.title, error.message);
    } else {
      console.log('Inserted', bgm.title);
    }
  }
}

seedBGM();
