import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "@/lib/ai/config";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  }
  return client;
}
