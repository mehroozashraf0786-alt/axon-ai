'use client';
import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  { icon: '⚡', title: 'Explain a concept', prompt: 'Explain how neural networks work in simple terms' },
  { icon: '✉️', title: 'Draft an email', prompt: 'Write a professional email asking for a project deadline extension' },
  { icon: '📈', title: 'Productivity tips', prompt: 'Give me 5 strategies to improve focus and productivity' },
  { icon: '💻', title: 'Write code', prompt: 'Write a Python script to sort a list of dictionaries by a key' },
];

function Bubble({ role, content, streaming }) {
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

  return (
    <div style={{ display:'flex', gap:10, padding:'4px 0', flexDirection: isAxon ? 'row' : 'row-reverse', animation:'fadeUp .25s ease both' }}>
      {/* Avatar */}
      <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, marginTop:3,
        ...(isAxon ? { background:'linear-gradient(135deg,#5b8dee,#8bb4ff)', color:'#fff', fontFamily:'Syne,sans-serif', boxShadow:'0 0 12px var(--glow)' }
                   : { background:'var(--surface2)', color:'var(--soft)', border:'1px solid var(--border2)' }) }}>
        {isAxon ? 'A' : 'U'}
      </div>
      {/* Bubble */}
      <div style={{ maxWidth:680, padding:'11px 15px', borderRadius:14, fontSize:14.5, lineHeight:1.78,
        ...(isAxon ? { background:'var(--surface)', border:'1px solid var(--border)', borderTopLeftRadius:3 }
                   : { background:'var(--user)', border:'1px solid rgba(91,141,238,0.18)', borderTopRightRadius:3 }) }}>
        {parts.map((p, i) =>
          p.t === 'code'
            ? <pre key={i} style={{ background:'#0d1117', border:'1px solid var(--border2)', borderRadius:8, padding:'12px 15px', overflowX:'auto', margin:'8px 0', fontSize:13, fontFamily:"'Fira Code',monospace" }}><code style={{ color:'#c9d1d9' }}>{p.v}</code></pre>
            : <span key={i}>{renderText(p.v)}</span>
        )}
        {streaming && <span className="blink" style={{ color:'var(--accent)' }}>▌</span>}
      </div>
    </div>
  );
}

