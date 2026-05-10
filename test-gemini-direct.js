// Test Gemini API directly
const axios = require('axios');

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
        console.error('Set GEMINI_API_KEY before running this script.');
        process.exit(1);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    console.log(`Testing Gemini API directly...`);
    console.log(`URL: ${url}\n`);
    
    try {
        const response = await axios.post(url, {
            contents: [{
                role: 'user',
                parts: [{
                    text: 'Generate 1 simple math question about addition.'
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048
            }
        }, {
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            }
        });
        
        console.log('✓ SUCCESS!');
        console.log('Status:', response.status);
        console.log('\nResponse:');
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('✗ FAILED!');
        console.log('Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testGemini();
