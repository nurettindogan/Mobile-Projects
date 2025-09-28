import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    // IMPORTANT: Replace with your actual API key, preferably from a secure environment variable.
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    } else {
      console.error('API key for GoogleGenAI is not configured.');
    }
  }

  async generateTaskIdea(): Promise<string> {
    if (!this.ai) {
      return Promise.reject('Gemini AI client is not initialized. Please check your API key.');
    }

    try {
      const prompt = "Suggest a single, short, and creative to-do list item or reminder. The task should be interesting and actionable. Maximum 10 words.";
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text.trim().replace(/["*]/g, ''); // Clean up quotes and asterisks
      return text;
    } catch (error) {
      console.error('Error generating content from Gemini:', error);
      throw new Error('Failed to get an idea from Gemini. Please try again later.');
    }
  }
}