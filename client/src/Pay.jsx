import { useState } from 'react'; import { api, useSite } from './api.jsx';
// Builds a UPI payment link. On Android it opens Google Pay directly; on iPhone it opens GPay; elsewhere any UPI app.
const upiQuery = a => new URLSearchParams({ pa: a.fee_upi_id, pn: a.fee_payee || 'Company', am: String(+a.fee_amount), cu: 'INR', tn: 'Registration fee #' + a.id }).toString();
const payLink = a => { const q = upiQuery(a), ua = navigator.userAgent;
  if (/android/i.test(ua)) return `intent://pay?${q}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;S.browser_fallback_url=${encodeURIComponent('upi://pay?' + q)};end`;
  if (/iphone|ipad/i.test(ua)) return 'gpay://upi/pay?' + q;
  return 'upi://pay?' + q; };
export default function Pay({ a, reload }) { const site = useSite();
  const [utr, setUtr] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [copied, setCopied] = useState(false);
  const ps = a.payment_status || 'None'; if (ps === 'None') return null;
  const send = async e => { e.preventDefault(); setBusy(true); setErr(''); try { await api('/student/applications/' + a.id + '/utr', { method: 'POST', body: { utr } }); reload(); } catch (x) { setErr(x.message); } setBusy(false); };
  const copy = () => { try { navigator.clipboard.writeText(a.fee_upi_id); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { } };
  if (ps === 'Paid') return <div className="msg"><b>✅ Registration fee paid (₹{+a.fee_amount})</b><p className="mut" style={{ margin: 0 }}>UTR {a.utr}. Payment confirmed by {site.company}.</p></div>;
  if (ps === 'UTR submitted') return <div className="msg"><b>⏳ Payment under verification</b><p className="mut" style={{ margin: 0 }}>You entered UTR {a.utr}. We will confirm it shortly.</p></div>;
  return (<div className="msg"><b>💳 Registration fee: ₹{+a.fee_amount}</b>
    {a.payment_note && <p className="err" style={{ margin: '4px 0' }}>{a.payment_note}</p>}
    <p className="mut" style={{ margin: '4px 0' }}>1. Tap Pay and complete the payment in Google Pay (on a computer, pay ₹{+a.fee_amount} to the UPI ID below from your phone).<br />2. Copy the 12-digit UTR / UPI reference number from the payment and enter it here.</p>
    <div className="acts"><a className="btn sm" href={payLink(a)}>Pay ₹{+a.fee_amount} with Google Pay</a>
      <button type="button" className="btn sm ghost" onClick={copy}>{copied ? 'Copied ✔' : 'UPI ID: ' + a.fee_upi_id + ' (copy)'}</button></div>
    <form className="row" style={{ marginTop: 10 }} onSubmit={send}><input required inputMode="numeric" maxLength="14" placeholder="Enter 12-digit UTR number" value={utr} onChange={e => setUtr(e.target.value.replace(/\D/g, ''))} />
      <button className="btn sm" disabled={busy || utr.length !== 12}>Submit UTR</button></form>
    {err && <p className="err" style={{ margin: '4px 0' }}>{err}</p>}</div>);
}
