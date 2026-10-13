import { useEffect, useState } from 'react'; import { api, IST, useSite, rupee } from './api.jsx';
import Pay from './Pay.jsx';
const D = d => IST(d) + ' IST';
const day = d => new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
const clock = d => new Date(d).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }).toUpperCase() + ' IST';
const STEPS = ['Applied', 'Fee', 'Aptitude', 'Interview', 'Decision'];
// Works out where the student is and what they should do next.
const flow = a => {
  const ps = a.payment_status || 'None', ap = a.aptitude?.status, decided = a.status === 'Selected' || a.status === 'Rejected';
  const done = [true, ps === 'Paid' || (ps === 'None' && !!ap), ap === 'Submitted', !!a.interview_at, decided];
  let now;
  if (a.status === 'Rejected') now = ['Application closed', 'Thank you for applying. We could not move forward this time. You are welcome to apply for another internship.', 'bad'];
  else if (a.status === 'Selected') now = ['Congratulations, you are selected!', a.project_title ? 'Your project is assigned. Open it to see the details and add your daily progress.' : 'Our team will assign your project and time period soon.', 'good'];
  else if (ps === 'Requested') now = ['Pay the registration fee', 'Use the payment box below, then enter your 12-digit UTR number.', 'act'];
  else if (ps === 'UTR submitted') now = ['Payment is being verified', 'We will confirm your UTR shortly. No action needed.', 'wait'];
  else if (ap === 'Sent' || ap === 'Started') now = ['Take your aptitude test', ap === 'Started' ? 'Your timer is running. Continue the test.' : 'Start when you are ready, in a quiet place.', 'act'];
  else if (a.interview_at && a.status === 'Interview scheduled') now = ['Attend your interview', D(a.interview_at), 'act'];
  else if (ap === 'Submitted') now = ['Test submitted', 'We are reviewing your answers and will update you here and in chat.', 'wait'];
  else now = ['Application received', 'Our team is reviewing it. We will ask for the next step here and in chat.', 'wait'];
  const label = a.status === 'Rejected' ? 'Not selected' : a.status === 'Selected' ? 'Selected' : STEPS[done.findIndex(x => !x)] || 'In review';
  return { done, now, label };
};
const cls = a => a.status === 'Rejected' ? 'bad' : a.status === 'Selected' ? 'good' : '';
export default function Account({ user, banner, id }) { const site = useSite();
  const [list, setList] = useState(null); const [err, setErr] = useState('');
  const load = () => api('/student/applications').then(setList).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const sel = id && id !== 'new' ? list?.find(x => String(x.id) === id) : null;
  const hello = <div className="ac-hello"><div className="ac-av">{user.name[0]}</div><div><h1>My application</h1><p className="mut">Signed in as {user.name} · {user.email}</p></div></div>;

  // ---------- Page 2: details of ONE application (opens when the student clicks a domain) ----------
  if (id && id !== 'new') {
    if (!list && !err) return <section className="ac-page"><p>Loading…</p></section>;
    if (!sel) return <section className="ac-page"><a className="ac-back" href="#/account">← All my applications</a>{err && <p className="err">{err}</p>}{list && <div className="empty"><p>We could not find that application.</p></div>}</section>;
    const a = sel, { done, now: [nt, nx, tone], label } = flow(a);
    return (<section className="ac-page"><a className="ac-back" href="#/account">← All my applications</a>
      <article className="ac">
        <header className="ac-head"><div><h3>{a.title || a.domain}</h3><small>{a.domain}</small></div><span className={`ac-badge ${cls(a)}`}>{label}</span></header>
        <ol className="ac-steps">{STEPS.map((x, i) => <li key={x} className={`${done[i] ? 'done' : ''} ${!done[i] && done.findIndex(y => !y) === i ? 'now' : ''}`}><i>{done[i] ? '✓' : i + 1}</i><span>{x}</span></li>)}</ol>
        <div className={`ac-now ${tone}`}><div><small>{tone === 'act' ? 'Your next step' : tone === 'wait' ? 'In progress' : 'Update'}</small><b>{nt}</b><p>{nx}</p></div>
          {a.aptitude && a.aptitude.status !== 'Submitted' && a.status !== 'Rejected' && <a className="btn sm" href={'#/aptitude/' + a.id}>{a.aptitude.status === 'Started' ? 'Continue test' : 'Start test'}</a>}
          {a.status === 'Selected' && <a className="btn sm" href={'#/project/' + a.id}>Open my project</a>}</div>
        <Pay a={a} reload={load} />
        <dl className="ac-info">
          <div><dt>Domain</dt><dd>{a.domain}</dd></div>
          <div><dt>Applied on</dt><dd>{day(a.applied_at)}<small>{clock(a.applied_at)}</small></dd></div>
          {a.months > 0 && <div><dt>Duration</dt><dd>{a.months} month{a.months > 1 ? 's' : ''}</dd></div>}
          {a.stipend_monthly > 0 && <div><dt>Stipend</dt><dd>{rupee(a.stipend_monthly)}<small>per month</small></dd></div>}
          {a.internship_fee > 0 && <div><dt>Certification fee</dt><dd>{rupee(a.internship_fee)}<small>one-time</small></dd></div>}
        </dl>
        <div className="ac-grid">
          {a.aptitude && <div className="msg"><b>📝 {a.aptitude.title}</b><p className="mut">{a.aptitude.status === 'Submitted' ? `Submitted ${D(a.aptitude.submitted_at)}. We will notify you about the result.` : `${a.aptitude.duration_min} minutes.`}</p></div>}
          {a.interview_at && <div className="msg"><b>📅 Interview: {D(a.interview_at)}</b><p>{a.interview_duration_min} minutes · {a.interview_mode}{a.interview_link && <> · {/^https?:\/\//.test(a.interview_link) ? <a href={a.interview_link} target="_blank" rel="noreferrer">Join / open link</a> : a.interview_link}</>}</p>{a.interview_notes && <p className="mut">{a.interview_notes}</p>}</div>}
          {a.status === 'Selected' && a.project_title && <div className="msg"><b>🚀 Your project: {a.project_title}</b><p>{a.project_details}</p><small className="mut">{a.start_date} to {a.end_date} · {a.duration_days} days</small></div>}
          {a.admin_message && <div className="msg"><b>💬 Message from {site.company}</b><p>{a.admin_message}</p><small className="mut">Updated {D(a.updated_at)}</small></div>}</div>
        <div className="acts"><button className="btn sm ghost" onClick={() => dispatchEvent(new CustomEvent('cvx-chat', { detail: a.id }))}>💬 Chat with {site.company}{a.unread > 0 && <span className="dot">{a.unread}</span>}</button></div></article></section>);
  }

  // ---------- Page 1: simple list, one row per domain ----------
  return (<section className="ac-page">{hello}
    {banner && <p className="ok">Application received. Our team will review it and ask for the registration fee on this page and in chat.</p>}{err && <p className="err">{err}</p>}{!list && !err && <p>Loading…</p>}
    {list?.length === 0 && <div className="empty"><p>You have not applied yet.</p><a className="btn sm" href="#/careers">See open internships</a></div>}
    {list?.length > 0 && <p className="mut ac-tip">Tap a domain to see its full details.</p>}
    <div className="ac-list">{list?.map(a => { const { now: [nt, , tone], label } = flow(a); return (<a className="ac-row" href={'#/account/' + a.id} key={a.id}>
      <div className="ac-row-main"><b>{a.title || a.domain}</b><small>{a.domain} · Applied {day(a.applied_at)}</small><span className={`ac-row-next ${tone}`}>{nt}</span></div>
      {a.unread > 0 && <span className="dot">{a.unread}</span>}<span className={`ac-badge ${cls(a)}`}>{label}</span><span className="ac-go">›</span></a>); })}</div></section>);
}