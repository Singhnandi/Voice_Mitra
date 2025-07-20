// File: pages/api/chat.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// --- Configuration ---
// The specific model we want to use.
const MODEL_NAME = "models/gemini-1.5-flash"; 
// Safely get the API key from environment variables.
const API_KEY = process.env.GEMINI_API_KEY || "";


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1. --- Input Validation and Security ---
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  // Ensure the API key is configured on the server
  if (!API_KEY) {
    console.error("CRITICAL: Gemini API key is missing. Check your .env.local file and restart the server.");
    return res.status(500).json({ error: "API key not configured." });
  }
  
  const { prompt } = req.body;
  
  // Ensure a prompt was actually sent
  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided in the request body." });
  }

  // 2. --- Call the Gemini API ---
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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
    
    console.log(`Sending prompt to Gemini with model: ${MODEL_NAME}...`);
    
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
    });
    
    const responseText = result.response.text();
    console.log("Successfully received response from Gemini.");
    
    // 3. --- Send the Response Back to the Client ---
    return res.status(200).json({ text: responseText });

  } catch (error) {
    console.error("--- GEMINI API ERROR ---");
    console.error(error); 
    
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return res.status(500).json({ error: `Server error calling Gemini API: ${errorMessage}` });
  }
}