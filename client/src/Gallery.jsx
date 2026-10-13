import { useEffect, useState } from 'react'; import { Reveal } from './ui.jsx'; import { useList, useSite } from './api.jsx';
export const useGallery = () => useList('/gallery');
export const Fig = ({ i, onClick }) => <figure className="pic" onClick={onClick}><img src={i.image} alt={i.title} loading="lazy" /><figcaption><b>{i.title}</b>{i.location && <small>{i.location}</small>}</figcaption></figure>;
export default function Gallery() { const site = useSite();
  const items = useGallery(); const [tab, setTab] = useState('All'), [open, setOpen] = useState(null);
  useEffect(() => { const k = e => e.key === 'Escape' && setOpen(null); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  const cats = ['All', ...new Set((items || []).map(i => i.category))];
  return (<>
    <section className="sec head"><h1>Life at {site.company}</h1><p>Our offices, teams and events, from New Delhi and beyond.</p>
      {cats.length > 2 && <div className="tabs">{cats.map(t => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>}</section>
    <section className="sec">{!items && <p>Loading…</p>}{items && !items.length && <div className="empty">Photos are coming soon.</div>}
      <div className="gal">{items?.filter(i => tab === 'All' || i.category === tab).map(i => <Reveal key={i.id}><Fig i={i} onClick={() => setOpen(i)} /></Reveal>)}</div></section>
    {open && <div className="lb" onClick={() => setOpen(null)}><div onClick={e => e.stopPropagation()}><figure className="pic big"><img src={open.image} alt={open.title} /><figcaption><b>{open.title}</b><small>{[open.category, open.location].filter(Boolean).join(' · ')}</small></figcaption></figure><button className="btn sm" onClick={() => setOpen(null)}>Close</button></div></div>}
  </>);
}
