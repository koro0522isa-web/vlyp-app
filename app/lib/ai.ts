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
