// Direct test of the API
const axios = require('axios');

async function test() {
    console.log('Testing Gemini API directly...\n');
    
    try {
        const response = await axios.post('http://localhost:5000/api/v1/questions/generate', {
            subject: 'Mathematics',
            chapter: 'Algebra',
            difficulty: 'easy',
            type: 'multiple-choice',
            count: 1,
            classLevel: 'Grade 10',
            provider: 'gemini'
        }, {
            timeout: 90000
        });
        
        console.log('Status:', response.status);
        console.log('\nMetadata:', JSON.stringify(response.data.metadata, null, 2));
        console.log('\nSource:', response.data.metadata.source);
        
        if (response.data.metadata.source === 'mock') {
            console.log('\n⚠️  WARNING: Received MOCK data!');
            console.log('Note:', response.data.metadata.note);
        } else {
            console.log('\n✓ SUCCESS: Received REAL AI data!');
            console.log('Provider:', response.data.metadata.provider);
        }
        
        console.log('\nFirst question:', response.data.questions[0].question.substring(0, 100));
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

test();
