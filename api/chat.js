// This code is a serverless function acting as a secure proxy for the Gemini API.
// It is designed to be deployed on platforms like Vercel or Netlify.
// This file should be placed in a directory named `api` at the root of your project.
// For Vercel, the file path would be `api/chat.js`.

import {
    GoogleGenerativeAI
} from "@google/generative-ai";

export default async function handler(req, res) {
    // Check if the API key is set as an environment variable
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: "Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable."
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }

    const {
        action,
        payload
    } = req.body;

    if (!action || !payload) {
        return res.status(400).json({
            error: 'Missing `action` or `payload` in request body'
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        if (action === 'chat') {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-preview-05-20"
            });
            const result = await model.generateContent(payload);
            const responseText = result.response.text();
            res.status(200).json({
                text: responseText
            });
        } else if (action === 'tts') {
            const ttsModel = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-preview-tts"
            });
            const ttsPayload = {
                contents: [{
                    parts: [{
                        text: payload.text
                    }]
                }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: payload.voice
                            }
                        }
                    }
                },
                model: "gemini-2.5-flash-preview-tts"
            };

            const result = await ttsModel.generateContent(ttsPayload);
            const part = result?.response?.candidates?.[0]?.content?.parts?.[0];
            const audioData = part?.inlineData?.data;
            const mimeType = part?.inlineData?.mimeType;

            if (audioData && mimeType) {
                res.status(200).json({
                    audioData: audioData,
                    mimeType: mimeType
                });
            } else {
                res.status(500).json({
                    error: "Failed to generate TTS audio."
                });
            }
        } else {
            res.status(400).json({
                error: 'Invalid action'
            });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            error: 'An error occurred while processing your request.'
        });
    }
}
