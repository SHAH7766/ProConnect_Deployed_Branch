import { askGemini } from "../utils/Gemini.js";
import { askGroq } from "../utils/Groq.js";

const scoreProvider = (provider) => {
    const rating = Number(provider.rating || 0);
    const completionRate = Number(provider.completionRate || 0);
    const charges = Number(provider.charges || 0);
    const distance = provider.distance === null || provider.distance === undefined ? 25 : Number(provider.distance || 0);

    return Number(((rating * 22) + (completionRate * 0.55) - (charges * 0.004) - (distance * 1.7)).toFixed(2));
};

const formatCompletionRate = (completionRate) => (
    completionRate === null || completionRate === undefined ? 'no completion history yet' : `${completionRate}% completion rate`
);

const fallbackRecommendations = (providers) => {
    return [...providers]
        .map((provider) => ({
            providerId: provider._id,
            name: provider.name,
            score: scoreProvider(provider),
            reason: `${provider.name} is a strong match because of ${provider.rating} rating, ${formatCompletionRate(provider.completionRate)}, Rs. ${provider.charges} charges, and ${provider.distance} km distance.`
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
};

const parseJsonArray = (text) => {
    const jsonText = text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
    const firstBracket = jsonText.indexOf('[');
    const lastBracket = jsonText.lastIndexOf(']');

    if (firstBracket === -1 || lastBracket === -1) {
        throw new Error("AI did not return a JSON array");
    }

    return JSON.parse(jsonText.slice(firstBracket, lastBracket + 1));
};

const askBestAvailableAI = async (prompt) => {
    try {
        return {
            text: await askGroq(prompt),
            source: 'groq'
        };
    } catch (groqError) {
        console.log("Groq unavailable:", groqError.message);
    }

    return {
        text: await askGemini(prompt),
        source: 'gemini'
    };
};

export const RecommendProviders = async (req, res) => {
    try {
        const { providers = [], userNeed = "", category = "" } = req.body;

        if (!Array.isArray(providers) || providers.length === 0) {
            return res.status(400).send({ Message: "Providers are required", success: false });
        }

        const compactProviders = providers.map((provider) => ({
            providerId: provider._id,
            name: provider.name,
            category: provider.category,
            rating: provider.rating,
            completionRate: provider.completionRate,
            charges: provider.charges,
            distance: provider.distance,
            experience: provider.experience,
            skills: provider.skills
        }));

        const prompt = `
You are ProConnect's provider recommendation assistant.
Rank the best 3 providers for a customer.

Customer need: ${userNeed || "General service request"}
Selected category: ${category || "Not specified"}

Prioritize:
1. High completion rate
2. High rating
3. Fair charges
4. Short distance
5. Relevant skills and experience

Providers:
${JSON.stringify(compactProviders, null, 2)}

Return only a JSON array. No markdown. No extra text.
Each item must use this shape:
[
  {
    "providerId": "id",
    "name": "provider name",
    "score": 95,
    "reason": "short customer-friendly reason"
  }
]
`;

        try {
            const aiResult = await askBestAvailableAI(prompt);
            const recommendations = parseJsonArray(aiResult.text);
            return res.send({ recommendations, source: aiResult.source, success: true });
        } catch (aiError) {
            console.log("AI recommendation fallback:", aiError.message);
            return res.send({
                recommendations: fallbackRecommendations(providers),
                source: "fallback",
                success: true
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "AI recommendation failed", success: false });
    }
};

const fallbackCategory = (problem = "") => {
    const text = problem.toLowerCase();
    const plumberWords = ['pipe', 'leak', 'water', 'tap', 'sink', 'drain', 'toilet', 'flush', 'plumbing', 'shower'];
    const electronicsWords = ['electric', 'electronics', 'wire', 'wiring', 'switch', 'light', 'fan', 'socket', 'breaker', 'voltage', 'current', 'appliance', 'tv', 'fridge', 'washing machine'];

    const plumberScore = plumberWords.filter((word) => text.includes(word)).length;
    const electronicsScore = electronicsWords.filter((word) => text.includes(word)).length;

    let categories = [];
    if (plumberScore > 0) categories.push('Plumber');
    if (electronicsScore > 0) categories.push('Electrical');

    if (categories.length === 0) {
        return {
            categories: [],
            confidence: 0,
            reason: 'This issue does not match the available service categories: Electrical or Plumber.'
        };
    }

    return {
        categories,
        confidence: 72,
        reason: 'Your problem sounds related to ' + categories.join(' and ') + '.'
    };
};

export const DetectServiceCategory = async (req, res) => {
    try {
        const { problem = "" } = req.body;

        if (!problem.trim()) {
            return res.status(400).send({ Message: "Problem description is required", success: false });
        }

        const prompt = `
Classify this home service problem into one or more of these categories: Plumber, Electronics.
CRITICAL RULES:
1. If the problem contains profanity, abusive language, inappropriate jokes, or sexual slang (even if disguised with words like "leak"), you MUST return an empty array for categories.
2. If the problem is NOT clearly related to legitimate home plumbing or electronics/electrical work, or if it is just a person's name, you MUST return an empty array for categories.
3. If the problem involves an appliance that uses both water and electricity (like a water heater or washing machine), you SHOULD return BOTH ["Plumber", "Electronics"].

Problem:
"${problem}"

Return only JSON. No markdown. No extra text.
Shape:
{
  "categories": ["Plumber", "Electronics"] | ["Plumber"] | ["Electronics"] | [],
  "confidence": 90,
  "reason": "short customer-friendly reason explaining the choices, or state that the issue does not match our services"
}
`;

        try {
            const aiResult = await askBestAvailableAI(prompt);
            const jsonText = aiResult.text.replace(/```json/gi, '').replace(/```/g, '').trim();
            const start = jsonText.indexOf('{');
            const end = jsonText.lastIndexOf('}');
            const parsed = JSON.parse(jsonText.slice(start, end + 1));
            
            let categories = [];
            if (Array.isArray(parsed.categories)) {
                categories = parsed.categories.map(c => {
                    const normalized = String(c || '').toLowerCase();
                    if (normalized === 'plumber') return 'Plumber';
                    if (['electronics', 'electrician', 'electrical'].includes(normalized)) return 'Electronics';
                    return null;
                }).filter(Boolean);
            }

            // Remove duplicates
            categories = [...new Set(categories)];

            if (categories.length === 0) {
                return res.send({
                    categories: [],
                    confidence: Number(parsed.confidence || 0),
                    reason: parsed.reason || 'This issue does not match the available service categories: Electronics or Plumber.',
                    source: aiResult.source,
                    unsupported: true,
                    success: false
                });
            }

            return res.send({
                categories,
                confidence: Number(parsed.confidence || 80),
                reason: parsed.reason || `AI selected ${categories.join(' and ')} for this problem.`,
                source: aiResult.source,
                success: true
            });
        } catch (aiError) {
            console.log("AI category fallback:", aiError.message);
            const fallback = fallbackCategory(problem);
            return res.send({
                ...fallback,
                source: 'fallback',
                unsupported: fallback.categories.length === 0,
                success: fallback.categories.length > 0
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send({ Message: "AI category detection failed", success: false });
    }
};
