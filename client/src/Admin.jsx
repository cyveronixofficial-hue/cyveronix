import { useEffect, useState } from 'react'; import Chat from './Chat.jsx'; import { refreshSite, IST, useSite, rupee } from './api.jsx'; import { Logo } from './ui.jsx'; import { Jobs, GalleryAdmin, LeadersAdmin } from './AdminManage.jsx';
const STATUS = ['New', 'Interview scheduled', 'Selected', 'Rejected'];
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const J = b => JSON.stringify(b);
// Where is this applicant in the hiring pipeline, and what should the admin do next?
const stage = r => {
  const ps = r.payment_status || 'None', ap = r.apt_status;
  if (r.status === 'Rejected') return ['Rejected', 'bad', 'Closed'];
  if (r.status === 'Selected') return [r.project_title ? 'Project assigned' : 'Selected', 'good', r.project_title ? 'Done' : 'Assign a project'];
  if (ps === 'UTR submitted') return ['Verify payment', 'warn', 'Check UTR in your UPI app'];
  if (ps === 'Requested') return ['Awaiting payment', '', 'Waiting for student'];
  if (!ap) return ['Applied', '', ps === 'Paid' ? 'Send aptitude test' : 'Request fee or send test'];
  if (ap === 'Sent' || ap === 'Started') return ['Taking test', '', ap === 'Started' ? 'Test in progress' : 'Waiting for student'];
  if (r.status === 'Interview scheduled') return ['Interview set', 'warn', 'Hold interview, then select or reject'];
  return ['Test submitted', 'warn', 'Review result, schedule interview'];
};
const Pill = ({ c = '', children }) => <span className={`pill2 ${c}`}>{children}</span>;
const Steps = ({ r }) => { const ps = r.payment_status || 'None', ap = r.apt_status, done = [true, ps === 'Paid', ap === 'Submitted', !!r.interview_at, r.status === 'Selected' || r.status === 'Rejected'];
  return <ol className="pipe">{['Applied', 'Fee paid', 'Aptitude', 'Interview', 'Decision'].map((x, i) => <li key={x} className={done[i] ? 'done' : ''}>{x}</li>)}</ol>; };
