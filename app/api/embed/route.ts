import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid text parameter' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);
    
    return NextResponse.json({ embedding: result.embedding.values });
  } catch (error) {
    console.error('Embedding generation failed:', error);
    // Return zero vector as fallback
    return NextResponse.json({ embedding: new Array(768).fill(0) });
  }
}
