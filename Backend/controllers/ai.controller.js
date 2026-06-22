import * as ai from '../services/ai.service.js';


export const getAIResults = async (req, res) => {
    try {
        const { prompt } = req.query;
        const aiResults = await ai.getAIResults(prompt);
        res.status(200).json({ results: aiResults });

    } catch (error) {

        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

