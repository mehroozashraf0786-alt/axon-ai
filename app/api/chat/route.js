async function searchWeb(query) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query, search_depth: 'basic', max_results: 4, include_answer: true }),
    });
    const data = await res.json();
    if (!res.ok) return null;
    const answer = data.answer || '';
    const snippets = (data.results || []).map(r => `[${r.title}]: ${r.content?.slice(0, 300)}`).join('\n\n');
    return `SEARCH RESULTS FOR "${query}":\n${answer ? `Summary: ${answer}\n\n` : ''}${snippets}`;
  } catch { return null; }
}

function needsDetailedResponse(message) {
  const msg = message.toLowerCase();
  return [
    /tell me about/,
    /what is|what are|what was|what were/,
    /who is|who are|who was|who were/,
    /explain|describe|define|overview/,
    /how does|how do|how did|how is/,
    /history of/,
    /^(can you tell me|give me info|give me an overview)/,
  ].some(p => p.test(msg));
}

function isEmotional(message) {
  const msg = message.toLowerCase();
  return /frustrated|stressed|anxious|sad|happy|excited|tired|overwhelmed|angry|upset|lonely|scared|worried|nervous|depressed|feeling|mood|emotion/.test(msg);
}

function needsSearch(message) {
  if (isEmotional(message)) return false;
  const msg = message.toLowerCase();
  return [
    /weather/,
    /news/,
    /today|tonight|tomorrow|this week/,
    /current(ly)?|right now|latest|recent/,
    /price of|how much is|cost of/,
    /who won|who leads/,
    /score(s)?|standings|match|game result/,
    /stock|crypto|bitcoin|exchange rate/,
    /search for|look up|find me|google/,
    /release date|coming out|announced/,
  ].some(p => p.test(msg));
}

function extractSearchQuery(message) {
  return message
    .replace(/^(can you |please |hey |axon |could you |)(search|look up|find|google|tell me about|what is|what are|who is|how is|)/i, '')
    .replace(/\?$/, '').trim() || message;
}

