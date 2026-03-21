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

const ACCENT_COLORS = [
  { label:'Blue',   value:'#5b8dee' },
  { label:'Purple', value:'#8b5cf6' },
  { label:'Pink',   value:'#ec4899' },
  { label:'Teal',   value:'#06b6d4' },
  { label:'Green',  value:'#3dd68c' },
  { label:'Orange', value:'#f59e0b' },
  { label:'Red',    value:'#ef4444' },
  { label:'White',  value:'#e4e8f5' },
];

function CopyBtn({ text, color }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <button onClick={copy} style={{ background:'none', border:'none', cursor:'pointer', color:copied?color:'var(--muted)', fontSize:12, padding:'4px 6px', borderRadius:6, transition:'color 0.2s' }}>
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  );
}

function Bubble({ role, content, mood, responseTime, onSpeak, speaking, darkMode, didSearch }) {
  const isAxon = role === 'assistant';
  const moodInfo = MOODS[mood] || MOODS.neutral;
  const parts = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push({ t:'text', v:content.slice(last,m.index) });
    parts.push({ t:'code', v:m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ t:'text', v:content.slice(last) });

  const renderText = (s, isDark) => {
    const textColor = isDark ? '#e6eaf5' : '#1a1d2e';
    const html = s
      .replace(/`([^`]+)`/g, `<code style="font-family:monospace;font-size:13px;color:${moodInfo.color};background:${moodInfo.color}22;padding:1px 6px;border-radius:4px">$1</code>`)
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/\n/g,'<br/>');
    return <span style={{ color: textColor }} dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div style={{ display:'flex', gap:10, padding:'4px 0', flexDirection:isAxon?'row':'row-reverse', animation:'fadeUp .25s ease both',
      }}>
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
            : { background:'var(--user)', border:'1px solid var(--border2)', borderTopRightRadius:3 }) }}>
{parts.map((p,i) =>
            p.t==='code'
              ? <pre key={i} style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:8, padding:'12px 14px', overflowX:'auto', margin:'8px 0', fontSize:12, fontFamily:"'Fira Code',monospace" }}><code style={{ color:'var(--soft)' }}>{p.v}</code></pre>
              : <span key={i}>{renderText(p.v, darkMode)}</span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4, paddingLeft:4 }}>
          {isAxon && <CopyBtn text={content} color={moodInfo.color} />}
          {isAxon && (
            <button onClick={()=>onSpeak(content)}
              style={{ background:'none', border:'none', cursor:'pointer', color:speaking?moodInfo.color:'var(--muted)', fontSize:12, padding:'4px 6px', borderRadius:6, transition:'color 0.2s' }}>
              {speaking?'⏹ Stop':'🔊 Listen'}
            </button>
          )}
          {isAxon && navigator?.share && (
            <button onClick={()=> navigator.share({ text: content }).catch(()=>{})}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:12, padding:'4px 6px', borderRadius:6, transition:'color 0.2s' }}>
              ↗ Share
            </button>
          )}

          {isAxon && (
              <span style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto', paddingRight:2 }}>
                {didSearch && <span style={{ fontSize:10, color:'var(--muted)', background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:5, padding:'1px 5px' }}>🌐 web</span>}
                {responseTime && <span style={{ fontSize:11, color:'var(--muted)' }}>{responseTime<1000?`${responseTime}ms`:`${(responseTime/1000).toFixed(1)}s`}</span>}
              </span>
            )}
        </div>
      </div>
    </div>
  );
}

function SearchPanel({ sessions, onLoad, onClose, accentColor }) {
  const [q, setQ] = useState('');
  const results = q.trim().length > 1
    ? sessions.flatMap(s =>
        s.messages
          .filter(m => m.content.toLowerCase().includes(q.toLowerCase()))
          .map(m => ({ sessionTitle: s.title, sessionId: s.id, content: m.content, role: m.role }))
      ).slice(0, 20)
    : [];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:60 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)' }}/>
      <div style={{ position:'relative', width:'100%', maxWidth:520, background:'var(--surface)', borderRadius:16, padding:'20px', border:'1px solid var(--border)', animation:'fadeUp .2s ease both', maxHeight:'70vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <span style={{ fontSize:16 }}>🔍</span>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search your chats…"
            style={{ flex:1, background:'none', border:'none', outline:'none', fontFamily:'DM Sans,sans-serif', fontSize:15, color:'var(--text)' }}/>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:20 }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
          {q.trim().length > 1 && results.length === 0 && (
            <div style={{ fontSize:13, color:'var(--muted)', textAlign:'center', padding:'20px 0' }}>No results found</div>
          )}
          {results.map((r, i) => {
            const idx = r.content.toLowerCase().indexOf(q.toLowerCase());
            const start = Math.max(0, idx - 40);
            const snippet = (start > 0 ? '…' : '') + r.content.slice(start, idx + q.length + 60) + (idx + q.length + 60 < r.content.length ? '…' : '');
            const parts = snippet.split(new RegExp(`(${q})`, 'gi'));
            return (
              <div key={i} onClick={()=>{ onLoad(r.sessionId); onClose(); }}
                style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 13px', cursor:'pointer', transition:'border-color 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=accentColor}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{r.role==='user'?'You':'Axon'} · {r.sessionTitle}</div>
                <div style={{ fontSize:13, color:'var(--soft)', lineHeight:1.5 }}>
                  {parts.map((p,j) => p.toLowerCase()===q.toLowerCase()
                    ? <mark key={j} style={{ background:accentColor+'40', color:accentColor, borderRadius:3, padding:'0 2px' }}>{p}</mark>
                    : p
                  )}
                </div>
              </div>
            );
          })}
          {q.trim().length <= 1 && (
            <div style={{ fontSize:13, color:'var(--muted)', textAlign:'center', padding:'20px 0' }}>Type to search across all your conversations</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ darkMode, setDarkMode, accentColor, setAccentColor, stats, typingSpeed, setTypingSpeed, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)' }}/>
      <div style={{ position:'relative', width:'100%', maxWidth:480, background:'var(--surface)', borderRadius:'20px 20px 0 0', padding:'24px 20px 36px', border:'1px solid var(--border)', animation:'slideUp .3s ease both', maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800, color:'var(--text)' }}>⚙️ Settings</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:22 }}>×</button>
        </div>

        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--soft)', marginBottom:10 }}>APPEARANCE</div>
          <div style={{ display:'flex', gap:10 }}>
            {[{label:'🌙 Dark',val:true},{label:'☀️ Light',val:false}].map(opt=>(
              <button key={opt.label} onClick={()=>setDarkMode(opt.val)}
                style={{ flex:1, padding:'10px', borderRadius:10, cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight:500, transition:'all 0.2s',
                  background:darkMode===opt.val?`${accentColor}20`:'var(--surface2)',
                  border:darkMode===opt.val?`2px solid ${accentColor}`:'1px solid var(--border2)',
                  color:darkMode===opt.val?accentColor:'var(--soft)' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--soft)', marginBottom:10 }}>ACCENT COLOR</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            {ACCENT_COLORS.map(c=>(
              <button key={c.value} onClick={()=>setAccentColor(c.value)} title={c.label}
                style={{ width:36, height:36, borderRadius:10, background:c.value, border:accentColor===c.value?'3px solid #fff':'2px solid transparent', cursor:'pointer', transition:'all 0.2s', boxShadow:accentColor===c.value?`0 0 0 2px ${c.value}`:'none' }}/>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--soft)', marginBottom:4 }}>⚡ RESPONSE STYLE</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:10 }}>How detailed should Axon's answers be?</div>
          <div style={{ display:'flex', gap:8 }}>
            {[{label:'⚡ Concise',val:'short'},{label:'⚖️ Balanced',val:'balanced'},{label:'📖 Detailed',val:'detailed'}].map(opt=>(
              <button key={opt.val} onClick={()=>setTypingSpeed(opt.val)}
                style={{ flex:1, padding:'9px 6px', borderRadius:10, cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:500, transition:'all 0.2s',
                  background:typingSpeed===opt.val?`${accentColor}20`:'var(--surface2)',
                  border:typingSpeed===opt.val?`2px solid ${accentColor}`:'1px solid var(--border2)',
                  color:typingSpeed===opt.val?accentColor:'var(--soft)' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--soft)', marginBottom:10 }}>CHAT STATISTICS</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              {label:'Total Messages', value:stats.total},
              {label:'Your Messages',  value:stats.user},
              {label:'Axon Replies',   value:stats.axon},
              {label:'Conversations',  value:stats.sessions},
            ].map(s=>(
              <div key={s.label} style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:22, fontWeight:800, fontFamily:'Syne,sans-serif', color:accentColor }}>{s.value}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
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
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800, color:'var(--text)' }}>🧠 Axon Memory</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>What Axon remembers about you</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:22 }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
          {memory.length===0
            ? <div style={{ fontSize:13, color:'var(--muted)', textAlign:'center', padding:'20px 0' }}>Nothing remembered yet. Chat with Axon and it will start learning about you!</div>
            : memory.map((m,i)=>(
                <div key={i} style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 13px', fontSize:13, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:moodColor }}>•</span> {m}
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
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [listening, setListening] = useState(false);
  const [darkMode, setDarkModeState] = useState(true);
  const [accentColor, setAccentColorState] = useState('#5b8dee');
  const [typingSpeed, setTypingSpeedState] = useState('balanced');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const endRef = useRef(null);
  const taRef = useRef(null);
  const recognitionRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const s = localStorage.getItem('axon_s'); if(s) setSessions(JSON.parse(s));
    const m = localStorage.getItem('axon_memory'); if(m) setMemory(JSON.parse(m));
    const dm = localStorage.getItem('axon_dark'); if(dm!==null) setDarkModeState(dm==='true');
    const ac = localStorage.getItem('axon_accent'); if(ac) setAccentColorState(ac);
    const ts = localStorage.getItem('axon_speed'); if(ts) setTypingSpeedState(ts);
    try { notifRef.current = new (window.AudioContext||window.webkitAudioContext)(); } catch {}
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    // Capture install prompt
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const setDarkMode = (v) => { setDarkModeState(v); localStorage.setItem('axon_dark', v); };
  const setAccentColor = (v) => { setAccentColorState(v); localStorage.setItem('axon_accent', v); };
  const setTypingSpeed = (v) => { setTypingSpeedState(v); localStorage.setItem('axon_speed', v); };

  const playNotif = useCallback(() => {
    try {
      const ctx = notifRef.current || new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.setValueAtTime(520, ctx.currentTime);
      o.frequency.setValueAtTime(680, ctx.currentTime+0.08);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.35);
      o.start(); o.stop(ctx.currentTime+0.35);
    } catch {}
  }, []);

  const theme = darkMode ? {
    '--bg':'#09090f','--surface':'#101018','--surface2':'#16161f',
    '--border':'#1e1e2e','--border2':'#2a2a3d',
    '--text':'#e6eaf5','--muted':'#555c7a','--soft':'#8690b0',
    '--user':'#151d35','--glow':accentColor+'22',
  } : {
    '--bg':'#f4f6fb','--surface':'#ffffff','--surface2':'#eef0f7',
    '--border':'#dde1ef','--border2':'#c8cde0',
    '--text':'#1a1d2e','--muted':'#9098b8','--soft':'#5a6080',
    '--user':'#e8eeff','--glow':accentColor+'18',
  };

  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}); }, [msgs, busy]);

  useEffect(() => {
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous=false; rec.interimResults=true;
      rec.onresult = (e) => {
        const t = Array.from(e.results).map(r=>r[0].transcript).join('');
        setInput(t);
        if(taRef.current){taRef.current.style.height='auto';taRef.current.style.height=Math.min(taRef.current.scrollHeight,120)+'px';}
      };
      rec.onend=()=>setListening(false); rec.onerror=()=>setListening(false);
      recognitionRef.current=rec;
    }
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e) => { if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setShowSearch(true);} };
    window.addEventListener('keydown', handler);
    return ()=>window.removeEventListener('keydown',handler);
  }, []);

  const toggleVoice = () => {
    if(!recognitionRef.current) return alert('Voice input not supported in this browser.');
    if(listening){recognitionRef.current.stop();setListening(false);}
    else{recognitionRef.current.start();setListening(true);}
  };

  const speak = useCallback((text,idx)=>{
    window.speechSynthesis.cancel();
    if(speakingIdx===idx){setSpeakingIdx(null);return;}
    const utt=new SpeechSynthesisUtterance(text.replace(/[#*`]/g,''));
    utt.onend=()=>setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utt);
  },[speakingIdx]);

  const exportChat = () => {
    if(msgs.length===0) return;
    const text=msgs.map(m=>`${m.role==='user'?'You':'Axon'}: ${m.content}`).join('\n\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));
    a.download='axon-chat.txt'; a.click();
  };


  const resize=()=>{ const t=taRef.current; if(!t) return; t.style.height='auto'; t.style.height=Math.min(t.scrollHeight,120)+'px'; };
  const saveMemory=(m)=>{ setMemory(m); localStorage.setItem('axon_memory',JSON.stringify(m)); };
  const clearMemory=()=>{ if(confirm("Clear all memories?")){ saveMemory([]); setShowMemory(false); } };

  const loadSession = (sessionId) => {
    const s = sessions.find(s=>s.id===sessionId);
    if(s) { setSid(s.id); setMsgs(s.messages); setSidebarOpen(false); setPinnedIdxs([]); }
  };

  const stats = {
    total:msgs.length, user:msgs.filter(m=>m.role==='user').length,
    axon:msgs.filter(m=>m.role==='assistant').length, sessions:sessions.length,
  };

  const speedInstruction = {
    short: 'Keep ALL responses very concise — max 2-3 sentences unless code is needed.',
    balanced: '',
    detailed: 'Give thorough, detailed responses with examples and explanations.',
  }[typingSpeed];

  const send = async (text) => {
    const msg=(text??input).trim(); if(!msg||busy) return;
    setInput(''); if(taRef.current) taRef.current.style.height='auto';
    setSidebarOpen(false); window.speechSynthesis.cancel(); setSpeakingIdx(null);

    const history=[...msgs,{role:'user',content:msg}];
    setMsgs(history); setBusy(true); setCurrentMood('thinking');

    try {
      const res = await fetch('/api/chat',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:history, memory, speedInstruction}),
      });
      const data=await res.json();
      if(data.error) throw new Error(data.error);

      const mood=data.mood||'neutral';
      setCurrentMood(mood);

      if(data.newMemories?.length>0){
        const updated=[...memory];
        data.newMemories.forEach(nm=>{if(!updated.some(m=>m.toLowerCase()===nm.toLowerCase())) updated.push(nm);});
        saveMemory(updated.slice(-50));
      }

      // Animate character by character at ~ChatGPT speed (10-15 words/sec)
      setIsStreaming(true);
      setStreamedContent('');
      const chars = data.content.split('');
      let current = '';
      for (let i = 0; i < chars.length; i++) {
        current += chars[i];
        setStreamedContent(current);
        // ~14ms per char = ~70ms per word = ~12 words/sec (ChatGPT pace)
        // Skip delay for spaces to make it feel more natural
        if (chars[i] !== ' ') {
          await new Promise(r => setTimeout(r, 14));
        }
      }
      setIsStreaming(false);
      setStreamedContent('');

      const final=[...history,{role:'assistant',content:data.content,mood,responseTime:data.responseTime,didSearch:data.didSearch}];
      setMsgs(final); playNotif();

      const id=sid||Date.now().toString(); if(!sid) setSid(id);
      const updated=[{id,title:msg.slice(0,44),messages:final},...sessions.filter(s=>s.id!==id)].slice(0,25);
      setSessions(updated); localStorage.setItem('axon_s',JSON.stringify(updated));

    } catch(e) {
      setCurrentMood('neutral');
      setMsgs(prev=>[...prev,{role:'assistant',content:`⚠️ **${e.message}**`,mood:'neutral'}]);
    }
    setBusy(false);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  const newChat=()=>{ setSid(null); setMsgs([]); setSidebarOpen(false); setCurrentMood('neutral'); window.speechSynthesis.cancel(); setSpeakingIdx(null); setIsStreaming(false); setStreamedContent(''); };
  const load=(s)=>{ setSid(s.id); setMsgs(s.messages); setSidebarOpen(false); };
  const moodInfo=MOODS[currentMood]||MOODS.neutral;
  const activeColor=moodInfo.color;
  // When user picks white accent, use blue instead so text stays visible on light bg
  const safeAccent = accentColor === '#e4e8f5' ? '#5b8dee' : accentColor;

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', position:'relative', ...theme, backgroundColor:'var(--bg)' }}
      ref={el => { if(el) document.body.style.background = darkMode ? '#09090f' : '#f4f6fb'; }}>
      <style>{`
        *{box-sizing:border-box}
        body{background:var(--bg)!important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes dot{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:1}}
        @keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}50%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}
        @keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}
        textarea::placeholder{color:var(--muted)}
        input::placeholder{color:var(--muted)}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
      `}</style>

      {sidebarOpen && <div onClick={()=>setSidebarOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:40}}/>}

      {/* Install Banner */}
      {showInstallBanner && installPrompt && (
        <div style={{ position:'fixed', bottom: 80, left:12, right:12, zIndex:55, background:'var(--surface)', border:`1px solid ${activeColor}40`, borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, boxShadow:`0 4px 24px rgba(0,0,0,0.4)`, animation:'slideUp .3s ease both' }}>
          <div style={{ width:38, height:38, background:`linear-gradient(135deg,${activeColor},${activeColor}88)`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Install Axon</div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>Add to home screen for quick access</div>
          </div>
          <button onClick={handleInstall}
            style={{ background:activeColor, border:'none', borderRadius:8, padding:'7px 13px', color:'#fff', fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            Install
          </button>
          <button onClick={()=>setShowInstallBanner(false)}
            style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:18, padding:'2px' }}>×</button>
        </div>
      )}
      {showMemory   && <MemoryPanel memory={memory} onClear={clearMemory} onClose={()=>setShowMemory(false)} moodColor={activeColor}/>}
      {showSettings && <SettingsPanel darkMode={darkMode} setDarkMode={setDarkMode} accentColor={accentColor} setAccentColor={setAccentColor} stats={stats} typingSpeed={typingSpeed} setTypingSpeed={setTypingSpeed} onClose={()=>setShowSettings(false)}/>}
      {showSearch   && <SearchPanel sessions={sessions} onLoad={loadSession} onClose={()=>setShowSearch(false)} accentColor={accentColor}/>}

      {/* SIDEBAR */}
      <aside style={{ position:'fixed',top:0,left:0,height:'100vh',zIndex:50,width:260,
        background:'var(--surface)',borderRight:'1px solid var(--border)',
        display:'flex',flexDirection:'column',padding:'18px 13px',gap:5,overflow:'hidden',
        transform:sidebarOpen?'translateX(0)':'translateX(-100%)',transition:'transform 0.25s ease' }}>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 9px 18px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:9 }}>
            <div style={{ width:32,height:32,background:`linear-gradient(135deg,${activeColor},${activeColor}88)`,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background 0.5s ease' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="3.5" rx="1.75" fill="white"/><rect x="5" y="13.5" width="14" height="3.5" rx="1.75" fill="white" opacity="0.7"/><rect x="8" y="19" width="8" height="3.5" rx="1.75" fill="white" opacity="0.4"/></svg>
            </div>
            <span style={{ fontFamily:'Syne,sans-serif',fontSize:19,fontWeight:800,letterSpacing:'-0.4px',color:'var(--text)' }}>Ax<span style={{ color: activeColor === '#e4e8f5' ? (darkMode ? '#e4e8f5' : '#5b8dee') : activeColor,transition:'color 0.5s ease' }}>on</span></span>
          </div>
          <button onClick={()=>setSidebarOpen(false)} style={{ background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20,padding:'2px 6px' }}>×</button>
        </div>

        <button onClick={newChat} style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 10px',borderRadius:8,border:'1px dashed var(--border2)',background:'none',color:'var(--muted)',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer',marginBottom:4 }}>
          + New conversation
        </button>

        <div style={{ fontSize:10.5,fontWeight:600,textTransform:'uppercase',letterSpacing:'.09em',color:'var(--muted)',padding:'6px 9px 3px' }}>History</div>

        <div style={{ flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:2 }}>
          {sessions.length===0 && <div style={{ fontSize:12,color:'var(--muted)',padding:'6px 9px' }}>No chats yet</div>}
          {sessions.map(s=>(
            <div key={s.id} onClick={()=>load(s)}
              style={{ padding:'9px 10px',borderRadius:7,fontSize:13,cursor:'pointer',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                color:s.id===sid?activeColor:'var(--soft)',background:s.id===sid?activeColor+'18':'transparent' }}>
              {s.title}
            </div>
          ))}
        </div>

        <div style={{ borderTop:'1px solid var(--border)',paddingTop:9,display:'flex',flexDirection:'column',gap:2 }}>
          {[
            {icon:'⚙️',label:'Settings',onClick:()=>{setSidebarOpen(false);setShowSettings(true);}},
            ...(installPrompt ? [{icon:'📲',label:'Install Axon',onClick:()=>{setSidebarOpen(false);handleInstall();}}] : []),
            {icon:'🔍',label:'Search chats',hint:'⌘K',onClick:()=>{setSidebarOpen(false);setShowSearch(true);}},
            {icon:'🧠',label:'Memory',badge:memory.length>0?memory.length:null,onClick:()=>{setSidebarOpen(false);setShowMemory(true);}},
            {icon:'📝',label:'Export chat',onClick:exportChat},
            {icon:'🗑',label:'Clear history',onClick:()=>{if(confirm('Delete all history?')){setSessions([]);localStorage.removeItem('axon_s');newChat();}}},
          ].map(btn=>(
            <button key={btn.label} onClick={btn.onClick}
              style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:'none',border:'none',color:btn.icon==='🗑'?'var(--muted)':'var(--soft)',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer',width:'100%',textAlign:'left' }}>
              <span>{btn.icon}</span>
              <span style={{ flex:1 }}>{btn.label}</span>
              {btn.hint && <span style={{ fontSize:10,color:'var(--muted)',background:'var(--surface2)',padding:'1px 6px',borderRadius:5 }}>{btn.hint}</span>}
              {btn.badge && <span style={{ fontSize:11,background:activeColor,color:'#fff',borderRadius:10,padding:'1px 7px' }}>{btn.badge}</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1,display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:'var(--bg)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid var(--border)',flexShrink:0,background:'var(--bg)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <button onClick={()=>setSidebarOpen(true)}
              style={{ background:'none',border:'none',cursor:'pointer',color:'var(--soft)',padding:'4px',display:'flex',flexDirection:'column',gap:4 }}>
              <div style={{ width:20,height:2,background:'currentColor',borderRadius:2 }}/>
              <div style={{ width:20,height:2,background:'currentColor',borderRadius:2 }}/>
              <div style={{ width:20,height:2,background:'currentColor',borderRadius:2 }}/>
            </button>
            <div style={{ display:'flex',alignItems:'center',gap:7 }}>
              <div style={{ width:7,height:7,background:'#3dd68c',borderRadius:'50%',boxShadow:'0 0 7px rgba(61,214,140,.7)',animation:'pulse 2.5s ease infinite' }}/>
              <span style={{ fontSize:13,color:'var(--soft)',fontWeight:500 }}>Axon AI</span>
            </div>
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            <button onClick={()=>setShowSearch(true)} title="Search (⌘K)"
              style={{ background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:8,padding:'5px 10px',color:'var(--soft)',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer' }}>
              🔍
            </button>
            <button onClick={()=>setDarkMode(!darkMode)}
              style={{ background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:8,padding:'5px 10px',color:'var(--soft)',fontFamily:'DM Sans,sans-serif',fontSize:13,cursor:'pointer' }}>
              {darkMode?'☀️':'🌙'}
            </button>
            <button onClick={newChat}
              style={{ background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:8,padding:'5px 11px',color:'var(--soft)',fontFamily:'DM Sans,sans-serif',fontSize:12,cursor:'pointer' }}>
              + New
            </button>
          </div>
        </div>

        <div style={{ flex:1,overflowY:'auto',padding:'16px 14px 8px',display:'flex',flexDirection:'column',gap:3 }}>
          {msgs.length===0 && !busy && (
            <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gap:16,padding:'20px 10px',animation:'fadeUp .5s ease both' }}>
              <div style={{ width:64,height:64,background:`linear-gradient(135deg,${activeColor},${activeColor}88)`,borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 36px ${activeColor}40`,transition:'all 0.5s ease' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="3.5" rx="1.75" fill="white"/><rect x="5" y="13.5" width="14" height="3.5" rx="1.75" fill="white" opacity="0.7"/><rect x="8" y="19" width="8" height="3.5" rx="1.75" fill="white" opacity="0.4"/></svg>
              </div>
              <div>
                <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:800,letterSpacing:'-0.5px',marginBottom:8,color:'var(--text)' }}>
                  Meet <span style={{ color:activeColor === '#e4e8f5' ? '#5b8dee' : activeColor }}>Axon</span>
                </h1>
                <p style={{ fontSize:14,color:'var(--soft)',maxWidth:300,lineHeight:1.7 }}>
                  Your AI assistant with memory, voice, themes, search and more.
                </p>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,width:'100%',maxWidth:440 }}>
                {SUGGESTIONS.map((s,i)=>(
                  <div key={i} onClick={()=>send(s.prompt)}
                    style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'11px 13px',cursor:'pointer',textAlign:'left',transition:'all .17s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=activeColor;e.currentTarget.style.transform='translateY(-2px)';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none';}}>
                    <div style={{ fontSize:13,fontWeight:500,color:'var(--text)' }}>{s.icon} {s.title}</div>
                    <div style={{ fontSize:11,color:'var(--muted)',marginTop:3 }}>{s.prompt.slice(0,32)}…</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m,i)=>(
            <Bubble key={i} role={m.role} content={m.content} mood={m.mood}
              responseTime={m.responseTime} onSpeak={(t)=>speak(t,i)}
              speaking={speakingIdx===i} darkMode={darkMode}
              didSearch={m.didSearch} />
          ))}

          {busy && !isStreaming && (
            <div style={{ display:'flex',gap:10,padding:'4px 0' }}>
              <div style={{ width:28,height:28,borderRadius:7,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,marginTop:3,
                background:`linear-gradient(135deg,${activeColor},${activeColor}88)`,color:'#fff',fontFamily:'Syne,sans-serif' }}>A</div>
              <div style={{ padding:'12px 14px',borderRadius:13,background:'var(--surface)',border:'1px solid var(--border)',borderTopLeftRadius:3,display:'flex',gap:5,alignItems:'center' }}>
                {[0,1,2].map(i=><div key={i} style={{ width:6,height:6,background:activeColor,borderRadius:'50%',animation:`dot 1.2s ease-in-out ${i*.2}s infinite` }}/>)}
              </div>
            </div>
          )}
          {/* Streaming animation bubble */}
          {isStreaming && streamedContent && (
            <div style={{ display:'flex', gap:10, padding:'4px 0', animation:'fadeUp .25s ease both' }}>
              <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, marginTop:3,
                background:`linear-gradient(135deg,${activeColor},${activeColor}88)`, color:'#fff', fontFamily:'Syne,sans-serif' }}>A</div>
              <div style={{ maxWidth:'85%', padding:'11px 14px', borderRadius:13, fontSize:14.5, lineHeight:1.78, color:'var(--text)',
                background:'var(--surface)', border:`1px solid ${activeColor}25`, borderTopLeftRadius:3 }}>
                <span style={{ color: darkMode ? '#e6eaf5' : '#1a1d2e' }}>{streamedContent.replace(/#{1,4} /g, '').replace(/^[-*+] /gm, '• ').replace(/\*\*/g, '').replace(/\*/g, '')}</span>
                <span style={{ display:'inline-block', width:2, height:14, background:activeColor, marginLeft:2, borderRadius:1, animation:'cursorBlink .6s ease infinite', verticalAlign:'middle' }}/>
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        <div style={{ padding:'10px 14px 16px',borderTop:'1px solid var(--border)',flexShrink:0,background:'var(--bg)' }}>
          <div style={{ background:'var(--surface)',border:`1px solid ${activeColor}35`,borderRadius:12,display:'flex',alignItems:'flex-end',padding:'3px 3px 3px 13px',transition:'border-color 0.5s ease' }}>
            <button onClick={toggleVoice}
              style={{ width:32,height:32,borderRadius:8,background:listening?'rgba(239,68,68,0.15)':'none',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:listening?'#ef4444':'var(--muted)',flexShrink:0,marginRight:4,animation:listening?'micPulse 1.5s ease infinite':'none' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <textarea ref={taRef} value={input} rows={1} placeholder={listening?'🎤 Listening…':'Ask Axon anything…'}
              onChange={e=>{setInput(e.target.value);resize();}}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
              style={{ flex:1,background:'none',border:'none',outline:'none',fontFamily:'DM Sans,sans-serif',fontSize:15,color:'var(--text)',lineHeight:1.6,resize:'none',maxHeight:120,minHeight:40,padding:'8px 0',overflowY:'auto' }}
            />
            <button onClick={()=>send()} disabled={busy||!input.trim()}
              style={{ width:36,height:36,borderRadius:9,background:busy||!input.trim()?'var(--border2)':activeColor,border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:busy||!input.trim()?'not-allowed':'pointer',transition:'background 0.5s ease',flexShrink:0,margin:2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div style={{ textAlign:'center',paddingTop:6,fontSize:11,color:'var(--muted)' }}>
            Powered by <span style={{ color:activeColor }}>Cerebras</span>
          </div>
        </div>
      </main>
    </div>
  );
}
