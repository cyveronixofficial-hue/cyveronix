import { useEffect, useRef, useState } from 'react'; import { api, useSite } from './api.jsx'; import Chat from './Chat.jsx';
// Floating chat for logged-in students. Pops open by itself when the admin sends a new message.
export default function ChatWidget() { const site = useSite();
  const [apps, setApps] = useState([]); const [open, setOpen] = useState(false); const [sel, setSel] = useState(null); const prev = useRef(0);
  useEffect(() => { const f = () => api('/student/applications').then(setApps).catch(() => { }); f(); const i = setInterval(f, 6000); return () => clearInterval(i); }, []);
  useEffect(() => { const f = e => { setSel(e.detail); setOpen(true); }; addEventListener('cvx-chat', f); return () => removeEventListener('cvx-chat', f); }, []);
  const unread = apps.reduce((n, a) => n + (a.unread || 0), 0);
  useEffect(() => { if (unread > prev.current) setOpen(true); prev.current = unread; }, [unread]);
  if (!apps.length) return null;
  const cur = apps.find(a => a.id === sel) || apps.find(a => a.unread) || apps[0];
  return (<>
    {open && <div className="cw chat"><header><b>Chat with {site.company}</b>
      {apps.length > 1 && <select value={cur.id} onChange={e => setSel(+e.target.value)}>{apps.map(a => <option key={a.id} value={a.id}>{a.title || a.domain}</option>)}</select>}
      <button aria-label="Close chat" onClick={() => setOpen(false)}>×</button></header>
      <Chat key={cur.id} me="student" height={320} placeholder={`Write to the ${site.company} team…`}
        get={() => api(`/student/applications/${cur.id}/messages`)} post={t => api(`/student/applications/${cur.id}/messages`, { method: 'POST', body: { body: t } })} /></div>}
    {!open && <button className="btn cw-btn" onClick={() => setOpen(true)}>💬 Chat{unread > 0 && <span className="dot">{unread}</span>}</button>}
  </>);
}