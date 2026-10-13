import { useState } from 'react'; import { api, setToken, PhoneInput } from './api.jsx'; import { Logo } from './ui.jsx';
export default function Login({ next, setUser }) {
  const [mode, setMode] = useState('login'); const [v, setV] = useState({ cc: '+91', num: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const up = o => setV(x => ({ ...x, ...o })), reg = mode === 'register';
  const go = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const d = await api(reg ? '/student/register' : '/student/login', { method: 'POST', body: reg ? { name: v.name, email: v.email, phone: v.cc + ' ' + v.num, password: v.password } : { email: v.email, password: v.password } });
      setToken(d.token); setUser(d.student); location.hash = next ? '#/apply/' + next : '#/account';
    } catch (x) { setErr(x.message); } setBusy(false);
  };
  return (<section className="authpage"><form className="authcard" onSubmit={go}>
    <Logo s={40} /><h1>{reg ? 'Sign up' : 'Log in'}</h1>
    {reg && <label>Full name<input required autoComplete="name" value={v.name || ''} onChange={e => up({ name: e.target.value })} /></label>}
    <label>Email<input type="email" required autoComplete="email" value={v.email || ''} onChange={e => up({ email: e.target.value })} /></label>
    {reg && <label>Phone<PhoneInput cc={v.cc} num={v.num} set={up} /></label>}
    <label>Password<input type="password" required minLength={reg ? 6 : 1} autoComplete={reg ? 'new-password' : 'current-password'} value={v.password || ''} onChange={e => up({ password: e.target.value })} /></label>
    {err && <p className="err">{err}</p>}
    <button className="btn" disabled={busy}>{busy ? 'Please wait…' : reg ? 'Create account' : 'Log in'}</button>
    <p className="swap">{reg ? 'Already have an account?' : "Don't have an account?"} <button type="button" className="link" onClick={() => { setMode(reg ? 'login' : 'register'); setErr(''); }}>{reg ? 'Log in' : 'Sign up'}</button></p>
  </form></section>);
}
