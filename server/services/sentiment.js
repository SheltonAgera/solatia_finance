const axios = require('axios');

const HF_API_URL = "https://api-inference.huggingface.co/models/ProsusAI/finbert";

const getSentiment = async (text) => {
    if (!process.env.HF_TOKEN) return 0; // Graceful degradation

    try {
        const response = await axios.post(
            HF_API_URL,
            { inputs: text },
            { headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` } }
        );

        // FinBERT returns: [{ label: 'positive', score: 0.9 }, { label: 'negative', score: 0.05 }...]
        const scores = response.data[0]; 
        if(!scores) return 0;

        const pos = scores.find(s => s.label === 'positive')?.score || 0;
        const neg = scores.find(s => s.label === 'negative')?.score || 0;
        
        // Return a composite score (-1 to 1)
        return (pos - neg); 

    } catch (error) {
        console.error("⚠️ AI Service Bypass:", error.message);
        return 0; 
    }
};

module.exports = { getSentiment };