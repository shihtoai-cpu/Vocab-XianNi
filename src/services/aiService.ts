/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ClozeOption {
  word: string;
  meaning: string;
}

export interface ClozeQuestion {
  sentence: string; // The sentence with "[____]" for the blank
  answer: string;   // The correct English word
  options: ClozeOption[]; // 4 options including the answer with their meanings
  analysis: string; // Detailed analysis of the question
  translation: string; // Chinese translation of the sentence
}

/**
 * Generates a cloze question using Gemini AI based on the target word.
 * Context: Cultivation/Xianxia theme.
 */
export async function generateClozeQuestion(
  targetWord: string, 
  targetZh: string, 
  distractors: string[], 
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<ClozeQuestion> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const difficultyHint = {
    easy: "基礎啟蒙：語法極簡，句子【絕對】要在 5 到 10 個單字以內，適合國小初學者。內容要是平鋪直敘的場景（如：I like to [____] books.），不要有任何從句或複雜結構。",
    medium: "進階程度：語法中等，包含複句，約高中/大學程度詞彙。內容應包含『台灣時事新聞』、『學術教科書』或『歷屆考題風格』。",
    hard: "神階程度：語法複雜，涉及專業領域或古風修辭。內容應包含『國際時事』、『深奧科學/道法』或『文學經典』。"
  }[difficulty];

  const prompt = `
    你是一位全能的語言大師與修仙導師。
    請分別針對英文單字 "${targetWord}" (中文意思: ${targetZh})，生成一個具有質感的英文例句。
    
    難度分級指導：${difficultyHint}
    
    風格要求：
    1. 對於基礎啟蒙級別，句子必須極短且單純。
    2. 不要只限於修仙小說，請嘗試融入「台灣時事」、「環境科技」、「人文地理」或「學術脈絡」。
    3. 語氣要保持「神卷」的優雅與莊嚴，但內容要務實且具備學習價值。
    
    規則：
    1. 例句必須包含 "${targetWord}"。
    2. 請將例句中的 "${targetWord}" 替換為 "[____]"。
    3. 提供另外 3 個具有誤導性但詞性相同的英文單字作為干擾項。
    4. 總共提供 4 個選項（包含正確答案 "${targetWord}"），並打亂順序。
    5. 為每個選項提供簡短的中文意思。
    6. 提供該例句的優美中文翻譯。
    7. 提供「神卷解析」：解釋為什麼選這個答案，以及該單字在句中的用法（約 50-100 字）。
    
    請直接返回 JSON 格式，不要包含 Markdown 標記：
    {
      "sentence": "...",
      "answer": "${targetWord}",
      "options": [
        {"word": "${targetWord}", "meaning": "${targetZh}"},
        {"word": "...", "meaning": "..."},
        {"word": "...", "meaning": "..."},
        {"word": "...", "meaning": "..."}
      ],
      "translation": "...",
      "analysis": "..."
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    // Remove potential markdown block markers
    const jsonStr = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(jsonStr);
    return data as ClozeQuestion;
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Fallback if AI fails
    return {
      sentence: `[____] was essential for his survival.`,
      answer: targetWord,
      options: [
        { word: targetWord, meaning: targetZh },
        ...distractors.slice(0, 3).map(d => ({ word: d, meaning: "干擾項" }))
      ],
      analysis: `此題考查對 "${targetWord}" 的理解。在修真界中，${targetZh} 是生存的關鍵。`,
      translation: `${targetZh} 對他的生存至關重要。`
    };
  }
}
