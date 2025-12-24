
import { GoogleGenAI, Type } from "@google/genai";
import { MoodConfig } from "../types";

export const getMoodConfig = async (prompt: string): Promise<MoodConfig> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate this mood into a lighting configuration: "${prompt}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          color: { type: Type.STRING, description: "Hex color code" },
          pulseSpeed: { type: Type.NUMBER, description: "Pulse speed from 0 to 1000 (ms)" },
          intensity: { type: Type.NUMBER, description: "Light intensity 0 to 1.0" },
          description: { type: Type.STRING, description: "Brief description of the mood interpretation" }
        },
        required: ["color", "pulseSpeed", "intensity", "description"]
      }
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text);
};

export const generateMorseCode = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Convert this text to standard Morse code (dots and dashes only, spaces between letters): "${text}"`,
  });
  return (response.text || "").trim();
};
