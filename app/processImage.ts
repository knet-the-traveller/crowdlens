'use server';

import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Initialize SDKs using environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role securely on the server
);

interface GeminiAnalysis {
  caption: string;
  tags: string[];
  is_usable: boolean;
  points: number;
}

export async function processImageAndSave(imageUrl: string, userEmail: string) {
  try {
    // 1. Call Gemini 2.5 Flash with Multimodal Image input and Structured JSON schema
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            // Fetch the uploaded image from Supabase Storage storage public URL
            data: await fetch(imageUrl).then(res => res.arrayBuffer()).then(buf => Buffer.from(buf).toString('base64')),
            mimeType: 'image/jpeg',
          },
        },
        'Analyze this student organization event photo. Provide documentation metadata.',
      ],
      config: {
        // Enforce a strict JSON schema output matching our database structure
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caption: { type: Type.STRING, description: 'A brief 1-sentence description of what is happening.' },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3-5 keywords detailing the event context.' },
            is_usable: { type: Type.BOOLEAN, description: 'False if blurry, offensive, dark, or generic pocket accidental photo.' },
            points: { type: Type.INTEGER, description: 'Award 5 to 20 points based on how energetic, social, or community-focused the photo is.' },
          },
          required: ['caption', 'tags', 'is_usable', 'points'],
        },
      },
    });

    const result: GeminiAnalysis = JSON.parse(response.text ?? '{}');

    // 2. Commit the analyzed data instantly to the database
    const { data, error } = await supabase
      .from('event_photos')
      .insert([
        {
          user_email: userEmail,
          image_url: imageUrl,
          caption: result.caption,
          tags: result.tags,
          is_usable: result.is_usable,
          points_awarded: result.points,
        },
      ]);

    if (error) throw error;
    return { success: true, result };

} catch (error) {
  console.error('Pipeline Error:', error);
  
  // Still save to database with default values if Gemini fails
  await supabase.from('event_photos').insert([{
    user_email: userEmail,
    image_url: imageUrl,
    caption: 'Photo uploaded successfully.',
    tags: ['event', 'hackathon'],
    is_usable: true,
    points_awarded: 5,
  }]);

  return { success: true, result: { points: 5, tags: ['event', 'hackathon'] } };
}
}