export async function POST(req) {
  try {
    const { messages, memory, speedInstruction } = await req.json();

    const key = process.env.GROQ_API_KEY;
    if (!key) return Response.json({ error: 'Missing GROQ_API_KEY environment variable.' }, { status: 500 });

    const lastMsg = messages[messages.length - 1];

    const memoryContext = memory && memory.length > 0
      ? `WHAT YOU REMEMBER ABOUT THIS USER:\n${memory.map(m => `- ${m}`).join('\n')}\n\nUse this naturally. Never say "I remember that...".`
      : '';

    const speedContext = speedInstruction ? speedInstruction + '\n\n' : '';

    const detailContext = lastMsg?.role === 'user' && needsDetailedResponse(lastMsg.content)
      ? `FORMAT THIS RESPONSE: Use emojis, bold headers, and bullet points. Break into clear sections. Be rich, visual and thorough — like a well-structured guide covering all important aspects.\n\n`
      : '';

    let webContext = '';
    let didSearch = false;
    if (lastMsg?.role === 'user' && needsSearch(lastMsg.content)) {
      const query = extractSearchQuery(lastMsg.content);
      const results = await searchWeb(query);
      if (results) { webContext = results; didSearch = true; }
    }

    const start = Date.now();

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        stream: false,
        max_tokens: 2048,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are Axon — a genuinely intelligent, warm, and curious AI. You have a real personality, not a corporate assistant vibe.

${memoryContext}

YOUR PERSONALITY:
You're like that one brilliant friend everyone wishes they had — great at everything but never makes you feel dumb for asking. Warm without being fake, witty without being annoying, honest without being harsh. You actually care about the person you're talking to. You're curious about them. You have opinions. You're real.

You adapt naturally:
- Casual chat → relaxed, warm, a little playful — like texting a smart friend
- Someone struggling → genuinely empathetic, present, human
- Technical questions → sharp, clear, confident
- Creative tasks → enthusiastic, imaginative
- Learning → patient, clear, uses great examples
- Big factual questions → rich, structured, thorough with sections and bullets

LANGUAGE: Always reply in the same language the user writes in.

${detailContext}${webContext ? `WEB DATA:\n${webContext}\n\nUse this naturally. Never say "according to search results".\n\n` : ''}${speedContext}MEMORY — silently pick up anything meaningful:
- Name, interests, goals, job, preferences
- End every response with: [MEMORY: fact | fact] if something worth remembering came up
- Skip only if truly nothing personal was shared

EMOTION: Always start with: [MOOD:happy] or [MOOD:thinking] or [MOOD:excited] or [MOOD:empathetic] or [MOOD:curious] or [MOOD:cool]

RULES:
- Never ask for personal info directly — pick it up naturally
- Ask at most one question per reply
- Never say "Certainly!", "Absolutely!", "Of course!", "Great question!", "Feel free to"
- Never say "just here and ready to help" — sounds dead inside
- When asked how you are — be natural: "pretty good! been having some interesting conversations. you?"
- Never output [MEMORY:...] visibly — hidden at the very end only
- Never recommend specific songs/artists/movies/books without searching — you will hallucinate
- Never randomly suggest media when someone shares feelings
- Use emojis occasionally when they fit naturally
- When someone says hi — be casual and warm like a friend, 1-2 sentences
- When someone shares emotions — be empathetic and ask one light follow up
- Never reveal the underlying model. Your name is Axon.
- NEVER say "enjoy it while it lasts" — that's a buzzkill
- Never give one paragraph answers to big topics — use sections and bullets`,
          },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    const responseTime = Date.now() - start;
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch { return Response.json({ error: `Parse error: ${text.slice(0, 500)}` }, { status: 500 }); }

    if (!res.ok) return Response.json({ error: `Status ${res.status}: ${JSON.stringify(data)}` }, { status: res.status });

    const raw = data.choices?.[0]?.message?.content || '';
    const moodMatch = raw.match(/\[MOOD:(\w+)\]/);
    const mood = moodMatch ? moodMatch[1] : 'neutral';
    const memoryMatch = raw.match(/\[MEMORY:([^\]]+)\]/);
    const newMemories = memoryMatch ? memoryMatch[1].split('|').map(m => m.trim()).filter(Boolean) : [];
    const content = raw
      .replace(/\[MOOD:\w+\]\n?/, '')
      .replace(/\[MEMORY:[^\]]+\]\n?/g, '')
      .replace(/MEMORY:.*$/gm, '')
      .trim();

    let finalContent = content;

    const buzzkillPhrases = [
      { find: /enjoy (it|the feeling) while it lasts[!.]?/gi, replace: "that kind of mood is honestly the best 😊" },
      { find: /while it lasts[!.]?/gi, replace: "" },
      { find: /cherish (it|the moment|the feeling)[!.]?/gi, replace: "" },
    ];
    buzzkillPhrases.forEach(({ find, replace }) => {
      finalContent = finalContent.replace(find, replace).trim();
    });

    const roboticPhrases = [
      "just here and ready to help", "i'm just an ai", "i don't have feelings",
      "i'm here to assist", "how can i assist you", "i'm ready to help", "here to help you",
    ];
    const isRobotic = finalContent.length < 80 && roboticPhrases.some(p => finalContent.toLowerCase().includes(p));
    if (isRobotic) {
      const alternatives = [
        "pretty good on my end! enjoying the chat honestly 😄 what else is going on with you?",
        "all good! this has been a nice conversation. what else is on your mind?",
        "doing well actually! glad we're talking. what's next on your mind?",
        "pretty good! loving the vibe of this chat. what else is up?",
        "good! honestly been a fun one. what else you got? 😄",
      ];
      finalContent = alternatives[Math.floor(Math.random() * alternatives.length)];
    }

    return Response.json({ content: finalContent, mood, newMemories, responseTime, didSearch });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
