import { useEffect, useState } from 'react'; import { api, PhoneInput, rupee } from './api.jsx';
const F = (label, name, extra = {}) => ({ label, name, ...extra });
const fields = [F('Full name', 'full_name'), F('Email', 'email', { type: 'email' }), F('Phone', 'phone', { phone: 1, wide: 1 }), F('College name', 'college'),
  F('Degree', 'degree', { options: ['B.Tech / BE', 'BCA', 'BSc CS / IT', 'M.Tech / ME', 'MCA'] }), F('Branch', 'branch', { ph: 'e.g. Computer Science Engineering' }),
  F('Current year', 'year', { options: ['1st', '2nd', '3rd', '4th', 'Final (PG)'] }), F('CGPA / percentage', 'cgpa', { ph: 'e.g. 8.2 or 78%' }),
  F('Skills', 'skills', { ph: 'React, Python, Linux…', wide: 1 }), F('GitHub link', 'github', { opt: 1, type: 'url', ph: 'https://github.com/username' }), F('LinkedIn link', 'linkedin', { type: 'url', ph: 'https://linkedin.com/in/username' }),
  F('Why do you want this internship?', 'why', { area: 1, wide: 1 }), F('Resume (PDF or Word, up to 2 MB)', 'resume', { file: 1, wide: 1 })];
export default function Apply({ id, user }) {
  const [p0, ...pn] = (user.phone || '+91 ').split(' ');
  const [job, setJob] = useState(null); const [v, setV] = useState({ full_name: user.name, email: user.email, cc: p0, num: pn.join('') }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/internships').then(r => r.json()).then(l => { const j = l.find(x => String(x.id) === id); setJob(j || false); if (j) setV(x => ({ months: x.months || String(Math.min(Math.max(3, j.min_months), j.max_months)), ...x })); }); }, [id]);
  const up = o => setV(x => ({ ...x, ...o })), bind = n => ({ value: v[n] || '', onChange: e => up({ [n]: e.target.value }) });
  const pick = e => { const f = e.target.files[0]; if (f && f.size > 2 * 1024 * 1024) { setErr('Resume must be 2 MB or smaller'); e.target.value = ''; } else setErr(''); };
  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    const { cc, num, resume, ...rest } = v; // the resume file is never sent or stored
    try { await api('/applications', { method: 'POST', body: { ...rest, months: +v.months, phone: cc + ' ' + num, internship_id: id } }); location.hash = '#/account/new'; } catch (x) { setErr(x.message); } setBusy(false);
  };
  if (job === false) return <section className="sec"><p>This internship is not available any more. <a href="#/careers">See open internships</a></p></section>;
  if (!job) return <section className="sec"><p>Loading…</p></section>;
  const months = Array.from({ length: job.max_months - job.min_months + 1 }, (_, k) => job.min_months + k);
  const fee = +job.fee_amount || 0;
  const feeTitle = job.fee_label || 'Certification fee';
  const feeText = job.fee_note ? job.fee_note.split('{fee}').join(rupee(fee)) : null;
  return (<section className="sec"><h1>Apply: {job.title}</h1><p>Domain: {job.domain}. After you apply, our team will send you an aptitude test.{fee > 0 ? ' After you complete it, we request the certification fee and then schedule your interview.' : ' After you complete it, we schedule your interview.'}</p>
    {fee > 0 && <div className="feeinfo"><h3>{feeTitle}</h3>
      {feeText ? <p>{feeText}</p> : <p>The fee for this internship is <b>{rupee(fee)}</b>, paid once, no matter how many months you choose. It covers your <b>internship certification</b> and <b>hands-on experience on real projects</b>.</p>}
      <ol><li><b>Apply now.</b> You pay nothing while submitting this form.</li><li><b>Take the aptitude test.</b> We review your application and send the test to your My application page.</li><li><b>Pay the fee after the test.</b> Once you complete the test, we confirm the exact amount. Pay by Google Pay or any UPI app, then enter the 12-digit UTR number.</li><li><b>Interview.</b> After payment is confirmed we schedule your interview.</li></ol></div>}
    <form className="form" onSubmit={submit}>{fields.map(f => <label key={f.name} className={f.wide ? 'wide' : ''}>{f.label}{f.opt ? ' (optional)' : ''}
      {f.phone ? <PhoneInput cc={v.cc} num={v.num} set={up} />
        : f.file ? <><input type="file" accept=".pdf,.doc,.docx" required onChange={pick} /><small className="mut">Your resume is checked in your browser only. It is not uploaded or saved on our servers.</small></>
        : f.options ? <select required={!f.opt} {...bind(f.name)}><option value="">Select</option>{f.options.map(o => <option key={o}>{o}</option>)}</select>
        : f.area ? <textarea rows="4" required {...bind(f.name)} />
        : <input type={f.type || 'text'} placeholder={f.ph} required={!f.opt} {...bind(f.name)} />}</label>)}
      <label className="wide">How many months do you want to do this internship?
        <select required value={v.months || ''} onChange={e => up({ months: e.target.value })}>{months.map(n => <option key={n} value={n}>{n} month{n > 1 ? 's' : ''}</option>)}</select>
        <small className="mut">You can choose from {job.min_months} to {job.max_months} months.</small></label>
      {err && <p className="err wide">{err}</p>}<button className="btn wide" disabled={busy}>{busy ? 'Sending…' : 'Submit application'}</button></form></section>);
}