export default function Page() {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sid, setSid] = useState(null);
  const endRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    const s = localStorage.getItem('axon_s');
    if (s) setSessions(JSON.parse(s));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs, stream]);

  const resize = () => {
    const t = taRef.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 160) + 'px';
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput(''); if (taRef.current) taRef.current.style.height = 'auto';

    const history = [...msgs, { role:'user', content:msg }];
    setMsgs(history);
    setBusy(true); setStream('');

    try {
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Server error — check your CEREBRAS_API_KEY in Vercel settings');
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value, { stream:true }).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const d = line.slice(6).trim();
          if (d === '[DONE]') continue;
          try { full += JSON.parse(d).choices?.[0]?.delta?.content || ''; setStream(full); } catch {}
        }
      }

      const final = [...history, { role:'assistant', content:full }];
      setMsgs(final); setStream('');

      const id = sid || Date.now().toString();
      if (!sid) setSid(id);
      const updated = [{ id, title: msg.slice(0,44), messages: final }, ...sessions.filter(s => s.id !== id)].slice(0,25);
      setSessions(updated);
      localStorage.setItem('axon_s', JSON.stringify(updated));

    } catch(e) {
      setMsgs(prev => [...prev, { role:'assistant', content:`⚠️ **${e.message}**` }]);
      setStream('');
    }
    setBusy(false);
  };

  const newChat = () => { setSid(null); setMsgs([]); setStream(''); };

  const load = (s) => { setSid(s.id); setMsgs(s.messages); setStream(''); };

  const S = (p) => ({ // style helper
    sidebar: { background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', padding:'18px 13px', gap:5, overflow:'hidden', ...p },
  });

  return (
    <div style={{ display:'grid', gridTemplateColumns:'252px 1fr', height:'100vh' }}>

      {/* SIDEBAR */}
      <aside style={{ background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', padding:'18px 13px', gap:5, overflow:'hidden' }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'4px 9px 18px' }}>
          <div style={{ width:32, height:32, background:'linear-gradient(135deg,#5b8dee,#8bb4ff)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 16px var(--glow)', flexShrink:0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:19, fontWeight:800, letterSpacing:'-0.4px' }}>Ax<span style={{ color:'var(--accent)' }}>on</span></span>
        </div>

        <Btn icon="+" label="New conversation" onClick={newChat} dashed />

        <div style={{ fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.09em', color:'var(--muted)', padding:'6px 9px 3px' }}>History</div>

        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
          {sessions.length === 0 && <div style={{ fontSize:12, color:'var(--muted)', padding:'6px 9px' }}>No chats yet</div>}
          {sessions.map(s => (
            <div key={s.id} onClick={() => load(s)}
              style={{ padding:'8px 10px', borderRadius:7, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', transition:'all .12s',
                color: s.id===sid ? 'var(--accent2)' : 'var(--soft)',
                background: s.id===sid ? 'var(--glow)' : 'transparent' }}
              onMouseEnter={e=>{ if(s.id!==sid) e.currentTarget.style.background='var(--surface2)' }}
              onMouseLeave={e=>{ if(s.id!==sid) e.currentTarget.style.background='transparent' }}>
              {s.title}
            </div>
          ))}
        </div>

        <div style={{ borderTop:'1px solid var(--border)', paddingTop:9 }}>
          <Btn icon="🗑" label="Clear history" onClick={() => { if(confirm('Delete all history?')){ setSessions([]); localStorage.removeItem('axon_s'); newChat(); } }} />
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 24px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:7, height:7, background:'#3dd68c', borderRadius:'50%', boxShadow:'0 0 7px rgba(61,214,140,.7)', animation:'pulse 2.5s ease infinite' }}/>
            <span style={{ fontSize:13, color:'var(--soft)', fontWeight:500 }}>Llama 3.3 70B · Cerebras</span>
          </div>
          <span style={{ fontSize:12, color:'var(--muted)' }}>Axon AI</span>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'26px 26px 14px', display:'flex', flexDirection:'column', gap:3 }}>

          {msgs.length === 0 && !busy && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', gap:18, padding:'30px 20px', animation:'fadeUp .5s ease both' }}>
              <div style={{ width:64, height:64, background:'linear-gradient(135deg,#5b8dee,#8bb4ff)', borderRadius:17, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 36px rgba(91,141,238,.28)' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div>
                <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, letterSpacing:'-1px', marginBottom:9 }}>
                  Meet <span style={{ color:'var(--accent)' }}>Axon</span>
                </h1>
                <p style={{ fontSize:14.5, color:'var(--soft)', maxWidth:340, lineHeight:1.75 }}>
                  Your AI-powered assistant. Ask anything — coding, writing, research, math, and more.
                </p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, maxWidth:480, width:'100%' }}>
                {SUGGESTIONS.map((s,i) => (
                  <div key={i} onClick={() => send(s.prompt)}
                    style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:13, padding:'12px 14px', cursor:'pointer', transition:'all .17s', animation:`fadeUp .4s ease ${i*.07}s both` }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none'; }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{s.icon} {s.title}</div>
                    <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:2 }}>{s.prompt.slice(0,38)}…</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m,i) => <Bubble key={i} role={m.role} content={m.content} />)}
          {busy && <Bubble role="assistant" content={stream} streaming={true} />}
          <div ref={endRef}/>
        </div>

        {/* Input */}
        <div style={{ padding:'13px 24px 18px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:12, display:'flex', alignItems:'flex-end', padding:'3px 3px 3px 14px' }}>
            <textarea ref={taRef} value={input} rows={1} placeholder="Ask Axon anything…"
              onChange={e=>{ setInput(e.target.value); resize(); }}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }}
              style={{ flex:1, background:'none', border:'none', outline:'none', fontFamily:'DM Sans,sans-serif', fontSize:14.5, color:'var(--text)', lineHeight:1.6, resize:'none', maxHeight:160, minHeight:40, padding:'8px 0', overflowY:'auto' }}
            />
            <button onClick={() => send()} disabled={busy||!input.trim()}
              style={{ width:35, height:35, borderRadius:8, background: busy||!input.trim() ? 'var(--border2)' : 'var(--accent)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor: busy||!input.trim() ? 'not-allowed':'pointer', transition:'all .15s', flexShrink:0, margin:2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 1px 0', fontSize:11.5, color:'var(--muted)' }}>
            <span>Powered by <span style={{ color:'var(--accent)' }}>Cerebras</span></span>
            <span><span style={{ color:'var(--accent)' }}>Enter</span> to send</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function Btn({ icon, label, onClick, dashed }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8,
        border: dashed ? `1px dashed ${hover ? 'var(--accent)' : 'var(--border2)'}` : 'none',
        background: hover && !dashed ? 'var(--surface2)' : 'transparent',
        color: hover ? (dashed ? 'var(--accent)' : 'var(--soft)') : 'var(--muted)',
        fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer', width:'100%', textAlign:'left', transition:'all .13s' }}>
      <span style={{ fontSize:13 }}>{icon}</span>{label}
    </button>
  );
}
