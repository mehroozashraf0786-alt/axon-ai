'use client';
import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  { icon: '⚡', title: 'Explain a concept', prompt: 'Explain how neural networks work in simple terms' },
  { icon: '✉️', title: 'Draft an email', prompt: 'Write a professional email asking for a project deadline extension' },
  { icon: '📈', title: 'Productivity tips', prompt: 'Give me 5 strategies to improve focus and productivity' },
  { icon: '💻', title: 'Write code', prompt: 'Write a Python script to sort a list of dictionaries by a key' },
];

const MOODS = {
  happy:      { emoji: '😊', color: '#f59e0b', label: 'Happy' },
  excited:    { emoji: '🤩', color: '#ec4899', label: 'Excited' },
  thinking:   { emoji: '🤔', color: '#8b5cf6', label: 'Thinking' },
  curious:    { emoji: '🧐', color: '#06b6d4', label: 'Curious' },
  empathetic: { emoji: '🥺', color: '#3dd68c', label: 'Empathetic' },
  cool:       { emoji: '😎', color: '#5b8dee', label: 'Cool' },
  neutral:    { emoji: '🙂', color: '#8690b0', label: 'Neutral' },
};

function MoodBadge({ mood }) {
  const m = MOODS[mood] || MOODS.neutral;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20,
      background:`${m.color}18`, border:`1px solid ${m.color}40`, fontSize:12, color: m.color,
      animation:'fadeUp .3s ease both', marginBottom:6 }}>
      <span style={{ fontSize:14, animation:'moodPop .4s ease both' }}>{m.emoji}</span>
      <span style={{ fontWeight:500 }}>{m.label}</span>
    </div>
  );
}

