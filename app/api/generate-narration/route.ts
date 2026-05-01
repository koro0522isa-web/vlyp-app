import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'female', language = 'ja' } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // VoiceRSS API を使用して音声を生成
    const voiceRSSKey = process.env.VOICERSS_API_KEY;
    if (!voiceRSSKey) {
      return NextResponse.json(
        { error: 'VoiceRSS API key not configured' },
        { status: 500 }
      );
    }

    const voiceMap: { [key: string]: string } = {
      'female': 'ja_JP_Female',
      'male': 'ja_JP_Male'
    };

    const voiceParam = voiceMap[voice] || voiceMap['female'];

    const response = await fetch('https://api.voicerss.org/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        key: voiceRSSKey,
        src: text.trim(),
        hl: language === 'ja' ? 'ja_jp' : 'en_us',
        v: voiceParam,
        r: '0',
        c: 'mp3',
        f: '44khz_16bit_mono'
      }).toString()
    });

    if (!response.ok) {
      console.error('VoiceRSS API error:', response.statusText);
      return NextResponse.json(
        { error: `VoiceRSS API error: ${response.statusText}` },
        { status: 500 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString()
      }
    });
  } catch (error) {
    console.error('Narration generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate narration' },
      { status: 500 }
    );
  }
}
