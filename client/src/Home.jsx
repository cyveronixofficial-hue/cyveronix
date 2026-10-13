import { Reveal, Count, Partners, Logo, Rotator, Trophy } from './ui.jsx'; import { useEffect, useState } from 'react'; import { useSite, useList, fill } from './api.jsx'; import { Fig } from './Gallery.jsx';
const services = [['Application Security', 'Penetration testing, code review and secure-by-design engineering for Indian enterprises and startups.'], ['Cloud & DevOps', 'Hardened pipelines on AWS, Azure, GCP and Indian data-centre regions.'], ['AI Threat Detection', 'Models that spot anomalies before they become incidents.'], ['Custom Software', 'Web and mobile products built by engineers who think like attackers.'], ['Managed Security 24/7', 'Our Delhi security operations centre watches your systems around the clock.'], ['Compliance', 'ISO 27001, CERT-In directions, DPDP Act, RBI and PCI-DSS readiness without the paperwork pain.']];
const products = [['CyberShield', 'Endpoint protection that stops ransomware in seconds.', '#3B2FE0'], ['VeroScan', 'Automated vulnerability scanner for web apps and APIs.', '#FF6B4A'], ['Sentinel AI', 'Anomaly detection across network and user activity.', '#0FA3B1'], ['VaultKey', 'Enterprise password and secrets manager.', '#7A5AF8'], ['PulseOps', 'Uptime and incident dashboard for DevOps teams.', '#D99A00'], ['SafeLearn', 'Security awareness training for employees.', '#1B8F5A']];
const work = [['Northwind Labs', 'Zero-trust rebuild of the customer portal', '70%', 'fewer security incidents'], ['Quantix', 'Real-time UPI fraud detection engine', '₹40 Cr', 'in risky transactions flagged'], ['Helio Cloud', 'Multi-region cloud migration', '99.99%', 'uptime after migration'], ['Bytewave', 'Mobile banking app', '1 Cr+', 'downloads'], ['Orbitron', 'Compliance automation platform', '8 weeks', 'to ISO 27001'], ['Stackforge', 'Internal developer platform', '5x', 'faster deployments']];
const time = [['2015', 'Founded in New Delhi by two engineers with a shared laptop and one client.'], ['2017', 'Opened our 24/7 security operations centre in Okhla. 40 clients.'], ['2019', 'Raised ₹90 crore Series A to build our AI threat-detection platform.'], ['2021', 'Launched the Student Internship Program. Opened Bengaluru office.'], ['2023', 'Reached 120 employees. Opened Gurugram and Pune offices.'], ['2025', 'Trained our 400th intern. Protecting 300+ organisations across India.']];
const awards = [['2024', 'Best Managed Security Provider', 'India Cyber Excellence Awards'], ['2023', 'Fastest-Growing Tech Company in NCR', 'NCR Tech Growth 100'], ['2022', 'Top 50 Best Places to Work', 'Delhi Business Review'], ['2021', 'Innovation of the Year: AI Detection', 'SecureStack Innovation Awards'], ['2019', 'Rising Star in Cybersecurity', 'Bharat Security Summit']];
const domains = ['Web Development', 'Cybersecurity', 'AI / Machine Learning', 'Data Science', 'Cloud & DevOps', 'UI/UX Design', 'Mobile Apps'];
const quotes = [['{company} found three critical holes our previous vendor missed. Our audit passed the first time.', 'Sarah Collins, CISO, Northwind Labs'], ['I shipped a real feature in my second week as an intern. My mentor reviewed every pull request.', 'Aarav Mehta, 2025 intern, now full-time engineer']];
// ---- Live security overview: live-style panel that changes every 2 seconds ----
const rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[rnd(0, a.length - 1)];
const EVENTS = [['s-ok', () => 'Brute-force attempt blocked'], ['s-ok', () => `Phishing link blocked (${rnd(1, 9)} users)`], ['s-ok', () => `Patch deployed to ${rnd(4, 40)} servers`], ['s-ok', () => 'Suspicious login stopped (new country)'], ['s-ok', () => `Malware quarantined on ${rnd(1, 5)} endpoints`], ['s-warn', () => 'Outdated TLS config found'], ['s-warn', () => `Unusual traffic spike from ${rnd(11, 223)}.${rnd(1, 254)}.x.x`], ['s-warn', () => 'Open S3 bucket detected, fix suggested'], ['s-ok', () => 'SQL injection attempt blocked'], ['s-ok', () => 'DDoS burst absorbed by firewall']];
const mkEvent = id => { const [c, t] = pick(EVENTS); return { id, c, t: t(), age: 0 }; };
const ago = s => s < 2 ? 'just now' : s < 60 ? s + 's ago' : Math.floor(s / 60) + 'm ago';
function useLive() {
  const [d, setD] = useState(() => ({ bars: Array.from({ length: 12 }, () => rnd(35, 95)), blocked: rnd(18000, 24000), uptime: 99.99, latency: rnd(18, 34), fixed: rnd(2, 6), open: 0, n: 3, feed: [mkEvent(1), mkEvent(2), mkEvent(3)].map((e, i) => ({ ...e, age: i * 14 + 2 })) }));
  useEffect(() => {
    const t = setInterval(() => setD(p => {
      const e = mkEvent(p.n + 1), blocked = p.blocked + rnd(3, 40), up = Math.random() < .12 ? +(99.94 + Math.random() * .05).toFixed(2) : Math.random() < .5 ? 99.99 : p.uptime;
      return { bars: [...p.bars.slice(1), rnd(30, 100)], blocked, uptime: Math.min(99.99, up), latency: Math.max(12, Math.min(60, p.latency + rnd(-5, 5))), fixed: p.fixed + (Math.random() < .25 ? 1 : 0), open: Math.random() < .08 ? rnd(0, 1) : p.open && Math.random() < .5 ? 0 : p.open, n: p.n + 1,
        feed: [e, ...p.feed.map(x => ({ ...x, age: x.age + 2 }))].slice(0, 3) };
    }), 2000);
    return () => clearInterval(t);
  }, []);
  return d;
}
function LiveDash({ site }) {
  const d = useLive();
  return (<div className="hv" aria-hidden="true"><div className="hv-main"><div className="hv-top"><span><Logo s={22} /> Security overview</span><i className="live"><em className="pulse-dot" />Live</i></div>
    <div className="hv-num"><b>{d.blocked.toLocaleString('en-IN')}</b><span>threats blocked today</span></div>
    <div className="hv-mini"><div><b>{d.uptime.toFixed(2)}%</b><small>uptime</small></div><div><b>{d.latency} ms</b><small>response time</small></div></div>
    <div className="hv-bars">{d.bars.map((h, i) => <i key={i} style={{ height: h + '%' }} />)}</div>
    <ul className="hv-feed">{d.feed.map(f => <li key={f.id}><i className={f.c} /><span>{f.t}</span><small>{ago(f.age)}</small></li>)}</ul></div>
    <div className="hv-chip c1"><b>{d.open}</b> critical issues open</div><div className="hv-chip c2"><b>+{d.fixed}</b> vulnerabilities fixed today</div></div>);
}
const Head = ({ k, t, s }) => <Reveal><div className="h-head"><span className="eyebrow">{k}</span><h2>{t}</h2>{s && <p>{s}</p>}</div></Reveal>;
export default function Home() {
  const site = useSite(), gal = useList('/gallery'), leaders = useList('/leaders');
  return (<>
    <section className="h-hero"><div className="h-copy">
      <h1>We build software that <em>stays standing</em> when someone pushes on it.</h1>
      <p>{site.company} is a New Delhi cybersecurity and software company. We ship products, protect 300+ organisations and train the next generation of engineers.</p>
      <div className="h-cta"><a className="btn" href="#/careers">Join our internship program</a><a className="btn ghost" href="#contact" onClick={e => { e.preventDefault(); document.getElementById('contact').scrollIntoView({ behavior: 'smooth' }); }}>Talk to our team</a></div>
      <ul className="h-proof"><li><b>300+</b>organisations protected</li><li><b>24/7</b>Delhi security operations</li><li><b>ISO 27001</b>ready delivery</li></ul></div>
      <LiveDash site={site} /></section>
    <section className="sec tight"><p className="center mut">Trusted by teams at</p><Partners marquee /></section>
    <section className="stats">{[[300, '+', 'Clients protected'], [10, '+', 'Years in business'], [120, '', 'Team members'], [400, '+', 'Interns trained']].map(([n, s, l]) => <div key={l}><b><Count to={n} suffix={s} /></b><span>{l}</span></div>)}</section>
    <section className="sec"><Head k="What we do" t="Security and software, under one roof" s="From the first line of code to a 24/7 watch on production." />
      <div className="svc-grid">{services.map(([t, d], i) => <Reveal key={t} d={i * 60} className="svc2"><span className="num">0{i + 1}</span><h3>{t}</h3><p>{d}</p></Reveal>)}</div></section>
    <section className="sec alt"><div className="split2"><Reveal><span className="eyebrow">About {site.company}</span><h2>Built in Delhi. Trusted across India.</h2></Reveal>
      <Reveal d={100}><p>{fill(site.about, site) || `${site.company} is headquartered in New Delhi and was founded in 2015.`}</p><ul className="ticks"><li>About 120 engineers, analysts and designers across New Delhi, Noida, Gurugram, Bengaluru and Pune</li><li>Our own security products plus projects for fintech, healthcare and education</li><li>A student internship program built around real products</li></ul><a className="btn ghost sm" href="#/about">More about us</a></Reveal></div></section>
    <section className="sec"><Head k="Products" t="Products we build" />
      <div className="grid3">{products.map(([n, d, c], i) => <Reveal key={n} d={i * 60} className="card lift prod"><span className="tile" style={{ background: c }}>{n[0]}</span><div><h3>{n}</h3><p>{d}</p></div></Reveal>)}</div></section>
    <section className="sec"><Head k="Results" t="Projects we deliver for companies" />
      <div className="grid3">{work.map(([c, p, n, r], i) => <Reveal key={c} d={i * 60} className="card lift case"><small className="mut">{c}</small><h3>{p}</h3><div className="big"><b>{n}</b><span>{r}</span></div></Reveal>)}</div></section>
    {gal?.length > 0 && <section className="sec"><Head k="Gallery" t={`Life at ${site.company}`} s="Our offices, teams and events." />
      <div className="mosaic">{gal.slice(0, 5).map(i => <Fig key={i.id} i={i} />)}</div>{gal.length > 5 && <p><a className="btn ghost" href="#/gallery">See all {gal.length} photos</a></p>}</section>}
    <section className="sec"><Head k="Our journey" t="Our story" />
      <div className="timeline">{time.map(([y, t], i) => <Reveal key={y} d={i * 50} className="tl"><b>{y}</b><p>{t}</p></Reveal>)}</div></section>
    <section className="sec"><Head k="Recognition" t="Awards and recognition" />
      <div className="awg">{awards.map(([y, t, o], i) => <Reveal key={t} d={i * 90} className="aw"><span className="yr">{y}</span><Trophy /><b>{t}</b><small>{o}</small></Reveal>)}</div></section>
    {leaders?.length > 0 && <section className="sec"><Head k="Leadership" t={`The people steering ${site.company}`} />
      <div className="lead-grid">{leaders.map((l, i) => <Reveal key={l.id} d={i * 70} className="lead">{l.image ? <img src={l.image} alt={l.name} loading="lazy" /> : <div className="avatar big">{l.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</div>}<h3>{l.name}</h3><span className="role">{l.role}</span>{l.bio && <p>{l.bio}</p>}</Reveal>)}</div></section>}
    <section className="sec"><Head k="Partners" t="Our partners and sponsors" /><Partners /></section>
    <section className="sec"><Head k="Testimonials" t="What people say" /><div className="grid2">{quotes.map(([q, a]) => <Reveal key={q}><blockquote>“{fill(q, site)}”<cite>{a}</cite></blockquote></Reveal>)}</div></section>
    <section className="cta2"><span className="orb o1" /><span className="orb o2" /><span className="orb o3" />
      <Reveal><Logo s={64} /><span className="badge dk">Applications are open</span><h2>Come build <Rotator words={['secure', 'smart', 'scalable', 'real']} /> software with us.</h2><p>Join live projects from our Delhi office, learn from senior engineers and take the aptitude test and interview that fit your schedule.</p>
        <a className="btn light pulse" href="#/careers">Join our internship program</a></Reveal>
      <div className="marquee"><div className="track">{[...domains, ...domains].map((d, i) => <span className="pill" key={i}>{d}</span>)}</div></div></section>
  </>);
}