function Bubble({ role, content, mood }) {
  const isAxon = role === 'assistant';
  const parts = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push({ t: 'text', v: content.slice(last, m.index) });
    parts.push({ t: 'code', v: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ t: 'text', v: content.slice(last) });

  const renderText = (s) => {
    const html = s
      .replace(/`([^`]+)`/g, '<code style="font-family:monospace;font-size:13px;color:#8bb4ff;background:rgba(91,141,238,0.13);padding:1px 6px;border-radius:4px">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const moodInfo = MOODS[mood] || MOODS.neutral;

  return (
    <div style={{ display:'flex', gap:10, padding:'4px 0', flexDirection: isAxon ? 'row' : 'row-reverse', animation:'fadeUp .25s ease both' }}>
      {/* Avatar with mood emoji */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, flexShrink:0 }}>
        <div style={{ width:28, height:28, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, marginTop:3,
          ...(isAxon
            ? { background:`linear-gradient(135deg,${moodInfo.color},${moodInfo.color}99)`, color:'#fff', fontFamily:'Syne,sans-serif', boxShadow:`0 0 10px ${moodInfo.color}40`, transition:'background 0.4s ease' }
            : { background:'var(--surface2)', color:'var(--soft)', border:'1px solid var(--border2)' }) }}>
          {isAxon ? 'A' : 'U'}
        </div>
        {isAxon && mood && (
          <span style={{ fontSize:14, animation:'moodPop .5s ease both', filter:'drop-shadow(0 0 4px rgba(0,0,0,0.3))' }} title={moodInfo.label}>
            {moodInfo.emoji}
          </span>
        )}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth:'85%', display:'flex', flexDirection:'column', gap:4 }}>
        {isAxon && mood && <MoodBadge mood={mood} />}
        <div style={{ padding:'11px 14px', borderRadius:13, fontSize:14.5, lineHeight:1.78,
          ...(isAxon
            ? { background:'var(--surface)', border:`1px solid ${moodInfo.color}30`, borderTopLeftRadius:3, boxShadow:`0 0 20px ${moodInfo.color}08` }
            : { background:'var(--user)', border:'1px solid rgba(91,141,238,0.18)', borderTopRightRadius:3 }) }}>
          {parts.map((p, i) =>
            p.t === 'code'
              ? <pre key={i} style={{ background:'#0d1117', border:'1px solid var(--border2)', borderRadius:8, padding:'12px 14px', overflowX:'auto', margin:'8px 0', fontSize:12, fontFamily:"'Fira Code',monospace" }}><code style={{ color:'#c9d1d9' }}>{p.v}</code></pre>
              : <span key={i}>{renderText(p.v)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sid, setSid] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentMood, setCurrentMood] = useState('neutral');
  const endRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    const s = localStorage.getItem('axon_s');
    if (s) setSessions(JSON.parse(s));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs, busy]);

  const resize = () => {
    const t = taRef.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 120) + 'px';
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
    setSidebarOpen(false);

    const history = [...msgs, { role:'user', content:msg }];
    setMsgs(history);
    setBusy(true);
    setCurrentMood('thinking');

    try {
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const mood = data.mood || 'neutral';
      setCurrentMood(mood);

      const final = [...history, { role:'assistant', content: data.content, mood }];
      setMsgs(final);

      const id = sid || Date.now().toString();
      if (!sid) setSid(id);
      const updated = [{ id, title: msg.slice(0,44), messages: final }, ...sessions.filter(s => s.id !== id)].slice(0,25);
      setSessions(updated);
      localStorage.setItem('axon_s', JSON.stringify(updated));

    } catch(e) {
      setCurrentMood('neutral');
      setMsgs(prev => [...prev, { role:'assistant', content:`⚠️ **${e.message}**`, mood:'neutral' }]);
    }
    setBusy(false);
  };

  const newChat = () => { setSid(null); setMsgs([]); setSidebarOpen(false); setCurrentMood('neutral'); };
  const load = (s) => { setSid(s.id); setMsgs(s.messages); setSidebarOpen(false); };

  const moodInfo = MOODS[currentMood] || MOODS.neutral;

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', position:'relative' }}>

      <style>{`
        @keyframes moodPop { 0%{transform:scale(0) rotate(-20deg);opacity:0} 70%{transform:scale(1.3) rotate(5deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes dot { 0%,80%,100%{transform:scale(.6);opacity:.3} 40%{transform:scale(1);opacity:1} }
        textarea::placeholder { color: var(--muted); }
      `}</style>

      {/* Overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:40 }}/>
      )}

      {/* SIDEBAR */}
      <aside style={{ position:'fixed', top:0, left:0, height:'100vh', zIndex:50, width:260,
        background:'var(--surface)', borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column', padding:'18px 13px', gap:5, overflow:'hidden',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform 0.25s ease' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 9px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:32, height:32, background:`linear-gradient(135deg,${moodInfo.color},${moodInfo.color}99)`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 16px ${moodInfo.color}40`, flexShrink:0, transition:'background 0.4s ease' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:19, fontWeight:800, letterSpacing:'-0.4px' }}>Ax<span style={{ color: moodInfo.color, transition:'color 0.4s ease' }}>on</span></span>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:20, lineHeight:1, padding:'2px 6px' }}>×</button>
        </div>

        <button onClick={newChat}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 10px', borderRadius:8, border:'1px dashed var(--border2)', background:'none', color:'var(--muted)', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer', marginBottom:4 }}>
          + New conversation
        </button>

        <div style={{ fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.09em', color:'var(--muted)', padding:'6px 9px 3px' }}>History</div>

        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
          {sessions.length === 0 && <div style={{ fontSize:12, color:'var(--muted)', padding:'6px 9px' }}>No chats yet</div>}
          {sessions.map(s => (
            <div key={s.id} onClick={() => load(s)}
              style={{ padding:'9px 10px', borderRadius:7, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                color: s.id===sid ? 'var(--accent2)' : 'var(--soft)',
                background: s.id===sid ? 'var(--glow)' : 'transparent' }}>
              {s.title}
            </div>
          ))}
        </div>

        <div style={{ borderTop:'1px solid var(--border)', paddingTop:9 }}>
          <button onClick={() => { if(confirm('Delete all history?')){ setSessions([]); localStorage.removeItem('axon_s'); newChat(); } }}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, background:'none', border:'none', color:'var(--muted)', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer', width:'100%' }}>
            🗑 Clear history
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => setSidebarOpen(true)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--soft)', padding:'4px', display:'flex', flexDirection:'column', gap:4 }}>
              <div style={{ width:20, height:2, background:'currentColor', borderRadius:2 }}/>
              <div style={{ width:20, height:2, background:'currentColor', borderRadius:2 }}/>
              <div style={{ width:20, height:2, background:'currentColor', borderRadius:2 }}/>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <div style={{ width:7, height:7, background:'#3dd68c', borderRadius:'50%', boxShadow:'0 0 7px rgba(61,214,140,.7)', animation:'pulse 2.5s ease infinite' }}/>
              <span style={{ fontSize:13, color:'var(--soft)', fontWeight:500 }}>Axon AI</span>
              <span style={{ fontSize:16, animation:'moodPop .4s ease both' }} key={currentMood}>{moodInfo.emoji}</span>
            </div>
          </div>
          <button onClick={newChat}
            style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:8, padding:'6px 12px', color:'var(--soft)', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }}>
            + New
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 14px 8px', display:'flex', flexDirection:'column', gap:3 }}>

          {msgs.length === 0 && !busy && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', gap:16, padding:'20px 10px', animation:'fadeUp .5s ease both' }}>
              <div style={{ width:64, height:64, background:`linear-gradient(135deg,${moodInfo.color},${moodInfo.color}99)`, borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 36px ${moodInfo.color}40`, transition:'all 0.4s ease', position:'relative' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span style={{ position:'absolute', bottom:-10, right:-10, fontSize:22 }}>😊</span>
              </div>
              <div>
                <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, letterSpacing:'-0.5px', marginBottom:8 }}>
                  Meet <span style={{ color: moodInfo.color, transition:'color 0.4s ease' }}>Axon</span>
                </h1>
                <p style={{ fontSize:14, color:'var(--soft)', maxWidth:300, lineHeight:1.7 }}>
                  Your emotionally aware AI assistant. I adapt to how you feel!
                </p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, width:'100%', maxWidth:440 }}>
                {SUGGESTIONS.map((s,i) => (
                  <div key={i} onClick={() => send(s.prompt)}
                    style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'11px 13px', cursor:'pointer', textAlign:'left', transition:'all .17s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=moodInfo.color; e.currentTarget.style.transform='translateY(-2px)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none'; }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{s.icon} {s.title}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>{s.prompt.slice(0,32)}…</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m,i) => <Bubble key={i} role={m.role} content={m.content} mood={m.mood} />)}

          {busy && (
            <div style={{ display:'flex', gap:10, padding:'4px 0' }}>
              <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, marginTop:3,
                background:`linear-gradient(135deg,${moodInfo.color},${moodInfo.color}99)`, color:'#fff', fontFamily:'Syne,sans-serif' }}>A</div>
              <div style={{ padding:'12px 14px', borderRadius:13, background:'var(--surface)', border:'1px solid var(--border)', borderTopLeftRadius:3, display:'flex', gap:5, alignItems:'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, background: moodInfo.color, borderRadius:'50%', animation:`dot 1.2s ease-in-out ${i*.2}s infinite` }}/>)}
              </div>
            </div>
          )}

          <div ref={endRef}/>
        </div>

        {/* Input */}
        <div style={{ padding:'10px 14px 16px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ background:'var(--surface)', border:`1px solid ${moodInfo.color}40`, borderRadius:12, display:'flex', alignItems:'flex-end', padding:'3px 3px 3px 13px', transition:'border-color 0.4s ease' }}>
            <textarea ref={taRef} value={input} rows={1} placeholder="Ask Axon anything…"
              onChange={e=>{ setInput(e.target.value); resize(); }}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }}
              style={{ flex:1, background:'none', border:'none', outline:'none', fontFamily:'DM Sans,sans-serif', fontSize:15, color:'var(--text)', lineHeight:1.6, resize:'none', maxHeight:120, minHeight:40, padding:'8px 0', overflowY:'auto' }}
            />
            <button onClick={() => send()} disabled={busy||!input.trim()}
              style={{ width:36, height:36, borderRadius:9, background: busy||!input.trim() ? 'var(--border2)' : moodInfo.color, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor: busy||!input.trim() ? 'not-allowed':'pointer', transition:'background 0.4s ease', flexShrink:0, margin:2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div style={{ textAlign:'center', paddingTop:6, fontSize:11, color:'var(--muted)' }}>
            Powered by <span style={{ color: moodInfo.color, transition:'color 0.4s ease' }}>Cerebras</span>
          </div>
        </div>
      </main>
    </div>
  );
}
