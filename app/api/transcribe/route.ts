import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
// Vercel Serverless Function: Hobby なら 10s デフォルト → 字幕長くなる可能性あるので 60s に伸ばす
export const maxDuration = 60;

/**
 * POST /api/transcribe
 * 受信: multipart/form-data { audio: File (mp3/m4a, mono推奨, 16kHz推奨, <4MB) }
 * 戻り値: SRT 文字列 (text/plain)
 *
 * env OPENAI_API_KEY 必須。無ければ 503 を返してクライアントが字幕無しでfallback。
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY が未設定です。Vercel の環境変数にセットしてください。' },
      { status: 503 }
    );
  }

  try {
    const incoming = await req.formData();
    const audio = incoming.get('audio') as File | null;
    if (!audio) {
      return NextResponse.json({ error: 'audio file が必要です' }, { status: 400 });
    }
    if (audio.size === 0) {
      return NextResponse.json({ error: 'audio file が空です' }, { status: 400 });
    }
    if (audio.size > 25 * 1024 * 1024) {
      // OpenAI Whisper の上限 25MB
      return NextResponse.json({ error: 'audio file が大きすぎます (25MB上限)' }, { status: 413 });
    }

    const language = (incoming.get('language') as string | null) ?? 'ja';

    const upstream = new FormData();
    upstream.append('file', audio, audio.name || 'audio.mp3');
    upstream.append('model', 'whisper-1');
    upstream.append('response_format', 'srt');
    upstream.append('language', language);

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream as any,
    });

    if (!r.ok) {
      const text = await r.text();
      console.error('[transcribe] upstream error', r.status, text);
      return NextResponse.json(
        { error: `Whisper API error ${r.status}`, detail: text },
        { status: 502 }
      );
    }

    const srt = await r.text();
    return new NextResponse(srt, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (e: any) {
    console.error('[transcribe] exception', e);
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 });
  }
}
