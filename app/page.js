'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const SUGGESTIONS = [
  { icon: '⚡', title: 'Explain a concept', prompt: 'Explain how neural networks work in simple terms' },
  { icon: '✉️', title: 'Draft an email', prompt: 'Write a professional email asking for a project deadline extension' },
  { icon: '📈', title: 'Productivity tips', prompt: 'Give me 5 strategies to improve focus and productivity' },
  { icon: '💻', title: 'Write code', prompt: 'Write a Python script to sort a list of dictionaries by a key' },
];

const MOODS = {
  happy:      { color: '#f59e0b' },
  excited:    { color: '#ec4899' },
  thinking:   { color: '#8b5cf6' },
  curious:    { color: '#06b6d4' },
  empathetic: { color: '#3dd68c' },
  cool:       { color: '#5b8dee' },
  neutral:    { color: '#5b8dee' },
};

function CopyBtn({ text, color }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Copy" style={{ background:'none', border:'none', cursor:'pointer', color: copied ? color : 'var(--muted)', fontSize:12, padding:'4px 6px', borderRadius:6, transition:'color 0.2s', display:'flex', alignItems:'center', gap:4 }}>
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  );
}

function Bubble({ role, content, mood, responseTime, onSpeak, speaking }) {
  const isAxon = role === 'assistant';
  const moodInfo = MOODS[mood] || MOODS.neutral;
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
      <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, marginTop:3,
        ...(isAxon
          ? { background:`linear-gradient(135deg,${moodInfo.color},${moodInfo.color}88)`, color:'#fff', fontFamily:'Syne,sans-serif', boxShadow:`0 0 10px ${moodInfo.color}40`, transition:'background 0.5s ease' }
          : { background:'var(--surface2)', color:'var(--soft)', border:'1px solid var(--border2)' }) }}>
        {isAxon ? 'A' : 'U'}
      </div>
      <div style={{ maxWidth:'85%', display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ padding:'11px 14px', borderRadius:13, fontSize:14.5, lineHeight:1.78,
          ...(isAxon
            ? { background:'var(--surface)', border:`1px solid ${moodInfo.color}25`, borderTopLeftRadius:3, transition:'border-color 0.5s ease' }
            : { background:'var(--user)', border:'1px solid rgba(91,141,238,0.18)', borderTopRightRadius:3 }) }}>
          {parts.map((p, i) =>
            p.t === 'code'
              ? <pre key={i} style={{ background:'#0d1117', border:'1px solid var(--border2)', borderRadius:8, padding:'12px 14px', overflowX:'auto', margin:'8px 0', fontSize:12, fontFamily:"'Fira Code',monospace" }}><code style={{ color:'#c9d1d9' }}>{p.v}</code></pre>
              : <span key={i}>{renderText(p.v)}</span>
          )}
        </div>
        {isAxon && (
          <div style={{ display:'flex', alignItems:'center', gap:4, paddingLeft:4 }}>
            <CopyBtn text={content} color={moodInfo.color} />
            <button onClick={() => onSpeak(content)} title={speaking ? 'Stop' : 'Read aloud'}
              style={{ background:'none', border:'none', cursor:'pointer', color: speaking ? moodInfo.color : 'var(--muted)', fontSize:12, padding:'4px 6px', borderRadius:6, transition:'color 0.2s' }}>
              {speaking ? '⏹ Stop' : '🔊 Listen'}
            </button>
            {responseTime && (
              <span style={{ fontSize:11, color:'var(--muted)', marginLeft:'auto', paddingRight:2 }}>
                {responseTime < 1000 ? `${responseTime}ms` : `${(responseTime/1000).toFixed(1)}s`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MemoryPanel({ memory, onClear, onClose, moodColor }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)' }}/>
      <div style={{ position:'relative', width:'100%', maxWidth:480, background:'var(--surface)', borderRadius:'20px 20px 0 0', padding:'24px 20px 32px', border:'1px solid var(--border)', animation:'slideUp .3s ease both', maxHeight:'70vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800 }}>🧠 Axon Memory</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>What Axon remembers about you</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:22 }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
          {memory.length === 0
            ? <div style={{ fontSize:13, color:'var(--muted)', textAlign:'center', padding:'20px 0' }}>Nothing remembered yet. Chat with Axon and it will start learning about you!</div>
            : memory.map((m, i) => (
                <div key={i} style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 13px', fontSize:13, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color: moodColor }}>•</span> {m}
                </div>
              ))
          }
        </div>
        {memory.length > 0 && (
          <button onClick={onClear} style={{ marginTop:16, padding:'10px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer' }}>
            🗑 Clear all memories
          </button>
        )}
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
  const [memory, setMemory] = useState([]);
  const [showMemory, setShowMemory] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [listening, setListening] = useState(false);
  const endRef = useRef(null);
  const taRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const s = localStorage.getItem('axon_s');
    if (s) setSessions(JSON.parse(s));
    const m = localStorage.getItem('axon_memory');
    if (m) setMemory(JSON.parse(m));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs, busy]);

  // Voice input setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e) => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
        setInput(transcript);
        if (taRef.current) {
          taRef.current.style.height = 'auto';
          taRef.current.style.height = Math.min(taRef.current.scrollHeight, 120) + 'px';
        }
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return alert('Voice input not supported in this browser.');
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const speak = useCallback((text, idx) => {
    window.speechSynthesis.cancel();
    if (speakingIdx === idx) { setSpeakingIdx(null); return; }
    const clean = text.replace(/[#*`]/g, '').replace(/<[^>]+>/g, '');
    const utt = new SpeechSynthesisUtterance(clean);
    utt.onend = () => setSpeakingIdx(null);
    utt.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utt);
  }, [speakingIdx]);

  const exportChat = () => {
    if (msgs.length === 0) return;
    const text = msgs.map(m => `${m.role === 'user' ? 'You' : 'Axon'}: ${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'axon-chat.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const resize = () => {
    const t = taRef.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 120) + 'px';
  };

  const saveMemory = (newMem) => {
    setMemory(newMem);
    localStorage.setItem('axon_memory', JSON.stringify(newMem));
  };

  const clearMemory = () => {
    if (confirm("Clear all of Axon's memories?")) { saveMemory([]); setShowMemory(false); }
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
    setSidebarOpen(false);
    window.speechSynthesis.cancel();
    setSpeakingIdx(null);

    const history = [...msgs, { role:'user', content:msg }];
    setMsgs(history);
    setBusy(true);
    setCurrentMood('thinking');

    try {
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ messages: history, memory }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const mood = data.mood || 'neutral';
      setCurrentMood(mood);

      if (data.newMemories && data.newMemories.length > 0) {
        const updated = [...memory];
        data.newMemories.forEach(nm => {
          if (!updated.some(m => m.toLowerCase() === nm.toLowerCase())) updated.push(nm);
        });
        saveMemory(updated.slice(-50));
      }

      const final = [...history, { role:'assistant', content: data.content, mood, responseTime: data.responseTime }];
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

  const newChat = () => {
    setSid(null); setMsgs([]); setSidebarOpen(false); setCurrentMood('neutral');
    window.speechSynthesis.cancel(); setSpeakingIdx(null);
  };
  const load = (s) => { setSid(s.id); setMsgs(s.messages); setSidebarOpen(false); };
  const moodInfo = MOODS[currentMood] || MOODS.neutral;

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', position:'relative' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes dot { 0%,80%,100%{transform:scale(.6);opacity:.3} 40%{transform:scale(1);opacity:1} }
        @keyframes micPulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)} 50%{box-shadow:0 0 0 8px rgba(239,68,68,0)} }
        textarea::placeholder { color: var(--muted); }
      `}</style>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:40 }}/>}
      {showMemory && <MemoryPanel memory={memory} onClear={clearMemory} onClose={() => setShowMemory(false)} moodColor={moodInfo.color} />}

      {/* SIDEBAR */}
      <aside style={{ position:'fixed', top:0, left:0, height:'100vh', zIndex:50, width:260,
        background:'var(--surface)', borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column', padding:'18px 13px', gap:5, overflow:'hidden',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition:'transform 0.25s ease' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 9px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:32, height:32, background:`linear-gradient(135deg,${moodInfo.color},${moodInfo.color}88)`, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.5s ease' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:19, fontWeight:800, letterSpacing:'-0.4px' }}>Ax<span style={{ color: moodInfo.color, transition:'color 0.5s ease' }}>on</span></span>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:20, padding:'2px 6px' }}>×</button>
        </div>

        <button onClick={newChat} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 10px', borderRadius:8, border:'1px dashed var(--border2)', background:'none', color:'var(--muted)', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer', marginBottom:4 }}>
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

        <div style={{ borderTop:'1px solid var(--border)', paddingTop:9, display:'flex', flexDirection:'column', gap:2 }}>
          <button onClick={() => { setSidebarOpen(false); setShowMemory(true); }}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:8, background:'none', border:'none', color:'var(--soft)', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer', width:'100%' }}>
            <span>🧠 Memory</span>
            {memory.length > 0 && <span style={{ fontSize:11, background: moodInfo.color, color:'#fff', borderRadius:10, padding:'1px 7px' }}>{memory.length}</span>}
          </button>
          <button onClick={exportChat}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, background:'none', border:'none', color:'var(--soft)', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer', width:'100%' }}>
            📝 Export chat
          </button>
          <button onClick={() => { if(confirm('Delete all history?')){ setSessions([]); localStorage.removeItem('axon_s'); newChat(); }}}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, background:'none', border:'none', color:'var(--muted)', fontFamily:'DM Sans,sans-serif', fontSize:13, cursor:'pointer', width:'100%' }}>
            🗑 Clear history
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
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
            </div>
          </div>
          <button onClick={newChat}
            style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:8, padding:'5px 11px', color:'var(--soft)', fontFamily:'DM Sans,sans-serif', fontSize:12, cursor:'pointer' }}>
            + New
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 14px 8px', display:'flex', flexDirection:'column', gap:3 }}>
          {msgs.length === 0 && !busy && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', gap:16, padding:'20px 10px', animation:'fadeUp .5s ease both' }}>
              <div style={{ width:64, height:64, background:`linear-gradient(135deg,${moodInfo.color},${moodInfo.color}88)`, borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 36px ${moodInfo.color}40`, transition:'all 0.5s ease' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div>
                <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, letterSpacing:'-0.5px', marginBottom:8 }}>
                  Meet <span style={{ color: moodInfo.color, transition:'color 0.5s ease' }}>Axon</span>
                </h1>
                <p style={{ fontSize:14, color:'var(--soft)', maxWidth:300, lineHeight:1.7 }}>
                  Your AI assistant with memory, voice, and multilingual support.
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

          {msgs.map((m,i) => (
            <Bubble key={i} role={m.role} content={m.content} mood={m.mood}
              responseTime={m.responseTime}
              onSpeak={(text) => speak(text, i)}
              speaking={speakingIdx === i} />
          ))}

          {busy && (
            <div style={{ display:'flex', gap:10, padding:'4px 0' }}>
              <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, marginTop:3,
                background:`linear-gradient(135deg,${moodInfo.color},${moodInfo.color}88)`, color:'#fff', fontFamily:'Syne,sans-serif', transition:'background 0.5s ease' }}>A</div>
              <div style={{ padding:'12px 14px', borderRadius:13, background:'var(--surface)', border:'1px solid var(--border)', borderTopLeftRadius:3, display:'flex', gap:5, alignItems:'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, background: moodInfo.color, borderRadius:'50%', animation:`dot 1.2s ease-in-out ${i*.2}s infinite` }}/>)}
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* Input */}
        <div style={{ padding:'10px 14px 16px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ background:'var(--surface)', border:`1px solid ${moodInfo.color}35`, borderRadius:12, display:'flex', alignItems:'flex-end', padding:'3px 3px 3px 13px', transition:'border-color 0.5s ease' }}>
            {/* Voice button */}
            <button onClick={toggleVoice} title="Voice input"
              style={{ width:32, height:32, borderRadius:8, background: listening ? 'rgba(239,68,68,0.15)' : 'none', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color: listening ? '#ef4444' : 'var(--muted)', flexShrink:0, marginRight:4, transition:'all 0.2s', animation: listening ? 'micPulse 1.5s ease infinite' : 'none' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <textarea ref={taRef} value={input} rows={1} placeholder={listening ? '🎤 Listening…' : 'Ask Axon anything…'}
              onChange={e=>{ setInput(e.target.value); resize(); }}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }}
              style={{ flex:1, background:'none', border:'none', outline:'none', fontFamily:'DM Sans,sans-serif', fontSize:15, color:'var(--text)', lineHeight:1.6, resize:'none', maxHeight:120, minHeight:40, padding:'8px 0', overflowY:'auto' }}
            />
            <button onClick={() => send()} disabled={busy||!input.trim()}
              style={{ width:36, height:36, borderRadius:9, background: busy||!input.trim() ? 'var(--border2)' : moodInfo.color, border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor: busy||!input.trim() ? 'not-allowed':'pointer', transition:'background 0.5s ease', flexShrink:0, margin:2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div style={{ textAlign:'center', paddingTop:6, fontSize:11, color:'var(--muted)' }}>
            Powered by <span style={{ color: moodInfo.color, transition:'color 0.5s ease' }}>Cerebras</span>
          </div>
        </div>
      </main>
    </div>
  );
}
