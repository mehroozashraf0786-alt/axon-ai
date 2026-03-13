export const runtime = 'edge';

export async function POST(req) {
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
      model: 'llama-4-scout-17b-16e-instruct',
      stream: true,
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

  if (!res.ok) {
    const err = await res.json();
    return Response.json({ error: err.error?.message || 'Cerebras API error' }, { status: res.status });
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
