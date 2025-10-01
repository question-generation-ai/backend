// List all available Gemini models
const axios = require('axios');

async function listModels() {
    const apiKey = 'AIzaSyD3QHSw5ND0tkHzUztnDLmxI2C7su0B6ic';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models';
    
    try {
        const response = await axios.get(url, {
            headers: {
                'x-goog-api-key': apiKey
            }
        });
        
        console.log('Models that support generateContent:\n');
        
        const models = response.data.models.filter(m => 
            m.supportedGenerationMethods && 
            m.supportedGenerationMethods.includes('generateContent')
        );
        
        models.forEach(model => {
            console.log(`  - ${model.name}`);
        });
        
        console.log(`\nTotal: ${models.length} models`);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listModels();
