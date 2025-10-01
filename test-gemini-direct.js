// Test Gemini API directly
const axios = require('axios');

async function testGemini() {
    const apiKey = 'AIzaSyD3QHSw5ND0tkHzUztnDLmxI2C7su0B6ic';
    const model = 'gemini-2.0-flash';
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
