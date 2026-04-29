import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

/**
 * テキストをAIベクトル（埋め込み）に変換します
 * @param text タイトルやゲーム名などのテキスト
 * @returns 768次元の数値配列（ベクトル）
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    // 失敗した場合は空の配列を返すか、エラーをスロー
    return new Array(768).fill(0);
  }
}
