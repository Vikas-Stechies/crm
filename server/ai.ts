import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// Using gemini-1.5-flash for fast, multimodal tasks
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function askAI(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate AI content");
  }
}