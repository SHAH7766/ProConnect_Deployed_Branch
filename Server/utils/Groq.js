const cleanEnvValue = (value) => value?.trim().replace(/^['"]|['"]$/g, '');

const getGroqKey = () => cleanEnvValue(process.env.GROQ_API_KEY || process.env.GROK_API_KEY);

export const askGroq = async (prompt) => {
    const apiKey = getGroqKey();

    if (!apiKey) {
        throw new Error("Groq API key is missing");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.2
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "Groq request failed");
    }

    return data.choices?.[0]?.message?.content || "";
};
