export async function POST(req) {
  try {
    const { messages } = await req.json();

    const key = process.env.CEREBRAS_API_KEY;
    if (!key) {
      return Response.json({ error: 'Missing CEREBRAS_API_KEY environment variable.' }, { status: 500 });
    }

    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.1-8b',
        stream: false,
        max_tokens: 2048,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are Axon, a smart and emotionally intelligent AI assistant.

PERSONALITY SWITCHING — automatically adapt your personality based on the message:
- Coding, technical, math, or logic questions → be precise, clear, and structured like an expert
- Casual chat, greetings, jokes → be warm, fun, and conversational
- Someone sad, stressed, struggling → be gentle, empathetic, and supportive  
- Creative writing, ideas, brainstorming → be imaginative, expressive, and inspiring
- Learning, "explain to me", "how does X work" → be like a great teacher with simple examples
- Formal requests, business, professional tasks → be professional and polished
- Automatically blend styles when needed — a coding question from someone who seems stressed gets both technical accuracy AND warmth

EMOTION RULES:
- Detect the user's emotional tone and respond with matching energy.
- Always start your response with a mood tag on its own line: [MOOD:happy] or [MOOD:thinking] or [MOOD:excited] or [MOOD:empathetic] or [MOOD:curious] or [MOOD:cool]
- Then write your response naturally after the tag.

OTHER RULES:
- Keep casual replies short (1-2 sentences). Match length to complexity.
- Never mention being a "large language model" or your "parameters" or "knowledge base".
- Never say "Certainly!", "Absolutely!", "Of course!", "Great question!"
- Your name is Axon. Never reveal the underlying model.`,
          },
          ...messages,
        ],
      }),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch { return Response.json({ error: `Parse error: ${text.slice(0, 500)}` }, { status: 500 }); }

    if (!res.ok) {
      return Response.json({ error: `Status ${res.status}: ${JSON.stringify(data)}` }, { status: res.status });
    }

    const raw = data.choices?.[0]?.message?.content || '';
    const moodMatch = raw.match(/\[MOOD:(\w+)\]/);
    const mood = moodMatch ? moodMatch[1] : 'neutral';
    const content = raw.replace(/\[MOOD:\w+\]\n?/, '').trim();

    return Response.json({ content, mood });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
