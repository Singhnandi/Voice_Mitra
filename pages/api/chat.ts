// File: pages/api/chat.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const MODEL_NAME = "models/gemini-1.5-flash";  // <-- We will likely change this after debugging
const API_KEY = process.env.GEMINI_API_KEY || "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("API route /api/chat hit with method:", req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  if (!API_KEY) {
    console.error("CRITICAL: Gemini API key is missing or not loaded from .env.local");
    return res.status(500).json({ error: "Gemini API key not configured on server." });
  }
  console.log("Gemini API Key loaded successfully.");

  try {
    const { prompt } = req.body;
    console.log("Received prompt:", prompt);

    if (!prompt) {
      console.error("No prompt was provided in the request body.");
      return res.status(400).json({ error: "No prompt provided." });
    }
    
    const genAI = new GoogleGenerativeAI(API_KEY);

    // --- NEW DEBUGGING CODE START ---
    console.log("\n--- Listing available models for your project ---");
    try {
      const { models } = await genAI.listModels();
      const availableModels: string[] = [];
      for (const model of models) {
        // Filter models that support text generation (often via 'generateContent')
        if (model.supportedGenerationMethods?.includes('generateContent')) {
          console.log(`- Found model: ${model.name}`);
          availableModels.push(model.name);
        }
      }
      if (availableModels.length === 0) {
        console.error("No text generation models found for your API key!");
      } else {
        console.log(`\n** RECOMMENDED MODEL FOR TEXT: ${availableModels[0]} **`);
      }
    } catch (listError) {
      console.error("Error listing models:", listError);
    }
    console.log("--- End of model listing ---\n");
    // --- NEW DEBUGGING CODE END ---


    // Use the model as originally intended
    const model = genAI.getGenerativeModel({ model: MODEL_NAME }); // Still using MODEL_NAME for now

    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };
    
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];
    
    console.log(`Attempting to generate content with model: ${MODEL_NAME}`);
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
    });
    
    console.log("Received response from Gemini API.");
    const responseText = result.response.text();
    
    return res.status(200).json({ text: responseText });

  } catch (error) {
    console.error("!!!!!!!!!! ERROR CALLING GEMINI API !!!!!!!!!!");
    console.error(error); 
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return res.status(500).json({ error: `Server error: ${errorMessage}` });
  }
}