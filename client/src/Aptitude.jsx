import { useEffect, useRef, useState } from 'react'; import { api, useSite } from './api.jsx';
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
// Student aptitude test: one question at a time, timer, no result shown after submit.
export default function Aptitude({ id }) { const site = useSite();
  const [t, setT] = useState(null); const [err, setErr] = useState(''); const [ans, setAns] = useState({}); const [i, setI] = useState(0); const [left, setLeft] = useState(0);
  const [phase, setPhase] = useState('intro'); const [busy, setBusy] = useState(false); const ends = useRef(0), sent = useRef(false), ansRef = useRef({});
  const [info, setInfo] = useState(null);
  // Camera: only a live preview. Nothing is recorded, captured or uploaded.
  const streamRef = useRef(null); const [camOn, setCamOn] = useState(false); const [starting, setStarting] = useState(false);
  const stopCam = () => { streamRef.current?.getTracks().forEach(x => x.stop()); streamRef.current = null; setCamOn(false); };
  const startCam = async () => {
    if (streamRef.current?.active) { setCamOn(true); return; }
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot open the camera. Please use Chrome, Edge or Safari on https.');
    try { const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      st.getVideoTracks().forEach(x => { x.onended = () => setCamOn(false); }); streamRef.current = st; setCamOn(true); }
    catch { throw new Error('Camera access is required for this test. Please allow the camera in your browser settings and try again.'); }
  };
  const showCam = el => { if (el && streamRef.current && el.srcObject !== streamRef.current) { el.srcObject = streamRef.current; el.play?.().catch(() => { }); } };
  // ---- Test rules: full screen + warnings. MAX_WARN warnings are allowed, the next time the test is submitted automatically.
  const MAX_WARN = 2;
  const canFs = !!document.documentElement.requestFullscreen;
  const [popup, setPopup] = useState(null), [fs, setFs] = useState(!!document.fullscreenElement), [autoMsg, setAutoMsg] = useState('');
  const warnRef = useRef(0), lastV = useRef(0), popRef = useRef(null);
  const showPop = p => { popRef.current = p; setPopup(p); };
  const enterFs = () => canFs && !document.fullscreenElement ? document.documentElement.requestFullscreen().catch(() => { }) : Promise.resolve();
  const leaveFs = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); };
  useEffect(() => { const f = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f); }, []);
  useEffect(() => () => { stopCam(); leaveFs(); }, []);
  const begin = async () => { setErr(''); setStarting(true); enterFs(); try { await startCam(); const d = await api(`/student/applications/${id}/aptitude/start`, { method: 'POST' }); ends.current = Date.now() + (new Date(d.ends_at) - new Date(d.now)); setT(d); setLeft(Math.max(0, Math.round((ends.current - Date.now()) / 1000))); setPhase('run'); } catch (e) { stopCam(); leaveFs(); setErr(e.message); } setStarting(false); };
  useEffect(() => { api(`/student/applications/${id}/aptitude`).then(d => { setInfo(d); if (d.status === 'Started') begin(); }).catch(e => setErr(e.message)); }, [id]);
  useEffect(() => { ansRef.current = ans; }, [ans]);
  const submit = async (auto = false) => {
    if (sent.current) return; sent.current = true; setBusy(true);
    try { await api(`/student/applications/${id}/aptitude/submit`, { method: 'POST', body: { answers: ansRef.current } }); stopCam(); leaveFs(); setPhase('done'); }
    catch (e) { sent.current = false; setErr(e.message); } setBusy(false);
  };
  useEffect(() => { if (phase !== 'run') return;
    const bad = why => { const now = Date.now(); if (sent.current || popRef.current || now - lastV.current < 1500) return; lastV.current = now;
      const n = ++warnRef.current;
      if (n > MAX_WARN) { setAutoMsg('Your test was submitted automatically because you left the test screen too many times.'); submit(true); } else showPop({ n, why }); };
    const onFs = () => { if (!document.fullscreenElement) bad('You left full screen mode.'); };
    const onVis = () => { if (document.hidden) bad('You switched to another tab or window.'); };
    document.addEventListener('fullscreenchange', onFs); document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('visibilitychange', onVis); }; }, [phase]);
  useEffect(() => { if (phase !== 'run') return; const x = setInterval(() => { const s = Math.max(0, Math.round((ends.current - Date.now()) / 1000)); setLeft(s); if (s <= 0) { clearInterval(x); submit(true); } }, 500); return () => clearInterval(x); }, [phase]);
  useEffect(() => { if (phase !== 'run') return; const f = e => { e.preventDefault(); e.returnValue = ''; }; addEventListener('beforeunload', f); return () => removeEventListener('beforeunload', f); }, [phase]);
  const back = <p><a className="btn sm" href="#/account">Back to My application</a></p>;
  if (err && phase === 'intro' && !info) return <section className="sec"><h1>Aptitude test</h1><div className="card"><p className="err">{err}</p>{back}</div></section>;
  if (phase === 'intro' && !info) return <section className="sec"><p>Loading…</p></section>;
  if (phase === 'intro' && info?.status === 'Started' && !t && starting) return <section className="sec"><p>Resuming your test…</p></section>;
  if (phase === 'done') return <section className="sec"><div className="card done"><div className="bigtick">✔</div><h1>Test submitted successfully</h1>
    <p>Thank you for completing the aptitude test. Your answers have been sent to the {site.company} team.</p>{autoMsg && <p className="err"><b>{autoMsg}</b></p>}
    <p><b>We will review your answers and notify you</b> on this website (in your chat) and by email about the next step. Please do not submit the test again.</p>{back}</div></section>;
  if (phase === 'intro') return <section className="sec"><h1>{info.title}</h1><div className="card"><p><b>{info.count}</b> questions · <b>{info.duration_min}</b> minutes · one correct answer each</p>
    <p style={{ whiteSpace: 'pre-wrap' }}>{info.instructions || 'Answer all the questions. The test closes automatically when time is over.'}</p>
    <ul className="rules"><li>The timer starts when you press Start and keeps running even if you leave this page.</li><li>You can move between questions and change answers before submitting.</li><li>Your score is not shown after submission. The team will contact you.</li><li><b>Your camera will be switched on during the test.</b> Please allow camera access when your browser asks. Nothing is recorded or saved. It is only a live view.</li><li><b>The test runs in full screen. Do not cheat.</b> Do not leave full screen, switch tabs or open other windows. You get {MAX_WARN} warnings. After that, your test is submitted automatically.</li></ul>
    <div className="acts"><button className="btn" disabled={starting} onClick={begin}>{starting ? 'Opening camera…' : info.status === 'Started' ? 'Continue test' : 'Start test (camera on)'}</button><a className="btn ghost" href="#/account">Not now</a></div>{err && <p className="err">{err}</p>}</div></section>;
  const q = t.questions[i], n = t.questions.length, done = Object.keys(ans).length;
  return (<section className="sec"><div className="testtop"><h2 style={{ margin: 0 }}>{t.title}</h2><span className={`timer ${left < 60 ? 'low' : ''}`}>⏱ {mmss(left)}</span></div>
    <div className="pbar"><i style={{ width: `${(done / n) * 100}%` }} /></div><small className="mut">{done} of {n} answered</small>
    {popup && <div className="proctor"><div className="card"><h2>⚠ Warning {popup.n} of {MAX_WARN}</h2><p><b>{popup.why}</b></p><p>Do not cheat. Leaving full screen or switching tabs is not allowed during the test. {popup.n >= MAX_WARN ? 'This was your last warning. If it happens again, your test will be submitted automatically.' : 'If it happens again, you will get another warning. After that, your test will be submitted automatically.'}</p>
      <button className="btn" onClick={() => enterFs().then(() => { lastV.current = Date.now(); showPop(null); })}>I understand, return to test</button></div></div>}
    {!popup && canFs && !fs && <div className="proctor"><div className="card"><h2>Full screen required</h2><p>This test must be taken in full screen.</p><button className="btn" onClick={enterFs}>Enter full screen</button></div></div>}
    <div className="camlive">{camOn ? <><video ref={showCam} autoPlay muted playsInline /><span><em className="pulse-dot" />Camera on</span></> : <span>Camera off</span>}</div>
    {!camOn ? <div className="card qcard"><h3>Camera is off</h3><p>Please turn your camera on to continue the test. The timer is still running.</p>
      <div className="acts"><button className="btn sm" onClick={() => startCam().then(() => setErr('')).catch(e => setErr(e.message))}>Turn camera on</button></div>{err && <p className="err">{err}</p>}</div> :
    <div className="card qcard"><small className="mut">Question {i + 1} of {n}</small><h3>{q.question}</h3>
      {q.options.map((o, k) => <label key={k} className={`opt ${ans[q.id] === k ? 'on' : ''}`}><input type="radio" name={'q' + q.id} checked={ans[q.id] === k} onChange={() => setAns(a => ({ ...a, [q.id]: k }))} /><b>{'ABCD'[k]}</b><span>{o}</span></label>)}
      <div className="acts"><button className="btn sm ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← Previous</button>
        {i < n - 1 ? <button className="btn sm" onClick={() => setI(i + 1)}>Next →</button> : <button className="btn sm" disabled={busy} onClick={() => { if (done < n && !confirm(`You answered ${done} of ${n} questions. Submit anyway?`)) { lastV.current = Date.now(); return; } lastV.current = Date.now(); submit(); }}>{busy ? 'Submitting…' : 'Submit test'}</button>}</div>
      {err && <p className="err">{err}</p>}</div>}
    <div className="qnav">{t.questions.map((x, k) => <button key={x.id} className={`${k === i ? 'cur' : ''} ${ans[x.id] !== undefined ? 'ans' : ''}`} onClick={() => setI(k)}>{k + 1}</button>)}</div></section>);
}