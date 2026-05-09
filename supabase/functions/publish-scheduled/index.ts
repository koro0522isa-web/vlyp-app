// Supabase Edge Function: publish-scheduled
//
// Deploy command:
//   supabase functions deploy publish-scheduled --project-ref hpozodliggxykeroudtx
//
// Cron trigger (set in Supabase Dashboard > Edge Functions > Schedule):
//   Every 5 minutes: */5 * * * *
//
// Manual invoke:
//   curl -X POST https://hpozodliggxykeroudtx.supabase.co/functions/v1/publish-scheduled \
//     -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('clips')
    .update({ status: 'published' })
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .select('id, title')

  if (error) {
    console.error('publish-scheduled error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`published ${data?.length ?? 0} clips`)
  return new Response(
    JSON.stringify({ published: data?.length ?? 0, clips: data }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
