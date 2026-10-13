import { useEffect, useState } from 'react';
const K = 'cvx_token';
export const getToken = () => { try { return localStorage.getItem(K); } catch { return null; } };
export const setToken = t => { try { t ? localStorage.setItem(K, t) : localStorage.removeItem(K); } catch { } };
export const api = (path, o = {}) => fetch('/api' + path, { method: o.method, headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) }, body: o.body && JSON.stringify(o.body) })
  .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Something went wrong'); return d; });
export const CC = [['+91', 'India'], ['+977', 'Nepal'], ['+94', 'Sri Lanka'], ['+880', 'Bangladesh'], ['+971', 'UAE'], ['+1', 'USA / Canada'], ['+44', 'UK']];
export const PhoneInput = ({ cc, num, set }) => <div className="phone"><select aria-label="Country code" value={cc} onChange={e => set({ cc: e.target.value })}>{CC.map(([c, n]) => <option key={c} value={c}>{c} {n}</option>)}</select>
  <input type="tel" inputMode="numeric" placeholder="10-digit mobile number" maxLength={cc === '+91' ? 10 : 14} pattern={cc === '+91' ? '[6-9][0-9]{9}' : '[0-9]{6,14}'} title={cc === '+91' ? '10-digit Indian mobile number starting with 6-9' : '6 to 14 digits'} required value={num} onChange={e => set({ num: e.target.value.replace(/\D/g, '') })} /></div>;

export const SITE0 = { company: 'Cyveronix', tagline: 'Security-first software, built in India since 2015.', address: 'Plot 42, Okhla Industrial Estate, Phase III, New Delhi, Delhi 110020, India', phone: '+91 98765 43210', email: 'hello@cyveronix.in', careers_email: 'careers@cyveronix.in', hours: 'Mon–Sat, 10:00 AM – 6:30 PM IST', about: '' };
let siteCache = null; const subs = new Set();
export const refreshSite = () => fetch('/api/site').then(r => r.json()).then(d => { siteCache = d; subs.forEach(f => f(d)); }).catch(() => { });
export const useSite = () => { const [s, set] = useState(siteCache || SITE0); useEffect(() => { subs.add(set); if (!siteCache) refreshSite(); return () => subs.delete(set); }, []); return s; };
// Company name placeholder: any text containing {company} shows the name set in the admin panel
export const fill = (t, site) => String(t || '').replace(/\{company\}/g, site.company);
export const rupee = n => '₹' + Number(n || 0).toLocaleString('en-IN');
export const durText = i => i.min_months === i.max_months ? `${i.min_months} month${i.min_months > 1 ? 's' : ''}` : `${i.min_months}-${i.max_months} months`;
export const IST = d => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

// Resize a chosen photo in the browser (max 1600px, JPEG) so uploads stay small and fast.
export const readImage = (file, max = 1600) => new Promise((ok, no) => {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return no(new Error('Choose a JPG, PNG or WebP image'));
  const url = URL.createObjectURL(file), im = new Image();
  im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .85)); };
  im.onerror = () => no(new Error('Could not read that image')); im.src = url;
});
export const useList = path => { const [l, setL] = useState(null); useEffect(() => { fetch('/api' + path).then(r => r.ok ? r.json() : []).then(setL).catch(() => setL([])); }, []); return l; };
