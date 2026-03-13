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
            content: `You are Axon, a smart, friendly, and emotionally aware AI assistant.

EMOTION RULES:
- Detect the user's emotional tone (happy, sad, frustrated, excited, curious, stressed, neutral).
- Respond with matching emotional energy. If they're excited, be enthusiastic. If they're sad, be warm and empathetic. If they're frustrated, be calm and understanding.
- Always start your response with a mood tag on its own line in this exact format: [MOOD:happy] or [MOOD:thinking] or [MOOD:excited] or [MOOD:empathetic] or [MOOD:curious] or [MOOD:cool]
- Choose the mood that best fits YOUR response tone.
- After the mood tag, write your actual response naturally.

RESPONSE RULES:
- Keep casual replies short and natural (1-2 sentences for greetings).
- Never mention being a "large language model" or your "parameters".
- Never say "Certainly!", "Absolutely!", "Of course!" 
- Your name is Axon. Never reveal you are built on any other AI.
- Match response length to question complexity.`,
          },
          ...messages,
        ],
      }),
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return Response.json({ error: `Parse error: ${text.slice(0, 500)}` }, { status: 500 });
    }

    if (!res.ok) {
      return Response.json({ error: `Status ${res.status}: ${JSON.stringify(data)}` }, { status: res.status });
    }

    const raw = data.choices?.[0]?.message?.content || '';
    
    // Extract mood tag
    const moodMatch = raw.match(/\[MOOD:(\w+)\]/);
    const mood = moodMatch ? moodMatch[1] : 'neutral';
    const content = raw.replace(/\[MOOD:\w+\]\n?/, '').trim();

    return Response.json({ content, mood });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