function Fee({ r, call, reload }) {
  const site = useSite();
  const [f, setF] = useState({ amount: r.fee_amount || r.internship_fee || '', upi_id: r.fee_upi_id || localStorage.getItem('cvx_upi') || '', payee: r.fee_payee || site.company });
  const [note, setNote] = useState(''); const [rej, setRej] = useState('');
  const run = async (path, body, okMsg) => { const x = await call('/applications/' + r.id + path, { method: 'POST', body: JSON.stringify(body) }); const d = await x.json().catch(() => ({}));
    setNote(x.ok ? '✔ ' + okMsg : (d.error || 'Failed')); if (x.ok) reload(); };
  const ps = r.payment_status || 'None';
  return (<div><h4 className="dh">Registration fee</h4>
    <p style={{ margin: '2px 0' }}><b>Payment:</b> <span className={`st ${ps === 'Paid' ? 'good' : ''}`}>{ps === 'None' ? 'Not requested' : ps}</span></p>
    {ps === 'UTR submitted' && <div className="msg"><b>UTR entered by student: <code style={{ fontSize: '1.1em' }}>{r.utr}</code></b>
      <p className="mut" style={{ margin: '4px 0' }}>Fee ₹{r.fee_amount} → {r.fee_upi_id}. Match this UTR with your Google Pay / bank history.</p>
      <div className="row"><button className="btn sm" onClick={() => run('/payment', { action: 'approve' }, 'Marked as Payment done')}>✔ UTR matches – Payment done</button></div>
      <div className="row" style={{ marginTop: 6 }}><input placeholder="Reason (optional)" value={rej} onChange={e => setRej(e.target.value)} /><button className="btn sm ghost" onClick={() => run('/payment', { action: 'reject', note: rej }, 'UTR rejected, student can enter it again')}>✘ Doesn't match</button></div></div>}
    {ps === 'Paid' && <p className="mut">Paid ₹{r.fee_amount} · UTR {r.utr}</p>}
    {ps !== 'Paid' && ps !== 'UTR submitted' && <form className="pform" onSubmit={e => { e.preventDefault(); try { localStorage.setItem('cvx_upi', f.upi_id); } catch { } run('/fee', { ...f, amount: +f.amount }, 'Fee request sent to the student'); }}>
      <div className="two"><label>Registration fee (₹)<input type="number" required min="1" step="0.01" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></label>
        <label>Company UPI ID<input required value={f.upi_id} onChange={e => setF({ ...f, upi_id: e.target.value })} placeholder="name@okaxis" /></label></div>
      <label>Payee name (shown in Google Pay)<input value={f.payee} onChange={e => setF({ ...f, payee: e.target.value })} /></label>
      <button className="btn sm">{ps === 'Requested' ? 'Update fee request' : 'Request registration fee'}</button></form>}
    {note && <small>{note}</small>}</div>);
}
function Aptitude({ r, call, reload }) {
  const [tests, setTests] = useState([]); const [tid, setTid] = useState(''); const [res, setRes] = useState(undefined); const [note, setNote] = useState(''); const [show, setShow] = useState(false);
  const load = () => call('/applications/' + r.id + '/aptitude').then(x => x.json()).then(setRes).catch(() => setRes(null));
  useEffect(() => { load(); call('/tests').then(x => x.json()).then(t => { const ok = t.filter(z => z.questions > 0); setTests(ok); if (ok[0]) setTid(String(ok[0].id)); }); }, [r.id, r.apt_status]);
  const send = async () => { const x = await call('/applications/' + r.id + '/aptitude', { method: 'POST', body: J({ test_id: +tid }) }); const d = await x.json().catch(() => ({})); setNote(x.ok ? '✔ Test sent. The student is notified in chat.' : d.error || 'Failed'); if (x.ok) { reload(); load(); } };
  const withdraw = async () => { if (!confirm('Withdraw this test from the student?')) return; const x = await call('/applications/' + r.id + '/aptitude', { method: 'DELETE' }); const d = await x.json().catch(() => ({})); setNote(x.ok ? 'Test withdrawn' : d.error || 'Failed'); reload(); load(); };
  const blocked = ['Requested', 'UTR submitted'].includes(r.payment_status) || ['Rejected', 'Selected'].includes(r.status);
  return (<div><h4 className="dh">Aptitude test</h4>
    {res === undefined && <p className="mut">Loading…</p>}
    {res === null && (blocked ? <p className="mut">{['Rejected', 'Selected'].includes(r.status) ? 'Not available: decision already made.' : 'Available after the registration fee is marked as paid.'}</p> :
      <div className="row"><select value={tid} onChange={e => setTid(e.target.value)}>{tests.map(t => <option key={t.id} value={t.id}>{t.title} ({t.questions} Qs, {t.duration_min} min)</option>)}</select>
        <button className="btn sm" disabled={!tid} onClick={send}>Send test to student</button></div>)}
    {res && res.status !== 'Submitted' && <div><p style={{ margin: '2px 0' }}><b>{res.title}</b> · <Pill c="warn">{res.status === 'Started' ? 'In progress' : 'Sent, not started'}</Pill></p><small className="mut">Sent {IST(res.sent_at)} IST{res.started_at && ` · started ${IST(res.started_at)} IST`}</small>
      <div className="row" style={{ marginTop: 6 }}><button className="btn sm ghost" onClick={withdraw}>Withdraw test</button></div></div>}
    {res && res.status === 'Submitted' && (() => { const pct = res.total ? Math.round(res.score * 100 / res.total) : 0, pass = pct >= res.pass_percent; return (<div>
      <div className={`score ${pass ? 'good' : 'bad'}`}><b>{res.score}/{res.total}</b><span>{pct}%</span><Pill c={pass ? 'good' : 'bad'}>{pass ? 'Above pass mark' : 'Below pass mark'} ({res.pass_percent}%)</Pill>{res.late && <Pill c="warn">Submitted late</Pill>}</div>
      <small className="mut">{res.title} · submitted {IST(res.submitted_at)} IST</small>
      <div className="row" style={{ marginTop: 6 }}><button className="btn sm ghost" onClick={() => setShow(!show)}>{show ? 'Hide answers' : 'View answers'}</button></div>
      {show && <ol className="review">{res.review.map(k => <li key={k.id}><b>{k.question}</b>{k.options.map((o, i) => <div key={i} className={`ro ${i === k.correct ? 'right' : ''} ${i === k.picked && i !== k.correct ? 'wrong' : ''}`}>{'ABCD'[i]}. {o}{i === k.picked ? ' ← student' : ''}{i === k.correct ? ' ✔' : ''}</div>)}{k.picked === null && <small className="err">Not answered</small>}</li>)}</ol>}</div>); })()}
    {note && <small>{note}</small>}</div>);
}
function Interview({ r, call, reload }) {
  const [f, setF] = useState({ at: '', duration_min: r.interview_duration_min || 30, mode: r.interview_mode || 'Online', link: r.interview_link || '', notes: r.interview_notes || '' });
  const [note, setNote] = useState(''); const set = k => e => setF({ ...f, [k]: e.target.value });
  const why = r.status === 'Rejected' || r.status === 'Selected' ? 'Decision already made.' : ['Requested', 'UTR submitted'].includes(r.payment_status) ? 'Available after the registration fee is marked as paid.' : r.apt_status && r.apt_status !== 'Submitted' ? 'Available after the student submits the aptitude test.' : '';
  const save = async e => { e.preventDefault(); const x = await call('/applications/' + r.id + '/interview', { method: 'POST', body: J({ ...f, at: new Date(f.at).toISOString() }) });
    const d = await x.json().catch(() => ({})); setNote(x.ok ? '✔ Interview scheduled. Student is notified.' : d.error || 'Failed'); if (x.ok) reload(); };
  const min = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  return (<div><h4 className="dh">Interview schedule</h4>
    {r.interview_at && <p style={{ margin: '2px 0' }}><b>Current:</b> {IST(r.interview_at)} IST · {r.interview_duration_min} min · {r.interview_mode}</p>}
    {why ? <p className="mut">{why}</p> :
      <form className="pform" onSubmit={save}>
        <div className="two"><label>Date &amp; time (IST)<input type="datetime-local" required min={min} value={f.at} onChange={set('at')} /></label>
          <label>Duration (minutes)<input type="number" required min="5" max="480" value={f.duration_min} onChange={set('duration_min')} /></label></div>
        <div className="two"><label>Mode<select value={f.mode} onChange={set('mode')}><option>Online</option><option>Phone call</option><option>In person (Okhla office)</option></select></label>
          <label>Meeting link / location<input value={f.link} onChange={set('link')} placeholder="https://meet.google.com/…" /></label></div>
        <label>Instructions<textarea rows="2" value={f.notes} onChange={set('notes')} placeholder="Keep your resume ready, join 5 minutes early…" /></label>
        <button className="btn sm">{r.interview_at ? 'Reschedule interview' : 'Schedule interview'}</button></form>}
    {note && <small>{note}</small>}</div>);
}
function Decision({ r, call, reload, close }) {
  const [msg, setMsg] = useState(r.admin_message || ''); const [note, setNote] = useState('');
  const can = r.status === 'Interview scheduled', done = r.status === 'Selected' || r.status === 'Rejected';
  const go = async status => {
    if (!confirm(status === 'Selected' ? `Select ${r.full_name} for the internship?` : `Reject ${r.full_name}? The student will be notified.`)) return;
    const x = await call('/applications/' + r.id, { method: 'PATCH', body: J({ status, admin_message: msg.trim() || null }) }); const d = await x.json().catch(() => ({}));
    setNote(x.ok ? `✔ Marked ${status}` : d.error || 'Failed'); if (x.ok) reload();
  };
  const remove = async () => {
    if (!confirm(`Delete ${r.full_name}'s application permanently?\n\nTheir chat, payment details and test result are deleted too. This cannot be undone.`)) return;
    const x = await call('/applications/' + r.id, { method: 'DELETE' }); const d = await x.json().catch(() => ({}));
    if (x.ok) { reload(); close(); } else setNote(d.error || 'Failed');
  };
  return (<div><h4 className="dh">Final decision</h4>
    {done ? <p><Pill c={r.status === 'Selected' ? 'good' : 'bad'}>{r.status}</Pill> {r.status === 'Rejected' && <button className="btn sm ghost" onClick={async () => { await call('/applications/' + r.id, { method: 'PATCH', body: J({ status: 'New' }) }); reload(); }}>Reopen application</button>}</p> :
      <><label className="pform">Message to student (optional)<textarea rows="2" value={msg} onChange={e => setMsg(e.target.value)} placeholder="Feedback shown on the student's My application page" /></label>
        <div className="row" style={{ marginTop: 6 }}><button className="btn sm" disabled={!can} title={can ? '' : 'Schedule the interview first'} onClick={() => go('Selected')}>✔ Select candidate</button><button className="btn sm danger" onClick={() => go('Rejected')}>✘ Reject</button></div>
        {!can && <small className="mut">Select unlocks once the interview is scheduled. You can reject at any stage.</small>}</>}
    <div className="danger-zone"><div><b>Delete this application</b><small className="mut">Removes it completely, including chat and test result. Use after rejecting, or for spam.</small></div><button className="btn sm danger" onClick={remove}>Delete application</button></div>
    {note && <small>{note}</small>}</div>);
}
function Project({ r, call, reload }) {
  const [p, setP] = useState({ project_title: r.project_title || '', project_details: r.project_details || '', start_date: r.start_date || today(), duration_days: r.duration_days || (r.months ? r.months * 30 : 30) });
  const [note, setNote] = useState(''); const set = k => e => setP({ ...p, [k]: e.target.value });
  const assign = async e => { e.preventDefault(); const x = await call('/applications/' + r.id, { method: 'PATCH', body: J({ ...p, duration_days: +p.duration_days }) });
    const d = x.ok ? {} : await x.json().catch(() => ({})); setNote(x.ok ? '✔ Saved. The student is notified.' : (d.error || 'Could not save')); reload(); };
  return (<div><h4 className="dh">Project &amp; time period</h4>
    {r.status !== 'Selected' ? <p className="mut">Select the candidate to assign a project and time period.</p> :
      <form className="pform" onSubmit={assign}>
        <label>Project title<input required value={p.project_title} onChange={set('project_title')} placeholder="e.g. Build the client dashboard" /></label>
        <label>Project details / what to deliver<textarea required rows="4" value={p.project_details} onChange={set('project_details')} /></label>
        <div className="two"><label>Start date<input type="date" required value={p.start_date} onChange={set('start_date')} /></label>
          <label>Duration (days)<input type="number" required min="1" max="730" value={p.duration_days} onChange={set('duration_days')} /></label></div>
        <small className="mut">Ends on {new Date(Date.parse(p.start_date || today()) + (Math.max(1, +p.duration_days || 1) - 1) * 864e5).toISOString().slice(0, 10)}. Student asked for {r.months ? r.months + ' month(s)' : 'no fixed period'}. Common: 30, 60, 90 days.</small>
        <button className="btn sm">{r.project_title ? 'Update project' : 'Assign project'}</button>{note && <small>{note}</small>}</form>}</div>);
}
function Detail({ r, call, reload, close }) {
  const url = '/applications/' + r.id + '/messages';
  return (<div className="drawer-wrap" onClick={close}><aside className="drawer" onClick={e => e.stopPropagation()}>
    <header><div><h2 style={{ margin: 0 }}>{r.full_name}</h2><small className="mut">{r.domain} · {r.college}</small></div><button className="x" aria-label="Close" onClick={close}>×</button></header>
    <Steps r={r} />
    <div className="dgrid"><div>
      <h4 className="dh">Applicant</h4>{[['email', r.email], ['phone', r.phone], ['degree', r.degree], ['branch', r.branch], ['year', r.year], ['cgpa', r.cgpa], ['skills', r.skills], ['github', r.github], ['linkedin', r.linkedin], ['internship months', r.months ? r.months + ' month' + (r.months > 1 ? 's' : '') : ''], ['stipend', r.stipend_monthly > 0 ? rupee(r.stipend_monthly) + ' per month' : 'Unpaid'], ['why', r.why]].map(([k, v]) => <p key={k} style={{ margin: '2px 0' }}><b>{k}:</b> {v || '-'}</p>)}
      <Fee r={r} call={call} reload={reload} /><Aptitude r={r} call={call} reload={reload} /><Interview r={r} call={call} reload={reload} /><Decision r={r} call={call} reload={reload} close={close} /><Project r={r} call={call} reload={reload} />
    </div><div>
      <h4 className="dh">Chat with {r.full_name}</h4>
      <Chat me="admin" placeholder="Type a message or paste a link…"
        get={() => call(url).then(x => x.ok ? x.json() : Promise.reject(new Error('Could not load chat')))}
        post={t => call(url, { method: 'POST', body: J({ body: t }) }).then(x => x.ok ? x : Promise.reject(new Error('Could not send')))} />
    </div></div></aside></div>);
}
const blankQ = { question: '', options: ['', '', '', ''], correct: 0 };
function QForm({ init, onSave, onCancel, label }) {
  const [q, setQ] = useState(init || blankQ); const [err, setErr] = useState('');
  const opt = (i, v) => setQ({ ...q, options: q.options.map((o, k) => k === i ? v : o) });
  return (<form className="pform qf" onSubmit={async e => { e.preventDefault(); setErr(''); const m = await onSave(q); if (m) setErr(m); else if (!init) setQ(blankQ); }}>
    <label>Question<textarea required rows="2" value={q.question} onChange={e => setQ({ ...q, question: e.target.value })} /></label>
    {q.options.map((o, i) => <div className="optrow" key={i}><input type="radio" name="corr" title="Mark as correct answer" checked={q.correct === i} onChange={() => setQ({ ...q, correct: i })} /><b>{'ABCD'[i]}</b><input required value={o} placeholder={`Option ${'ABCD'[i]}`} onChange={e => opt(i, e.target.value)} /></div>)}
    <small className="mut">Select the round button next to the correct answer.</small>{err && <p className="err">{err}</p>}
    <div className="row"><button className="btn sm">{label}</button>{onCancel && <button type="button" className="btn sm ghost" onClick={onCancel}>Cancel</button>}</div></form>);
}
function Tests({ call }) {
  const [tests, setTests] = useState([]); const [sel, setSel] = useState(null); const [qs, setQs] = useState([]); const [edit, setEdit] = useState(null); const [msg, setMsg] = useState(''); const [nt, setNt] = useState({ title: '', duration_min: 30, pass_percent: 50, instructions: '' });
  const json = async x => { const d = await x.json().catch(() => ({})); return x.ok ? [d, ''] : [null, d.error || 'Failed']; };
  const loadTests = async keep => { const x = await call('/tests'); const l = await x.json(); setTests(l); if (keep !== undefined) setSel(l.find(t => t.id === keep) || null); };
  const loadQs = async id => setQs(await (await call(`/tests/${id}/questions`)).json());
  useEffect(() => { loadTests(); }, []); useEffect(() => { if (sel) loadQs(sel.id); else setQs([]); setEdit(null); }, [sel?.id]);
  const create = async e => { e.preventDefault(); const [d, er] = await json(await call('/tests', { method: 'POST', body: J(nt) })); if (er) return setMsg(er); setMsg('✔ Test created. Now add questions.'); setNt({ title: '', duration_min: 30, pass_percent: 50, instructions: '' }); await loadTests(d.id); };
  const saveMeta = async e => { e.preventDefault(); const [, er] = await json(await call('/tests/' + sel.id, { method: 'PATCH', body: J(sel) })); setMsg(er || '✔ Test details saved'); loadTests(sel.id); };
  const addQ = async q => { const [, er] = await json(await call(`/tests/${sel.id}/questions`, { method: 'POST', body: J(q) })); if (er) return er; setMsg('✔ Question added'); loadQs(sel.id); loadTests(sel.id); };
  const saveQ = async q => { const [, er] = await json(await call('/questions/' + edit, { method: 'PUT', body: J(q) })); if (er) return er; setEdit(null); setMsg('✔ Question updated'); loadQs(sel.id); };
  const delQ = async id => { if (!confirm('Delete this question?')) return; const [, er] = await json(await call('/questions/' + id, { method: 'DELETE' })); setMsg(er || '✔ Deleted'); loadQs(sel.id); loadTests(sel.id); };
  const dup = async () => { const [d, er] = await json(await call(`/tests/${sel.id}/duplicate`, { method: 'POST' })); setMsg(er || '✔ Copy created'); if (d) loadTests(d.id); };
  const delT = async () => { if (!confirm(`Delete test "${sel.title}" and all its questions?`)) return; const [, er] = await json(await call('/tests/' + sel.id, { method: 'DELETE' })); setMsg(er || '✔ Test deleted'); if (!er) { setSel(null); loadTests(); } };
  const locked = sel && sel.sent > 0;
  return (<div className="tgrid"><div>
    <h3 style={{ marginTop: 0 }}>Your aptitude tests</h3>
    <ul className="tlist">{tests.map(t => <li key={t.id} className={sel?.id === t.id ? 'on' : ''} onClick={() => { setSel(t); setMsg(''); }}><b>{t.title}</b><small>{t.questions} questions · {t.duration_min} min · pass {t.pass_percent}% · sent to {t.sent}</small></li>)}{!tests.length && <li className="mut">No tests yet.</li>}</ul>
    <form className="pform card" onSubmit={create}><h4 className="dh" style={{ marginTop: 0 }}>Create a new test</h4>
      <label>Title<input required value={nt.title} onChange={e => setNt({ ...nt, title: e.target.value })} placeholder="e.g. Cybersecurity aptitude test" /></label>
      <div className="two"><label>Time (minutes)<input type="number" min="5" max="240" required value={nt.duration_min} onChange={e => setNt({ ...nt, duration_min: e.target.value })} /></label><label>Pass mark (%)<input type="number" min="1" max="100" required value={nt.pass_percent} onChange={e => setNt({ ...nt, pass_percent: e.target.value })} /></label></div>
      <label>Instructions for students<textarea rows="2" value={nt.instructions} onChange={e => setNt({ ...nt, instructions: e.target.value })} /></label><button className="btn sm">Create test</button></form>
  </div><div>
    {msg && <p className={msg.startsWith('✔') ? 'ok' : 'err'}>{msg}</p>}
    {!sel ? <p className="mut">Select a test on the left to edit its questions.</p> : <>
      <form className="pform card" onSubmit={saveMeta}><h3 style={{ margin: 0 }}>Edit test</h3>
        <label>Title<input required value={sel.title} onChange={e => setSel({ ...sel, title: e.target.value })} /></label>
        <div className="two"><label>Time (minutes)<input type="number" min="5" max="240" value={sel.duration_min} onChange={e => setSel({ ...sel, duration_min: e.target.value })} /></label><label>Pass mark (%)<input type="number" min="1" max="100" value={sel.pass_percent} onChange={e => setSel({ ...sel, pass_percent: e.target.value })} /></label></div>
        <label>Instructions<textarea rows="2" value={sel.instructions || ''} onChange={e => setSel({ ...sel, instructions: e.target.value })} /></label>
        <div className="row"><button className="btn sm">Save details</button><button type="button" className="btn sm ghost" onClick={dup}>Duplicate</button><button type="button" className="btn sm ghost" onClick={delT}>Delete test</button></div></form>
      {locked && <p className="mut">🔒 Sent to {sel.sent} student(s): questions are locked so results stay fair. Use <b>Duplicate</b> to make an editable copy.</p>}
      <h3>Questions ({qs.length})</h3>
      <ol className="qlist">{qs.map(q => <li key={q.id}>{edit === q.id ? <QForm init={{ question: q.question, options: q.options, correct: q.correct }} label="Save question" onSave={saveQ} onCancel={() => setEdit(null)} /> :
        <div><b>{q.question}</b>{q.options.map((o, i) => <div key={i} className={`ro ${i === q.correct ? 'right' : ''}`}>{'ABCD'[i]}. {o}{i === q.correct ? ' ✔' : ''}</div>)}
          {!locked && <div className="row" style={{ marginTop: 6 }}><button className="btn sm ghost" onClick={() => setEdit(q.id)}>Edit</button><button className="btn sm ghost" onClick={() => delQ(q.id)}>Delete</button></div>}</div>}</li>)}</ol>
      {!locked && <div className="card"><h4 className="dh" style={{ marginTop: 0 }}>Add a question</h4><QForm label="Add question" onSave={addQ} /></div>}</>}
  </div></div>);
}
function Site({ call }) {
  const [f, setF] = useState(null); const [msg, setMsg] = useState('');
  useEffect(() => { fetch('/api/site').then(r => r.json()).then(setF); }, []);
  if (!f) return <p>Loading…</p>; const set = k => e => setF({ ...f, [k]: e.target.value });
  const save = async e => { e.preventDefault(); const x = await call('/site', { method: 'PUT', body: J(f) }); const d = await x.json().catch(() => ({})); setMsg(x.ok ? '✔ Saved. The new details are now live everywhere on the website.' : d.error || 'Failed'); if (x.ok) refreshSite(); };
  return (<form className="pform card" style={{ maxWidth: 680 }} onSubmit={save}><h3 style={{ margin: 0 }}>About &amp; contact details</h3><p className="mut" style={{ margin: 0 }}>These appear in the About page, footer and Home page. Use your real office address, phone and email before going live.</p>
    <label>Company name<input required maxLength="60" value={f.company} onChange={set('company')} /><small className="mut">Change it any time. It updates everywhere on the website: header, footer, About, Home, chat, page title and the admin panel. You can also write {'{company}'} inside the About text to insert it.</small></label>
    <label>Tagline (footer)<input value={f.tagline} onChange={set('tagline')} /></label>
    <label>Office address<textarea required rows="2" value={f.address} onChange={set('address')} /></label>
    <div className="two"><label>Phone<input required value={f.phone} onChange={set('phone')} /></label><label>Office hours<input value={f.hours} onChange={set('hours')} /></label></div>
    <div className="two"><label>General email<input type="email" required value={f.email} onChange={set('email')} /></label><label>Careers email<input type="email" required value={f.careers_email} onChange={set('careers_email')} /></label></div>
    <label>About us text<textarea rows="5" value={f.about} onChange={set('about')} /></label>
    <button className="btn">Save changes</button>{msg && <p className={msg.startsWith('✔') ? 'ok' : 'err'}>{msg}</p>}</form>);
}
const Ic = ({ n }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{{
  apps: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  jobs: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
  tests: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></>,
  gallery: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></>,
  leaders: <><circle cx="12" cy="8" r="7" /><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" /></>,
  site: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>}[n]}</svg>;
const TABS = [['apps', 'Applicants', 'Review and decide'], ['jobs', 'Internships', 'Add, edit, delete'], ['tests', 'Aptitude tests', 'Questions and timing'], ['gallery', 'Gallery', 'Photos on the website'], ['leaders', 'Leadership', 'Team members'], ['site', 'About & contact', 'Company details']];
export default function Admin() {
  const site = useSite();
  const saved = (() => { try { return sessionStorage.getItem('cvx_admin') || ''; } catch { return ''; } })();
  const [key, setKey] = useState(saved); const [ok, setOk] = useState(false); const [rows, setRows] = useState([]); const [stats, setStats] = useState([]); const [dom, setDom] = useState(''); const [err, setErr] = useState(''); const [open, setOpen] = useState(null); const [health, setHealth] = useState(''); const [tab, setTab] = useState('apps'); const [q, setQ] = useState(''); const [flt, setFlt] = useState('');
  const call = (p, o = {}, k = key) => fetch('/api/admin' + p, { ...o, headers: { 'Content-Type': 'application/json', 'x-admin-key': k } });
  const why = async x => { const d = await x.json().catch(() => ({})); return d.error ? d.error + (d.detail ? ' – ' + d.detail : '') : 'Server error ' + x.status; };
  const load = async (d = dom, k = key) => {
    try {
      const a = await call('/applications' + (d ? `?domain=${encodeURIComponent(d)}` : ''), {}, k);
      if (a.status === 401) { try { sessionStorage.removeItem('cvx_admin'); } catch { } return setErr('Wrong admin password'); }
      if (!a.ok) return setErr('Server problem: ' + await why(a));
      const st = await call('/stats', {}, k);
      setRows(await a.json()); setStats(st.ok ? await st.json() : []); setOk(true); setErr(''); try { sessionStorage.setItem('cvx_admin', k); } catch { }
      fetch('/api/health').then(r => r.ok ? r.json() : Promise.reject()).then(h => setHealth(h.db ? '' : 'Database setup failed: ' + h.error), () => setHealth('Server is not responding. Restart it with  npm start  inside the server folder.'));
    } catch { setErr('Cannot reach the server. Start it with  npm start  inside the server folder.'); }
  };
  useEffect(() => { if (saved) load('', saved); }, []);
  useEffect(() => { if (!ok) return; const i = setInterval(() => load(dom, key), 8000); return () => clearInterval(i); }, [ok, dom, key]);
  const logout = () => { try { sessionStorage.removeItem('cvx_admin'); } catch { } setOk(false); setKey(''); setRows([]); };
  if (!ok) return (<div className="adm-login"><form className="adm-card" onSubmit={e => { e.preventDefault(); load('', key); }}><Logo s={46} /><h1>Admin panel</h1><p className="mut">Sign in to manage applicants, internships, gallery and leadership.</p>
    <input type="password" autoFocus placeholder="Admin password" value={key} onChange={e => setKey(e.target.value)} /><button className="btn">Log in</button>{err && <p className="err">{err}</p>}<a className="mut" href="#/">← Back to website</a></form></div>);
  const view = rows.map(r => ({ ...r, st: stage(r) })).filter(r => (!flt || r.st[0] === flt) && (!q || (r.full_name + r.email + r.college + r.phone).toLowerCase().includes(q.toLowerCase())));
  const cur = rows.find(r => r.id === open); const stages = [...new Set(rows.map(r => stage(r)[0]))];
  const todo = rows.filter(r => stage(r)[1] === 'warn').length; const T = TABS.find(t => t[0] === tab);
  return (<div className="adm"><aside className="adm-side"><div className="adm-brand"><Logo s={30} /><div><b>{site.company}</b><small>Admin panel</small></div></div>
    <nav>{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Ic n={k} /><span>{l}</span>{k === 'apps' && todo > 0 && <i className="nbadge">{todo}</i>}</button>)}</nav>
    <div className="adm-foot"><a href="#/">← View website</a><button onClick={logout}>Log out</button></div></aside>
    <div className="adm-main"><header className="adm-top"><div><h1>{T[1]}</h1><p className="mut">{T[2]}</p></div></header>
      {health && <p className="err">{health}</p>}{err && <p className="err">{err}</p>}
      {tab === 'apps' && <>
        <div className="kpis"><div><b>{rows.length}</b>Total applicants</div><div className={todo ? 'hot' : ''}><b>{todo}</b>Need your action</div><div><b>{rows.filter(r => r.payment_status === 'Paid').length}</b>Fee paid</div><div><b>{rows.filter(r => r.apt_status === 'Submitted').length}</b>Tests submitted</div><div><b>{rows.filter(r => r.status === 'Selected').length}</b>Selected</div><div><b>{rows.filter(r => r.status === 'Rejected').length}</b>Rejected</div></div>
        <div className="panel"><div className="row filters"><input placeholder="Search name, email, college, phone" value={q} onChange={e => setQ(e.target.value)} />
          <select value={dom} onChange={e => { setDom(e.target.value); load(e.target.value); }}><option value="">All domains</option>{stats.map(s => <option key={s.domain}>{s.domain}</option>)}</select>
          <select value={flt} onChange={e => setFlt(e.target.value)}><option value="">All stages</option>{stages.map(s => <option key={s}>{s}</option>)}</select></div>
          <div className="scroll"><table><thead><tr><th>Name</th><th>Domain</th><th>College</th><th>Applied (IST)</th><th>Stage</th><th>Next action</th><th>Test</th><th></th></tr></thead><tbody>
            {view.map(r => <tr key={r.id} className="clk" onClick={() => setOpen(r.id)}><td><b>{r.full_name}</b>{r.unread > 0 && <span className="dot">{r.unread}</span>}<br /><small className="mut">{r.email}</small></td><td>{r.domain}</td><td>{r.college}</td><td>{IST(r.applied_at)}</td>
              <td><Pill c={r.st[1]}>{r.st[0]}</Pill></td><td>{r.st[2]}</td><td>{r.apt_status === 'Submitted' ? <b>{r.apt_score}/{r.apt_total}</b> : r.apt_status ? '…' : '-'}</td><td><button className="btn sm" onClick={e => { e.stopPropagation(); setOpen(r.id); }}>Open</button></td></tr>)}
            {!view.length && <tr><td colSpan="8" className="mut">No applications match.</td></tr>}</tbody></table></div></div></>}
      {tab === 'jobs' && <Jobs call={call} />}
      {tab === 'tests' && <Tests call={call} />}
      {tab === 'gallery' && <GalleryAdmin call={call} />}
      {tab === 'leaders' && <LeadersAdmin call={call} />}
      {tab === 'site' && <Site call={call} />}
    </div>
    {cur && <Detail key={cur.id} r={{ ...cur, apt_status: cur.apt_status }} call={call} reload={() => load()} close={() => setOpen(null)} />}
  </div>);
}
