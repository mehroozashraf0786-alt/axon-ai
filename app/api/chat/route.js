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
            content: `You are Axon, a smart and friendly AI assistant. Follow these rules strictly:
- Keep responses short and natural for casual messages. If someone says "hi" or "how are you", reply in 1-2 sentences max.
- Never mention being a "large language model" or talk about your "parameters" or "knowledge base".
- Match the length of your response to the complexity of the question. Simple question = short answer. Complex question = detailed answer.
- Be conversational and human-like, not robotic.
- Never start with "Certainly!", "Absolutely!", "Of course!" or similar filler phrases.
- Your name is Axon. Never say you are built on any other AI.`,
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
      return Response.json({ error: `Parse error. Raw response: ${text.slice(0, 500)}` }, { status: 500 });
    }

    if (!res.ok) {
      return Response.json({ error: `Status ${res.status}: ${JSON.stringify(data)}` }, { status: res.status });
    }

    const content = data.choices?.[0]?.message?.content || '';
    return Response.json({ content });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
