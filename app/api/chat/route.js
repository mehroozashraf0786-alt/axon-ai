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

    // Build a clean context from results
    const answer = data.answer || '';
    const snippets = (data.results || [])
      .map(r => `[${r.title}]: ${r.content?.slice(0, 300)}`)
      .join('\n\n');

    return `SEARCH RESULTS FOR "${query}":\n${answer ? `Summary: ${answer}\n\n` : ''}${snippets}`;
  } catch {
    return null;
  }
}

function needsSearch(message) {
  const msg = message.toLowerCase();

  // Patterns that clearly need live data
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
    /definition of|meaning of|what does .* mean/i,
    /\d{4}.*event|event.*\d{4}/,
  ];

  return searchPatterns.some(p => p.test(msg));
}

function extractSearchQuery(message) {
  // Strip filler words to get a clean search query
  return message
    .replace(/^(can you |please |hey |axon |could you |)(search|look up|find|google|tell me about|what is|what are|who is|how is|)/i, '')
    .replace(/\?$/, '')
    .trim()
    || message;
}

export async function POST(req) {
  try {
    const { messages, memory, speedInstruction } = await req.json();

    const key = process.env.CEREBRAS_API_KEY;
    if (!key) {
      return Response.json({ error: 'Missing CEREBRAS_API_KEY environment variable.' }, { status: 500 });
    }

    const memoryContext = memory && memory.length > 0
      ? `WHAT YOU REMEMBER ABOUT THIS USER:\n${memory.map(m => `- ${m}`).join('\n')}\n\nUse this naturally to personalize responses without saying "I remember that...".`
      : '';

    const speedContext = speedInstruction ? speedInstruction + '\n\n' : '';

    // Check if latest user message needs web search
    const lastMsg = messages[messages.length - 1];
    let webContext = '';
    let didSearch = false;

    if (lastMsg?.role === 'user' && needsSearch(lastMsg.content)) {
      const query = extractSearchQuery(lastMsg.content);
      const results = await searchWeb(query);
      if (results) {
        webContext = results;
        didSearch = true;
      }
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
            content: `You are Axon, a smart and emotionally intelligent AI assistant with long term memory and web search.

${memoryContext}

PERSONALITY SWITCHING — automatically adapt based on the message:
- Coding, technical, math → precise and structured
- Casual chat, greetings → warm, fun and conversational
- Someone sad, stressed → gentle, empathetic and supportive
- Creative writing, brainstorming → imaginative and inspiring
- Learning questions → great teacher with examples
- Formal/business tasks → professional and polished

LANGUAGE: Always reply in the same language the user writes in. Auto-detect and match.

${webContext ? `WEB SEARCH DATA (use this to answer the question):\n${webContext}\n\nIMPORTANT: Use the search data above but DO NOT copy paste it. Summarize it naturally in your own words, keep it short and conversational. Never say "according to search results" or "based on the data". Just answer naturally like you know it.` : ''}

MEMORY — proactively extract anything useful from EVERY message:
- Name, age, location, job, school, hobbies, interests, goals, preferences
- Add at end of response: [MEMORY: fact1 | fact2]
- Skip only if zero personal info in message

EMOTION: Start every response with: [MOOD:happy] or [MOOD:thinking] or [MOOD:excited] or [MOOD:empathetic] or [MOOD:curious] or [MOOD:cool]

${speedContext}RULES:
- Keep casual replies short and natural
- Never say "according to search results", "based on my search", "I found online"
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

    return Response.json({ content, mood, newMemories, responseTime, didSearch });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
