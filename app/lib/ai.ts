/**
 * テキストをAIベクトル（埋め込み）に変換します（サーバーサイドAPI経由）
 * @param text タイトルやゲーム名などのテキスト
 * @returns 768次元の数値配列（ベクトル）
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      throw new Error(`Embedding API failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    // 失敗した場合は空の配列を返す
    return new Array(768).fill(0);
  }
}

/**
 * テキストを音声（ナレーション）に変換します (Pro機能)
 * @param text 読み上げるテキスト
 * @param voice 声の種類 ('male' | 'female')
 * @returns 音声データのBlob
 */
export async function generateVoiceover(text: string, voice: 'male' | 'female'): Promise<Blob | null> {
  try {
    // 実際の実装ではOpenAI TTSやGoogle Cloud TTSなどのAPIを呼び出します
    const lang = 'ja-JP';
    
    // VoiceRSS API (Demo Key)
    const response = await fetch(`https://api.voicerss.org/?key=83838383838383838383838383838383&hl=${lang}&v=${voice === 'male' ? 'Ichiro' : 'Nanami'}&src=${encodeURIComponent(text)}`);
    
    if (!response.ok) {
      throw new Error('TTS generation failed');
    }
    
    return await response.blob();
  } catch (error) {
    console.error("Voiceover generation failed:", error);
    return null;
  }
}
