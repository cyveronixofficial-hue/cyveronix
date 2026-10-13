import { useEffect, useRef, useState } from 'react'; import './chat.css'; import { useSite } from './api.jsx';
// Turns any http(s) link in a message into a clickable link (safe: no HTML injection)
const Linkify = ({ t }) => t.split(/(https?:\/\/[^\s<]+)/g).map((p, i) => i % 2 ? <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p}</a> : p);
const T = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
// me = 'admin' | 'student'. get() -> Promise<messages[]>, post(text) -> Promise
export default function Chat({ me, get, post, height = 300, placeholder = 'Type a message…' }) { const site = useSite();
  const [msgs, setMsgs] = useState([]); const [text, setText] = useState(''); const [err, setErr] = useState(''); const log = useRef();
  const load = () => get().then(m => { setErr(''); setMsgs(Array.isArray(m) ? m : []); }).catch(e => setErr(e.message));
  useEffect(() => { load(); const i = setInterval(load, 4000); return () => clearInterval(i); }, []);
  useEffect(() => { log.current.scrollTop = log.current.scrollHeight; }, [msgs.length]);
  const send = async e => { e?.preventDefault(); const x = text.trim(); if (!x) return; setText(''); try { await post(x); await load(); } catch (er) { setErr(er.message); setText(x); } };
  return (<div className="chat">
    <div className="log" ref={log} style={{ '--h': height + 'px' }}>
      {!msgs.length && <div className="none">No messages yet. Say hello 👋</div>}
      {msgs.map(m => <div key={m.id} className={`bub ${m.sender === me ? 'me' : 'them'}`}><Linkify t={m.body} /><small>{m.sender === me ? 'You' : m.sender === 'admin' ? site.company : 'Student'} · {T(m.created_at)}</small></div>)}
    </div>
    {err && <p className="err">{err}</p>}
    <form onSubmit={send}><textarea rows="2" value={text} placeholder={placeholder} maxLength="2000" onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e); }} />
      <button className="btn sm" disabled={!text.trim()}>Send</button></form>
  </div>);
}