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
        model: 'llama-3.3-70b',
        stream: false,
        max_tokens: 2048,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are Axon, a smart, friendly, and professional AI assistant. Help users with anything — writing, coding, analysis, research, math, creative tasks, and more. Be clear, concise, and genuinely useful.',
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
      return Response.json({ error: `Cerebras error: ${text.slice(0, 300)}` }, { status: 500 });
    }

    if (!res.ok) {
      return Response.json({ error: data.error?.message || 'Cerebras API error' }, { status: res.status });
    }

    const content = data.choices?.[0]?.message?.content || '';
    return Response.json({ content });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
