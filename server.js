const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

// Initialize the Express app
const app = express();

// Enable CORS for all origins
app.use(cors());

// Use JSON body parser
app.use(express.json());

// Set your API key as a environment variable for security
// You will need to configure this on your deployment platform (e.g., Vercel)
// DO NOT hardcode your API key here.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// The main proxy endpoint
app.post('/api', async (req, res) => {
    // Check if the API key is set
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key is not configured.' });
    }

    // Prepare the payload for the Gemini API
    const { contents, systemInstruction, generationConfig } = req.body;
    
    // Determine the model based on the request content and generationConfig
    // The model is hardcoded for the purpose of this app.
    let modelName = "gemini-1.5-flash-latest"; // Default model for text-based content
    let requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    
    // Check for TTS or Image generation requests to use the correct model
    if (generationConfig && generationConfig.responseModalities && generationConfig.responseModalities.includes("AUDIO")) {
        modelName = "gemini-2.5-flash-preview-tts";
        requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    } else if (contents && contents.some(part => part.inlineData)) {
        modelName = "gemini-1.5-pro-latest"; // Using a vision-capable model
        requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    }

    try {
        const geminiResponse = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        });

        // Forward the response from the Gemini API back to the client
        const data = await geminiResponse.json();
        res.status(geminiResponse.status).json(data);
    } catch (error) {
        console.error('Error during API call:', error);
        res.status(500).json({ error: 'Failed to communicate with the Gemini API.' });
    }
});

// For Vercel, we need to export the app as a handler
module.exports = app;
