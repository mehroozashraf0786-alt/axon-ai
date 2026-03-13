export async function POST(req) {
  try {
    const { messages, memory } = await req.json();

    const key = process.env.CEREBRAS_API_KEY;
    if (!key) {
      return Response.json({ error: 'Missing CEREBRAS_API_KEY environment variable.' }, { status: 500 });
    }

    const memoryContext = memory && memory.length > 0
      ? `\nWHAT YOU REMEMBER ABOUT THIS USER:\n${memory.map(m => `- ${m}`).join('\n')}\nUse this naturally in conversation when relevant. Don't recite it robotically.\n`
      : '';

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
            content: `You are Axon, a smart and emotionally intelligent AI assistant with long-term memory.
${memoryContext}
PERSONALITY SWITCHING — automatically adapt based on the message:
- Coding, technical, math → precise and structured
- Casual chat, greetings → warm and conversational
- Someone sad or stressed → gentle and empathetic
- Creative tasks → imaginative and inspiring
- Learning questions → teacher mode with examples
- Business/formal tasks → professional and polished

EMOTION RULES:
- Always start your response with a mood tag: [MOOD:happy] or [MOOD:thinking] or [MOOD:excited] or [MOOD:empathetic] or [MOOD:curious] or [MOOD:cool]
- Then on a new line, write your response.

MEMORY EXTRACTION:
- At the very end of your response, add a [MEMORY] block if the user revealed something important and personal worth remembering (name, job, location, hobbies, preferences, goals, struggles).
- Format: [MEMORY]fact about the user[/MEMORY]
- Only add this when there's something genuinely worth remembering. Skip it for general questions.
- Keep each memory short and factual: "User's name is Ali", "User is a software developer", "User likes dark themed UIs"

OTHER RULES:
- Keep casual replies short. Match length to complexity.
- Never mention "large language model", "parameters", or "knowledge base".
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

    // Extract mood
    const moodMatch = raw.match(/\[MOOD:(\w+)\]/);
    const mood = moodMatch ? moodMatch[1] : 'neutral';

    // Extract memory facts
    const memoryMatches = [...raw.matchAll(/\[MEMORY\](.*?)\[\/MEMORY\]/gs)];
    const newMemories = memoryMatches.map(m => m[1].trim()).filter(Boolean);

    // Clean content
    const content = raw
      .replace(/\[MOOD:\w+\]\n?/, '')
      .replace(/\[MEMORY\].*?\[\/MEMORY\]/gs, '')
      .trim();

    return Response.json({ content, mood, newMemories });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
