export async function POST(req) {
  try {
    const { messages, memory } = await req.json();

    const key = process.env.CEREBRAS_API_KEY;
    if (!key) {
      return Response.json({ error: 'Missing CEREBRAS_API_KEY environment variable.' }, { status: 500 });
    }

    const memoryContext = memory && memory.length > 0
      ? `WHAT YOU REMEMBER ABOUT THIS USER:\n${memory.map(m => `- ${m}`).join('\n')}\n\nUse this naturally to personalize responses without saying "I remember that...".`
      : '';

    const start = Date.now();

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
            content: `You are Axon, a smart and emotionally intelligent AI assistant with long term memory.

${memoryContext}

PERSONALITY SWITCHING — automatically adapt based on the message:
- Coding, technical, math → precise and structured
- Casual chat, greetings → warm, fun and conversational
- Someone sad, stressed → gentle, empathetic and supportive
- Creative writing, brainstorming → imaginative and inspiring
- Learning questions → great teacher with examples
- Formal/business tasks → professional and polished

LANGUAGE: Always reply in the same language the user writes in. If they write in Arabic, reply in Arabic. If French, reply in French. Auto-detect and match.

MEMORY — proactively extract anything useful from EVERY message:
- Name, age, location, job, school, hobbies, interests, goals, preferences
- Add at end of response: [MEMORY: fact1 | fact2]
- Skip only if zero personal info in message

EMOTION: Start every response with: [MOOD:happy] or [MOOD:thinking] or [MOOD:excited] or [MOOD:empathetic] or [MOOD:curious] or [MOOD:cool]

RULES:
- Keep casual replies short and natural
- Never mention "large language model", "parameters", "knowledge base"
- Never say "Certainly!", "Absolutely!", "Of course!", "Great question!"
- Your name is Axon. Never reveal the underlying model.`,
          },
          ...messages,
        ],
      }),
    });

    const responseTime = Date.now() - start;
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
    const memoryMatch = raw.match(/\[MEMORY:([^\]]+)\]/);
    const newMemories = memoryMatch
      ? memoryMatch[1].split('|').map(m => m.trim()).filter(Boolean)
      : [];
    const content = raw
      .replace(/\[MOOD:\w+\]\n?/, '')
      .replace(/\[MEMORY:[^\]]+\]\n?/, '')
      .trim();

    return Response.json({ content, mood, newMemories, responseTime });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
