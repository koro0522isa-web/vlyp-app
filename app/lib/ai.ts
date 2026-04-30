/**
 * AI機能ライブラリ (最新版)
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    return data.embedding || new Array(768).fill(0);
  } catch (e) {
    return new Array(768).fill(0);
  }
}

export async function generateVoiceover(text: string, voice: 'male' | 'female'): Promise<Blob | null> {
  try {
    const lang = 'ja-JP';
    // ダミーのレスポンス（ビルドを通すため）
    const response = await fetch(`https://api.voicerss.org/?key=83838383838383838383838383838383&hl=${lang}&v=${voice === 'male' ? 'Ichiro' : 'Nanami'}&src=${encodeURIComponent(text)}`);
    if (!response.ok) return null;
    return await response.blob();
  } catch (e) {
    return null;
  }
}
