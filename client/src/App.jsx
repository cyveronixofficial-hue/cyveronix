import { useEffect, useState } from 'react'; import { Logo } from './ui.jsx'; import { api, getToken, setToken, useSite } from './api.jsx';
import Home from './Home.jsx'; import About from './About.jsx'; import Gallery from './Gallery.jsx'; import Careers from './Careers.jsx'; import Apply from './Apply.jsx'; import Admin from './Admin.jsx'; import Login from './Login.jsx'; import Account from './Account.jsx'; import Project from './Project.jsx'; import ChatWidget from './ChatWidget.jsx'; import Aptitude from './Aptitude.jsx';
const toContact = e => { e.preventDefault(); document.getElementById('contact').scrollIntoView({ behavior: 'smooth' }); };
function Go({ to }) { useEffect(() => { location.hash = to; }, []); return null; }
export default function App() {
  const site = useSite(); const [h, setH] = useState(location.hash || '#/'); const [sc, setSc] = useState(false); const [user, setUser] = useState(null); const [ready, setReady] = useState(!getToken());
  useEffect(() => { const f = () => { setH(location.hash || '#/'); scrollTo(0, 0); }, g = () => setSc(scrollY > 20); addEventListener('hashchange', f); addEventListener('scroll', g); return () => { removeEventListener('hashchange', f); removeEventListener('scroll', g); }; }, []);
  useEffect(() => { if (getToken()) api('/student/me').then(setUser).catch(() => setToken(null)).finally(() => setReady(true)); }, []);
  const logout = () => { setToken(null); setUser(null); location.hash = '#/'; };
  useEffect(() => { document.title = site.company + ' – Cybersecurity & software company, New Delhi'; }, [site.company]);
  const [, page, id] = h.split('/');
  if (page === '8082276539') return <Admin />; // secret admin address: full-screen, no public header/footer
  // Test screen only: no header, footer or chat while the aptitude test is open
  if (page === 'aptitude') return !ready ? <section className="sec"><p>Loading…</p></section> : user ? <Aptitude id={id} /> : <Go to="#/login" />;
  // Secret admin address: open  yoursite/#/8082276539  (no link anywhere on the site)
  const gate = el => !ready ? <section className="sec"><p>Loading…</p></section> : el;
  const view = { about: <About />, gallery: <Gallery />, careers: <Careers />, 8082276539: <Admin />,
    login: <Login next={id} setUser={setUser} />,
    apply: gate(user ? <Apply id={id} user={user} /> : <Go to={'#/login/' + id} />),
    project: gate(user ? <Project id={id} /> : <Go to="#/login" />),
    account: gate(user ? <Account user={user} id={id} banner={id === 'new'} /> : <Go to="#/login" />) }[page] || <Home />;
  return (<>
    <header className={`nav ${sc ? 'sc' : ''}`}><a href="#/" className="brand"><Logo />{site.company}</a>
      <nav><a href="#/">Company</a><a href="#/about">About</a><a href="#/gallery">Gallery</a><a href="#/careers">Careers</a>
        {user ? <><a href="#/account">My application</a><button className="link" onClick={logout}>Log out</button></> : <a href="#/login">Login</a>}
        <a className="btn sm" href="#contact" onClick={toContact}>Contact us</a></nav></header>
    <main key={h}>{view}</main>
    {user && <ChatWidget key={user.id} />}
    <footer id="contact" className="foot"><div><div className="brand"><Logo s={28} />{site.company}</div><p>{site.tagline}</p></div>
      <div><h4>Head office</h4><p>{site.company}<br />{site.address}</p></div>
      <div><h4>Contact</h4><p><a href={'mailto:' + site.email}>{site.email}</a><br /><a href={'mailto:' + site.careers_email}>{site.careers_email}</a><br /><a href={'tel:' + site.phone.replace(/[^+\d]/g, '')}>{site.phone}</a><br /><small>{site.hours}</small></p></div>
      <div><h4>Offices</h4><p>New Delhi (HQ) · Noida<br />Gurugram · Bengaluru · Pune</p></div>
      <p className="copy">© 2026 {site.company} All rights reserved.</p></footer>
  </>);
}