import { useEffect, useState } from 'react'; import { readImage } from './api.jsx';
const J = JSON.stringify;
async function res(x) { const d = await x.json().catch(() => ({})); if (!x.ok) throw new Error(d.error || 'Something went wrong'); return d; }
const Note = ({ m }) => m ? <p className={m.startsWith('✔') ? 'ok' : 'err'}>{m}</p> : null;
function ImagePick({ value, onChange, optional }) {
  const [err, setErr] = useState('');
  const pick = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { onChange(await readImage(f)); setErr(''); } catch (x) { setErr(x.message); } };
  return (<div className="imgpick"><div className="imgprev">{value ? <img src={value} alt="Preview" /> : <span>{optional ? 'No photo (initials are shown)' : 'No image chosen'}</span>}</div>
    <div className="row"><label className="btn sm ghost">{value ? 'Change image' : 'Choose image'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} /></label>
      {value && optional && <button type="button" className="btn sm ghost" onClick={() => onChange('')}>Remove photo</button>}</div>
    <small className="mut">JPG, PNG or WebP. Large photos are resized automatically.</small>{err && <small className="err">{err}</small>}</div>);
}
const Empty = ({ children }) => <div className="empty">{children}</div>;

// ---------- Internships ----------
const blankJob = { title: '', domain: '', min_months: 1, max_months: 6, mode: 'Remote', stipend_amount: 0, fee_amount: 0, skills: '', description: '', open: true };
const dur = j => j.min_months === j.max_months ? `${j.min_months} month${j.min_months > 1 ? 's' : ''}` : `${j.min_months}-${j.max_months} months`;
export function Jobs({ call }) {
  const [list, setList] = useState(null), [f, setF] = useState(blankJob), [edit, setEdit] = useState(null), [msg, setMsg] = useState('');
  const load = () => call('/internships').then(res).then(setList).catch(e => setMsg(e.message));
  useEffect(() => { load(); }, []);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const save = async e => { e.preventDefault(); try { await res(await call(edit ? '/internships/' + edit : '/internships', { method: edit ? 'PUT' : 'POST', body: J(f) })); setMsg(edit ? '✔ Internship updated' : '✔ Internship added'); setF(blankJob); setEdit(null); load(); } catch (x) { setMsg(x.message); } };
  const toggle = async j => { try { await res(await call('/internships/' + j.id, { method: 'PUT', body: J({ ...j, open: !j.open }) })); load(); } catch (x) { setMsg(x.message); } };
  const del = async j => { if (!confirm(`Delete "${j.title}"?`)) return; try { await res(await call('/internships/' + j.id, { method: 'DELETE' })); setMsg('✔ Deleted'); load(); } catch (x) { setMsg(x.message); } };
  const domains = [...new Set((list || []).map(j => j.domain))];
  return (<div className="mgrid"><div>
    <div className="panel"><div className="panel-h"><h3>Internships ({list?.length ?? 0})</h3><small className="mut">Open ones show on the Careers page.</small></div>
      {!list && <p className="mut">Loading…</p>}{list && !list.length && <Empty>No internships yet. Add your first one.</Empty>}
      <ul className="rows">{list?.map(j => <li key={j.id}><div className="grow"><b>{j.title}</b><small className="mut">{j.domain} · {dur(j)} · {j.mode} · {j.stipend_amount > 0 ? '₹' + Number(j.stipend_amount).toLocaleString('en-IN') + '/month' : 'Unpaid'} · {j.fee_amount > 0 ? 'Fee ₹' + Number(j.fee_amount).toLocaleString('en-IN') : 'No fee'} · {j.applications} application(s)</small></div>
        <span className={`pill2 ${j.open ? 'good' : ''}`}>{j.open ? 'Open' : 'Closed'}</span>
        <button className="btn sm ghost" onClick={() => { setEdit(j.id); setF({ ...blankJob, ...j }); setMsg(''); scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
        <button className="btn sm ghost" onClick={() => toggle(j)}>{j.open ? 'Close' : 'Reopen'}</button>
        <button className="btn sm danger" onClick={() => del(j)}>Delete</button></li>)}</ul></div></div>
    <form className="panel pform" onSubmit={save}><div className="panel-h"><h3>{edit ? 'Edit internship' : 'Add an internship'}</h3>{edit && <button type="button" className="btn sm ghost" onClick={() => { setEdit(null); setF(blankJob); }}>Cancel</button>}</div>
      <label>Title<input required value={f.title} onChange={set('title')} placeholder="e.g. Web Development Intern" /></label>
      <label>Domain<input required list="doms" value={f.domain} onChange={set('domain')} placeholder="e.g. Web Development" /><datalist id="doms">{domains.map(d => <option key={d} value={d} />)}</datalist></label>
      <div className="two"><label>Minimum months<input type="number" required min="1" max="24" value={f.min_months} onChange={set('min_months')} /></label><label>Maximum months<input type="number" required min="1" max="24" value={f.max_months} onChange={set('max_months')} /></label></div>
      <small className="mut" style={{ marginTop: -6 }}>Students choose how many months they want to intern, between these two numbers.</small>
      <label>Mode<select value={f.mode} onChange={set('mode')}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label>
      <label>Stipend per month (₹)<input type="number" min="0" step="500" value={f.stipend_amount} onChange={set('stipend_amount')} placeholder="8000 (enter 0 if unpaid)" /><small className="mut">Shown to students on the Careers page and on the application form.</small></label>
      <label>Certification fee (₹, one-time)<input type="number" min="0" step="1" value={f.fee_amount} onChange={set('fee_amount')} placeholder="99 (enter 0 if there is no fee)" /><small className="mut">A single flat amount for this internship, not multiplied by the months a student picks. Shown on the application form as the fee for the certificate and hands-on experience on real projects.</small></label>
      <label>Skills<input value={f.skills} onChange={set('skills')} placeholder="HTML, CSS, React" /></label>
      <label>Description<textarea rows="4" value={f.description} onChange={set('description')} /></label>
      <label className="chk"><input type="checkbox" checked={f.open} onChange={e => setF({ ...f, open: e.target.checked })} /> Open for applications</label>
      <button className="btn">{edit ? 'Save changes' : 'Add internship'}</button><Note m={msg} /></form></div>);
}

// ---------- Gallery ----------
const blankPic = { title: '', category: 'Offices', location: '', image: '' };
export function GalleryAdmin({ call }) {
  const [items, setItems] = useState(null), [f, setF] = useState(blankPic), [edit, setEdit] = useState(null), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const load = () => fetch('/api/gallery').then(r => r.json()).then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const save = async e => { e.preventDefault(); if (!f.image) return setMsg('Choose an image first'); setBusy(true);
    try { const body = { title: f.title, category: f.category, location: f.location }; if (f.image.startsWith('data:')) body.image = f.image;
      await res(await call(edit ? '/gallery/' + edit : '/gallery', { method: edit ? 'PUT' : 'POST', body: J(body) })); setMsg(edit ? '✔ Photo updated' : '✔ Photo added to the website'); setF(blankPic); setEdit(null); load(); } catch (x) { setMsg(x.message); } setBusy(false); };
  const del = async i => { if (!confirm(`Delete "${i.title}" from the website?`)) return; try { await res(await call('/gallery/' + i.id, { method: 'DELETE' })); setMsg('✔ Photo deleted'); load(); } catch (x) { setMsg(x.message); } };
  const cats = [...new Set(['Buildings', 'Offices', 'Teams', 'Events', 'Awards', ...(items || []).map(i => i.category)])];
  return (<div className="mgrid rev"><form className="panel pform" onSubmit={save}><div className="panel-h"><h3>{edit ? 'Edit photo' : 'Add a photo'}</h3>{edit && <button type="button" className="btn sm ghost" onClick={() => { setEdit(null); setF(blankPic); }}>Cancel</button>}</div>
    <ImagePick value={f.image} onChange={v => setF({ ...f, image: v })} />
    <label>Title<input required value={f.title} onChange={set('title')} placeholder="e.g. Hackathon 2026" /></label>
    <div className="two"><label>Category<input required list="cats" value={f.category} onChange={set('category')} /><datalist id="cats">{cats.map(c => <option key={c} value={c} />)}</datalist></label>
      <label>Location<input value={f.location} onChange={set('location')} placeholder="e.g. Okhla, New Delhi" /></label></div>
    <button className="btn" disabled={busy}>{busy ? 'Saving…' : edit ? 'Save changes' : 'Add to gallery'}</button><Note m={msg} /></form>
    <div className="panel"><div className="panel-h"><h3>Gallery photos ({items?.length ?? 0})</h3><small className="mut">Shown on the Home, About and Gallery pages.</small></div>
      {!items && <p className="mut">Loading…</p>}{items && !items.length && <Empty>No photos yet. The website hides the gallery until you add one.</Empty>}
      <div className="agrid">{items?.map(i => <figure key={i.id} className="acard"><img src={i.image} alt={i.title} loading="lazy" /><figcaption><b>{i.title}</b><small>{[i.category, i.location].filter(Boolean).join(' · ')}</small>
        <div className="row"><button className="btn sm ghost" onClick={() => { setEdit(i.id); setF({ title: i.title, category: i.category, location: i.location || '', image: i.image }); setMsg(''); scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button><button className="btn sm danger" onClick={() => del(i)}>Delete</button></div></figcaption></figure>)}</div></div></div>);
}

// ---------- Leadership ----------
const blankL = { name: '', role: '', bio: '', position: 1, image: '' };
export function LeadersAdmin({ call }) {
  const [list, setList] = useState(null), [f, setF] = useState(blankL), [edit, setEdit] = useState(null), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const load = () => fetch('/api/leaders').then(r => r.json()).then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const save = async e => { e.preventDefault(); setBusy(true);
    try { const body = { name: f.name, role: f.role, bio: f.bio, position: +f.position || 0 }; if (f.image.startsWith('data:')) body.image = f.image; else if (!f.image) body.remove_image = true;
      await res(await call(edit ? '/leaders/' + edit : '/leaders', { method: edit ? 'PUT' : 'POST', body: J(body) })); setMsg(edit ? '✔ Leader updated' : '✔ Leader added to the website'); setF({ ...blankL, position: (list?.length || 0) + 2 }); setEdit(null); load(); } catch (x) { setMsg(x.message); } setBusy(false); };
  const del = async l => { if (!confirm(`Remove ${l.name} from the website?`)) return; try { await res(await call('/leaders/' + l.id, { method: 'DELETE' })); setMsg('✔ Removed'); load(); } catch (x) { setMsg(x.message); } };
  return (<div className="mgrid rev"><form className="panel pform" onSubmit={save}><div className="panel-h"><h3>{edit ? 'Edit leader' : 'Add a leader'}</h3>{edit && <button type="button" className="btn sm ghost" onClick={() => { setEdit(null); setF(blankL); }}>Cancel</button>}</div>
    <ImagePick optional value={f.image} onChange={v => setF({ ...f, image: v })} />
    <label>Full name<input required value={f.name} onChange={set('name')} /></label>
    <label>Role<input required value={f.role} onChange={set('role')} placeholder="e.g. CEO & Co-founder" /></label>
    <label>Short bio (optional)<textarea rows="3" maxLength="500" value={f.bio} onChange={set('bio')} /></label>
    <label>Display order (1 = first)<input type="number" min="0" max="999" value={f.position} onChange={set('position')} /></label>
    <button className="btn" disabled={busy}>{busy ? 'Saving…' : edit ? 'Save changes' : 'Add leader'}</button><Note m={msg} /></form>
    <div className="panel"><div className="panel-h"><h3>Leadership team ({list?.length ?? 0})</h3><small className="mut">Shown on the Home page. Hidden while empty.</small></div>
      {!list && <p className="mut">Loading…</p>}{list && !list.length && <Empty>No leaders yet. Add your first team member.</Empty>}
      <ul className="rows">{list?.map(l => <li key={l.id}>{l.image ? <img className="thumb" src={l.image} alt="" /> : <span className="thumb ini">{l.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>}
        <div className="grow"><b>{l.name}</b><small className="mut">{l.role} · order {l.position}</small></div>
        <button className="btn sm ghost" onClick={() => { setEdit(l.id); setF({ name: l.name, role: l.role, bio: l.bio || '', position: l.position, image: l.image || '' }); setMsg(''); scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
        <button className="btn sm danger" onClick={() => del(l)}>Delete</button></li>)}</ul></div></div>);
}
