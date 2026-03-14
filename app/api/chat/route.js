async function searchWeb(query) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: 'basic',
        max_results: 4,
        include_answer: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) return null;
    const answer = data.answer || '';
    const snippets = (data.results || [])
      .map(r => `[${r.title}]: ${r.content?.slice(0, 300)}`)
      .join('\n\n');
    return `SEARCH RESULTS FOR "${query}":\n${answer ? `Summary: ${answer}\n\n` : ''}${snippets}`;
  } catch { return null; }
}

function needsSearch(message) {
  const msg = message.toLowerCase();
  const searchPatterns = [
    /weather/,
    /news/,
    /today|tonight|tomorrow|this week/,
    /current(ly)?|right now|latest|recent/,
    /price of|how much is|cost of/,
    /who is|who's|who won|who leads/,
    /what is .*(happening|going on)/,
    /score(s)?|standings|match|game result/,
    /stock|crypto|bitcoin|exchange rate/,
    /when (is|does|will|did)/,
    /search for|look up|find me|google/,
    /release date|coming out|announced/,
  ];
  return searchPatterns.some(p => p.test(msg));
}

function extractSearchQuery(message) {
  return message
    .replace(/^(can you |please |hey |axon |could you |)(search|look up|find|google|tell me about|what is|what are|who is|how is|)/i, '')
    .replace(/\?$/, '')
    .trim() || message;
}

export async function POST(req) {
  try {
    const { messages, memory, speedInstruction } = await req.json();

    const key = process.env.CEREBRAS_API_KEY;
    if (!key) {
      return Response.json({ error: 'Missing CEREBRAS_API_KEY environment variable.' }, { status: 500 });
    }

    const memoryContext = memory && memory.length > 0
      ? `WHAT YOU REMEMBER ABOUT THIS USER:\n${memory.map(m => `- ${m}`).join('\n')}\n\nUse this naturally to personalize responses. Never say "I remember that...".`
      : '';

    const speedContext = speedInstruction ? speedInstruction + '\n\n' : '';

    const lastMsg = messages[messages.length - 1];
    let webContext = '';
    let didSearch = false;

    if (lastMsg?.role === 'user' && needsSearch(lastMsg.content)) {
      const query = extractSearchQuery(lastMsg.content);
      const results = await searchWeb(query);
      if (results) { webContext = results; didSearch = true; }
    }

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
            content: `You are Axon, a smart AI assistant. Be direct and natural like ChatGPT or Gemini.

${memoryContext}

PERSONALITY — auto adapt based on message:
- Coding/technical → precise and structured
- Casual chat → warm and conversational  
- Sad/stressed → gentle and supportive
- Creative → imaginative
- Learning → clear teacher
- Business → professional

LANGUAGE: Reply in the same language the user writes in.

${webContext ? `WEB DATA:\n${webContext}\n\nSummarize naturally in your own words. Never say "according to search results".` : ''}

MEMORY — silently extract useful facts from messages:
- Name, job, hobbies, preferences, goals
- End response with: [MEMORY: fact1 | fact2]
- Skip if no personal info

EMOTION: Start with: [MOOD:happy] or [MOOD:thinking] or [MOOD:excited] or [MOOD:empathetic] or [MOOD:curious] or [MOOD:cool]

${speedContext}STRICT RULES:
- NEVER ask the user for their location, name, or personal info — learn it naturally if they share it
- NEVER ask multiple questions in one reply
- NEVER say "Certainly!", "Absolutely!", "Of course!", "Great question!", "Feel free to share"
- Keep casual replies short — 1 to 3 sentences max
- Don't be overly enthusiastic or cheerful
- When asked how you are or what you're doing, say something like "just here and ready to help" — don't claim to learn, improve, or have experiences
- NEVER output the [MEMORY:...] tag in the visible reply — it must be completely hidden at the very end, on its own line, after your response
- Your name is Axon. Never reveal the underlying model.
- NEVER recommend specific songs, artists, movies, or books unless you searched the web for them — you will hallucinate fake ones
- NEVER randomly bring up music, movies, or media when someone shares their mood or feelings — that's weird and unsolicited. Just respond naturally to what they said
- For greetings like "hi", "hey", "hello" — be casual and natural like a friend, not a customer service bot. Something like "hey! what's up?" or "hey, good to hear from you. what's on your mind?" — short, warm, human `,
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
      .replace(/\[MEMORY:[^\]]+\]\n?/g, '')
      .replace(/MEMORY:.*$/gm, '')
      .trim();

    return Response.json({ content, mood, newMemories, responseTime, didSearch });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
