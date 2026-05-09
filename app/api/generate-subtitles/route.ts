import { NextRequest, NextResponse } from 'next/server';

interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audioBlob') as File | null;
    const language = (formData.get('language') as string) || 'ja';

    if (!audioBlob) {
      return NextResponse.json(
        { error: 'audioBlob is required' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured.' },
        { status: 500 }
      );
    }

    const audioBuffer = await audioBlob.arrayBuffer();

    const whisperFormData = new FormData();
    whisperFormData.append(
      'file',
      new Blob([audioBuffer], { type: 'audio/mpeg' }),
      'audio.mp3'
    );
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('response_format', 'verbose_json');
    if (language !== 'auto') {
      whisperFormData.append('language', language);
    }

    const whisperResponse = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiApiKey}` },
        body: whisperFormData,
      }
    );

    if (!whisperResponse.ok) {
      const errorData = await whisperResponse.json();
      console.error('Whisper API error:', errorData);
      return NextResponse.json(
        { error: 'Whisper API failed', details: errorData },
        { status: whisperResponse.status }
      );
    }

    const whisperData = await whisperResponse.json();

    const subtitles: Subtitle[] = (whisperData.segments || []).map(
      (seg: { start: number; end: number; text: string }) => ({
        startTime: seg.start,
        endTime: seg.end,
        text: seg.text.trim(),
      })
    );

    return NextResponse.json({
      success: true,
      subtitles,
      language: whisperData.language || language,
    });
  } catch (error) {
    console.error('Subtitle generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate subtitles',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
