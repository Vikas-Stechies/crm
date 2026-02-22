// server/ai.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// UPDATE THIS LINE: Use the current Gemini 2.0/2.5 Flash model
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function askAI(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    throw new Error(`Google API Error: ${error.message}`);
  }
}