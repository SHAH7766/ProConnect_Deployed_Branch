import { GoogleGenAI } from "@google/genai";

const cleanEnvValue = (value) => value?.trim().replace(/^['"]|['"]$/g, '');

const getGeminiKey = () => cleanEnvValue(process.env.GEMINI_KEY || process.env.GEMINI_API_KEY);

export const askGemini = async (prompt) => {
    const apiKey = getGeminiKey();

    if (!apiKey) {
        throw new Error("Gemini API key is missing");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    return response.text;
};
