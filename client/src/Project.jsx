import { useEffect, useRef, useState } from 'react'; import { api, useSite } from './api.jsx'; import './chat.css';
const iso = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const diff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const fmt = d => new Date(d + 'T00:00').toLocaleDateString([], { dateStyle: 'medium' });
const size = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
// Progress is NOT sent to the database or server. Only a small history is kept in this browser so the student can see what they submitted.
const read = id => { try { return JSON.parse(localStorage.getItem('cvx_progress_' + id)) || []; } catch { return []; } };
const write = (id, v) => { try { localStorage.setItem('cvx_progress_' + id, JSON.stringify(v)); } catch { } };
const Box = ({ children }) => <section className="sec"><h1>My project</h1><div className="card">{children}<p><a className="btn sm" href="#/account">Back to My application</a></p></div></section>;
export default function Project({ id }) { const site = useSite();
  const today = iso(new Date());
  const [a, setA] = useState(null); const [err, setErr] = useState(''); const [log, setLog] = useState([]);
  const [f, setF] = useState({ date: today, hours: '', text: '', link: '' }); const [file, setFile] = useState(null); const [pct, setPct] = useState(null); const [done, setDone] = useState(''); const [fe, setFe] = useState(''); const fi = useRef();
  useEffect(() => { api('/student/applications').then(l => { const x = l.find(y => String(y.id) === String(id)); if (x) { setA(x); setLog(read(x.id)); } else setErr('Application not found'); }).catch(e => setErr(e.message)); }, [id]);
  if (err) return <Box><p className="err">{err}</p></Box>;
  if (!a) return <section className="sec"><p>Loading…</p></section>;
  if (a.status !== 'Selected') return <Box><p>This page opens after you are selected for the internship.</p></Box>;
  if (!a.start_date) return <Box><p>🎉 Congratulations! Your project and time period are being prepared. {site.company} will message you in the chat soon.</p></Box>;
  const total = a.duration_days, state = today < a.start_date ? 'soon' : today > a.end_date ? 'ended' : 'active';
  const day = state === 'soon' ? 0 : Math.min(total, diff(a.start_date, today) + 1), left = state === 'ended' ? 0 : state === 'soon' ? total : diff(today, a.end_date) + 1;
  const maxD = today < a.end_date ? today : a.end_date;
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setDone(''); };
  const pick = e => { const x = e.target.files[0]; setDone(''); if (x && x.size > 100 * 1048576) { setFe('File is too large (max 100 MB).'); e.target.value = ''; return setFile(null); } setFe(''); setFile(x || null); };
  const submit = e => {
    e.preventDefault(); setDone(''); setFe('');
    if (state !== 'active') return setFe(state === 'soon' ? 'Your project has not started yet.' : 'Your internship period has ended.');
    if (f.date < a.start_date || f.date > maxD) return setFe('Choose a date inside your internship period (not in the future).');
    if (f.text.trim().length < 10) return setFe('Please describe what you did today (at least 10 characters).');
    const entry = { ...f, text: f.text.trim(), file: file ? `${file.name} (${size(file.size)})` : '', at: Date.now() }, fl = file;
    setPct(0); let p = 0;
    const t = setInterval(() => { p += fl ? 10 + Math.random() * 15 : 60; if (p < 100) return setPct(Math.round(p));
      clearInterval(t); setPct(null); const nl = [entry, ...log]; setLog(nl); write(a.id, nl);
      setDone(fl ? `"${fl.name}" uploaded successfully ✔` : 'Daily progress submitted successfully ✔');
      setF({ date: today, hours: '', text: '', link: '' }); setFile(null); if (fi.current) fi.current.value = ''; }, 250);
  };
  return (<section className="sec"><h1>My project</h1>
    <div className="card"><div className="apphead"><div><h2 style={{ margin: 0 }}>{a.project_title}</h2><small className="mut">{a.title || a.domain}</small></div>
      <span className={`st ${state === 'ended' ? 'bad' : 'good'}`}>{state === 'soon' ? 'Starts ' + fmt(a.start_date) : state === 'ended' ? 'Period ended' : 'In progress'}</span></div>
      <p style={{ whiteSpace: 'pre-wrap' }}>{a.project_details}</p>
      <div className="pbar"><i style={{ width: `${(day / total) * 100}%` }} /></div>
      <div className="pstats"><div><b>{day}/{total}</b>days done</div><div><b>{left}</b>days left</div><div><b>{log.length}</b>updates sent</div><div><b>{fmt(a.start_date)}</b>start</div><div><b>{fmt(a.end_date)}</b>deadline</div></div>
      <button className="btn sm ghost" onClick={() => dispatchEvent(new CustomEvent('cvx-chat', { detail: a.id }))}>💬 Ask {site.company} a question</button></div>
    <div className="pgrid" style={{ marginTop: 22 }}>
      <form className="card pform" onSubmit={submit}><h3 style={{ margin: 0 }}>Add today's progress</h3>
        <div className="two"><label>Date<input type="date" value={f.date} min={a.start_date} max={maxD} onChange={set('date')} required /></label>
          <label>Hours worked<input type="number" min="0" max="24" step="0.5" placeholder="e.g. 4" value={f.hours} onChange={set('hours')} /></label></div>
        <label>What did you do?<textarea rows="5" required placeholder="Tasks completed, problems faced, what's next…" value={f.text} onChange={set('text')} /></label>
        <label>Project link (GitHub / Drive / demo) – optional<input type="url" placeholder="https://" value={f.link} onChange={set('link')} /></label>
        <label>Upload project file – optional<input ref={fi} type="file" onChange={pick} /></label>
        {pct !== null && <div><div className="pbar"><i style={{ width: pct + '%' }} /></div><small className="mut">Uploading… {pct}%</small></div>}
        {fe && <p className="err">{fe}</p>}{done && <p className="ok">{done}</p>}
        <button className="btn" disabled={pct !== null || state !== 'active'}>{pct !== null ? 'Uploading…' : 'Submit progress'}</button></form>
      <div><h3 style={{ marginTop: 0 }}>My submitted updates</h3>
        {!log.length && <p className="mut">Nothing submitted yet.</p>}
        <ul className="plog">{log.map(x => <li key={x.at}><b>{fmt(x.date)}</b>{x.hours && <span className="mut"> · {x.hours} h</span>}<p>{x.text}</p>
          {x.link && <a href={x.link} target="_blank" rel="noopener noreferrer">{x.link}</a>}{x.file && <small className="mut" style={{ display: 'block' }}>📎 {x.file}</small>}</li>)}</ul></div></div></section>);
}