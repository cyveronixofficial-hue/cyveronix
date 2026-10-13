import { useEffect, useRef, useState } from 'react';
function useSeen(t = .15) { const r = useRef(), [v, setV] = useState(false);
  useEffect(() => { const o = new IntersectionObserver(([e]) => e.isIntersecting && (setV(true), o.disconnect()), { threshold: t }); o.observe(r.current); return () => o.disconnect(); }, []); return [r, v]; }
export function Reveal({ children, className = '', d = 0 }) { const [r, v] = useSeen(); return <div ref={r} className={`rv ${v ? 'in' : ''} ${className}`} style={{ transitionDelay: d + 'ms' }}>{children}</div>; }
export function Count({ to, suffix = '' }) { const [r, v] = useSeen(), [n, setN] = useState(0);
  useEffect(() => { if (!v) return; let s; const f = t => { s ??= t; const p = Math.min((t - s) / 1500, 1); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); p < 1 && requestAnimationFrame(f); }; requestAnimationFrame(f); }, [v]);
  return <span ref={r}>{n}{suffix}</span>; }
const L = [
  ['Northwind Labs', '#3B2FE0', <path d="M16 2 28 30 16 23 4 30z" />, <span className="wm"><b>Northwind</b><i>LABS</i></span>],
  ['Quantix', '#FF6B4A', <g><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="5" /><path d="M19 19l9 9" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></g>, <span className="wm q">quantix</span>],
  ['Helio Cloud', '#0FA3B1', <g><circle cx="17" cy="11" r="7" /><path d="M6 27a6 6 0 0 1 3-11 8 8 0 0 1 15 1 5 5 0 0 1 1 10z" opacity=".85" /></g>, <span className="wm h"><em>helio</em><b>cloud</b></span>],
  ['Bytewave', '#7A5AF8', <g><rect x="3" y="14" width="5" height="14" rx="2" /><rect x="10" y="5" width="5" height="23" rx="2" /><rect x="17" y="10" width="5" height="18" rx="2" /><rect x="24" y="16" width="5" height="12" rx="2" /></g>, <span className="wm up">BYTEWAVE</span>],
  ['Orbitron', '#D99A00', <g><circle cx="16" cy="16" r="5" /><ellipse cx="16" cy="16" rx="14" ry="6" fill="none" stroke="currentColor" strokeWidth="2.5" transform="rotate(-30 16 16)" /></g>, <span className="wm serif">Orbitron</span>],
  ['Stackforge', '#1B8F5A', <g><path d="M16 3 29 10 16 17 3 10z" /><path d="M3 15l13 7 13-7M3 21l13 7 13-7" fill="none" stroke="currentColor" strokeWidth="3" /></g>, <span className="wm mono">STACKFORGE</span>]];
const Chip = ([n, c, s, w]) => <div className="chip" key={n} style={{ color: c }} title={n}><svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">{s}</svg>{w}</div>;
export const Partners = ({ marquee }) => marquee ? <div className="marquee"><div className="track">{[...L, ...L].map((p, i) => <div key={i}>{Chip(p)}</div>)}</div></div> : <div className="chips">{L.map(Chip)}</div>;
export function Rotator({ words }) { const [i, setI] = useState(0); useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % words.length), 2200); return () => clearInterval(t); }, []); return <span key={i} className="rot">{words[i]}</span>; }
export const Trophy = () => <svg className="trophy" viewBox="0 0 64 64" width="68" height="68"><defs><linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFD86B" /><stop offset="1" stopColor="#FF8A4C" /></linearGradient></defs><path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="url(#gd)" /><path d="M18 12H8c0 10 4 15 11 16M46 12h10c0 10-4 15-11 16" fill="none" stroke="url(#gd)" strokeWidth="4" /><rect x="29" y="34" width="6" height="12" fill="url(#gd)" /><rect x="20" y="46" width="24" height="8" rx="3" fill="url(#gd)" /><path d="M32 14l2.5 5 5.5.8-4 3.9.9 5.4-4.9-2.6-4.9 2.6.9-5.4-4-3.9 5.5-.8z" fill="#fff" /></svg>;
export const Logo = ({ s = 34 }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden><path d="M24 3 43 14v20L24 45 5 34V14z" fill="#3B2FE0" /><path d="M14 17l10 18 10-18h-6l-4 8-4-8z" fill="#fff" /><circle cx="24" cy="12" r="3" fill="#FF6B4A" /></svg>);
