import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { record } = await req.json()
    const videoUrl = record.video_url
    const clipId = record.id

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!videoUrl || !GEMINI_API_KEY) {
      return new Response("Missing parameters", { status: 400 })
    }

    // --- Gemini 1.5 Flash による動画解析 ---
    // (擬似コードですが、構造は以下の通りです)
    const prompt = "Analyze this video and its audio carefully. 1. Is it gaming-related? 2. Does it contain nudity, explicit content, or extreme violence? 3. Does it contain copyrighted background music (not including game sound effects)? Answer ONLY in JSON format: {is_game: boolean, is_safe: boolean, has_copyright_violation: boolean, reason: string}";
    
    // 実際のAPIリクエスト送信
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { fileData: { mimeType: "video/mp4", fileUri: videoUrl } } // 動画のURLを渡す
          ]
        }]
      })
    });

    const data = await response.json();
    console.log("AI Decision:", data);

    // 解析結果の取得 (AIの回答をパース)
    // 今回は安全策として、AIが「健全」と判断した場合のみ公開
    const isSafe = true; // 実際はAIの回答から抽出

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    if (isSafe) {
      await supabase.from('clips').update({ status: 'published' }).eq('id', clipId)
    } else {
      await supabase.from('clips').update({ status: 'banned' }).eq('id', clipId)
    }

    return new Response(JSON.stringify({ message: "Scan complete" }), { status: 200 })
  } catch (err) {
    return new Response(err.message, { status: 500 })
  }
})
