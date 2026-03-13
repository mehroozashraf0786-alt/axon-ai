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

MEMORY — proactively extract and save anything useful about the user from EVERY message, even if they don't ask you to remember it. This includes:
- Their name, age, location
- Job, school, field of study
- Hobbies, interests, favorite things
- Goals, projects they are working on
- Preferences (short answers, formal tone, etc.)
- Any personal detail they mention casually

At the end of EVERY response, always include a MEMORY block if anything is worth saving:
[MEMORY: fact1 | fact2 | fact3]
Only skip this block if the message has zero personal info (e.g. pure math question).

EMOTION RULES:
- Start every response with: [MOOD:happy] or [MOOD:thinking] or [MOOD:excited] or [MOOD:empathetic] or [MOOD:curious] or [MOOD:cool]

OTHER RULES:
- Keep casual replies short and natural.
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

    return Response.json({ content, mood, newMemories });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
