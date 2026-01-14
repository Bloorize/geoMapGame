import { GoogleGenerativeAI } from '@google/generative-ai';

export const getAIHint = async (apiKey: string, userQuestion: string, locationData: { city?: string, country: string, region?: string }) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
    You are a direct and helpful travel assistant in a game called GeoQuest AI.
    The user is trying to identify their current location based on hints.
    Current Secret Location: ${locationData.city ? locationData.city + ', ' : ''}${locationData.region ? locationData.region + ', ' : ''}${locationData.country}.
    
    User Question: "${userQuestion}"
    
    Rules:
    1. If the user asks for the location name directly (e.g., "Where is this?", "What city?", "Where am I?"), do NOT give the name. Instead, tell them you can't reveal the name directly but can answer specific questions about the area.
    2. Answer specific questions about geography, culture, climate, landmarks, etc., directly and factually. 
    3. If the user's question is "Get Hint", provide a clear and helpful clue about the location (e.g., a famous landmark, a local specialty, or a specific geographic feature).
    4. Keep your response brief and informative (1-2 sentences).
    5. Do NOT be vague or mysterious. Be helpful.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text) {
            return "The guide is speechless. Perhaps try asking in a different way?";
        }

        return text;
    } catch (error: any) {
        console.error('AI Service Error Details:', error);

        // Handle specific error codes if available
        if (error.status === 429 || error.message?.includes('429')) {
            return "The local spirits are weary from too many visitors. Try again in a moment, explorer!";
        }

        if (error.message?.includes('API_KEY_INVALID')) {
            return "It seems my credentials are being questioned. Please check the API key.";
        }

        if (error.message?.includes('SAFETY')) {
            return "I'm not allowed to talk about that. Let's stick to the geography and culture!";
        }

        return `I encountered an issue: ${error.message || "A mysterious fog has obscured my vision."} Let's try again shortly!`;
    }
};
