import express from 'express'; import cors from 'cors'; import pg from 'pg'; import crypto from 'crypto'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import 'dotenv/config';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pg.types.setTypeParser(1082, v => v); // DATE columns stay plain 'YYYY-MM-DD' text
const app = express(); app.use(cors()); app.use(express.json({ limit: '8mb' }));
// Uploaded photos (gallery + leadership) are saved here and served at /uploads/...
const UP = path.join(path.dirname(fileURLToPath(import.meta.url)), 'uploads'); fs.mkdirSync(UP, { recursive: true });
app.use('/uploads', express.static(UP, { maxAge: '7d', index: false, setHeaders: r => r.setHeader('X-Content-Type-Options', 'nosniff') }));
const bad = m => Object.assign(new Error(m), { status: 400 });
const MAGIC = { 'image/jpeg': b => b[0] === 0xFF && b[1] === 0xD8, 'image/png': b => b[0] === 0x89 && b[1] === 0x50, 'image/webp': b => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' };
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const saveImage = d => { const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(d || ''); if (!m) throw bad('Choose a JPG, PNG or WebP image');
  const buf = Buffer.from(m[2], 'base64'); if (buf.length > 5 * 1024 * 1024) throw bad('Image must be under 5 MB'); if (!MAGIC[m[1]](buf)) throw bad('That file is not a valid image');
  const name = crypto.randomBytes(12).toString('hex') + '.' + EXT[m[1]]; fs.writeFileSync(path.join(UP, name), buf); return '/uploads/' + name; };
const rmImage = p => { if (/^\/uploads\/[a-f0-9]+\.(jpg|png|webp)$/.test(p || '')) fs.unlink(path.join(UP, path.basename(p)), () => { }); };
const txt = (v, n) => String(v ?? '').trim().slice(0, n);
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const hash = (p, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(p, salt, 32).toString('hex');
const same = (p, h) => { const [s, k] = h.split(':'); return crypto.timingSafeEqual(Buffer.from(k, 'hex'), crypto.scryptSync(p, s, 32)); };
const mac = b => crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
const sign = id => { const b = Buffer.from(JSON.stringify({ id, exp: Date.now() + 7 * 864e5 })).toString('base64url'); return b + '.' + mac(b); };
const verify = t => { try { const [b, s] = t.split('.'); if (s !== mac(b)) return null; const p = JSON.parse(Buffer.from(b, 'base64url')); return p.exp > Date.now() ? p.id : null; } catch { return null; } };
const admin = (q, s, n) => q.headers['x-admin-key'] === process.env.ADMIN_PASSWORD ? (q.isAdmin = true, n()) : s.status(401).json({ error: 'Wrong admin password' });
const authed = (q, s, n) => { const id = verify((q.headers.authorization || '').slice(7)); if (!id) return s.status(401).json({ error: 'Please log in' }); q.sid = id; n(); };
const wrap = f => (q, s) => f(q, s).catch(e => { console.error(e); s.status(e.status || 500).json(e.status ? { error: e.message } : { error: 'Server error', detail: q.isAdmin ? e.message : undefined }); });
const mine = (q, s, n) => pool.query('SELECT 1 FROM applications WHERE id=$1 AND student_id=$2', [q.params.id, q.sid])
  .then(r => r.rowCount ? n() : s.status(404).json({ error: 'Application not found' })).catch(() => s.status(500).json({ error: 'Server error' }));
const phoneOk = p => { if (!/^\+\d{1,4} \d{6,14}$/.test(p || '')) return false; return p.startsWith('+91 ') ? /^[6-9]\d{9}$/.test(p.slice(4)) : true; };

app.get('/api/internships', wrap(async (_, s) => s.json((await pool.query('SELECT * FROM internships WHERE open ORDER BY id')).rows)));

// ---- student accounts ----
app.post('/api/student/register', wrap(async (q, s) => {
  const { name, email, phone, password } = q.body;
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '')) return s.status(400).json({ error: 'Enter your name and a valid email' });
  if (!phoneOk(phone)) return s.status(400).json({ error: 'Enter a valid phone number with country code' });
  if ((password || '').length < 6) return s.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const r = await pool.query('INSERT INTO students(name,email,phone,password_hash) VALUES($1,lower($2),$3,$4) RETURNING id,name,email,phone', [name, email, phone, hash(password)]);
    s.json({ token: sign(r.rows[0].id), student: r.rows[0] });
  } catch (e) { if (e.code === '23505') return s.status(409).json({ error: 'An account with this email already exists. Please log in.' }); throw e; }
}));
app.post('/api/student/login', wrap(async (q, s) => {
  const r = await pool.query('SELECT * FROM students WHERE email=lower($1)', [q.body.email || '']);
  const u = r.rows[0];
  if (!u || !same(q.body.password || '', u.password_hash)) return s.status(401).json({ error: 'Wrong email or password' });
  s.json({ token: sign(u.id), student: { id: u.id, name: u.name, email: u.email, phone: u.phone } });
}));
app.get('/api/student/me', authed, wrap(async (q, s) => s.json((await pool.query('SELECT id,name,email,phone FROM students WHERE id=$1', [q.sid])).rows[0])));
app.get('/api/student/applications', authed, wrap(async (q, s) => s.json((await pool.query(
  `SELECT a.id,a.domain,a.months,a.stipend_monthly,a.internship_fee,a.status,a.admin_message,a.applied_at,a.interview_by,a.updated_at,a.project_title,a.project_details,a.start_date,a.end_date,a.duration_days,i.title,
  a.payment_status,a.fee_amount,(SELECT json_build_object('status',x.status,'title',t.title,'duration_min',t.duration_min,'sent_at',x.sent_at,'submitted_at',x.submitted_at) FROM aptitude_assignments x JOIN aptitude_tests t ON t.id=x.test_id WHERE x.application_id=a.id) AS aptitude,
  a.payment_status,a.fee_amount,a.fee_upi_id,a.fee_payee,a.utr,a.payment_note,a.interview_at,a.interview_duration_min,a.interview_mode,a.interview_link,a.interview_notes,
  (SELECT COUNT(*) FROM messages m WHERE m.application_id=a.id AND m.sender='admin' AND NOT m.seen)::int AS unread FROM applications a LEFT JOIN internships i ON i.id=a.internship_id WHERE a.student_id=$1 ORDER BY a.applied_at DESC`, [q.sid])).rows)));

// ---- apply (login required). The resume file is NOT uploaded or stored. ----
app.post('/api/applications', authed, wrap(async (q, s) => {
  const b = q.body;
  for (const k of ['internship_id', 'full_name', 'email', 'college', 'degree', 'branch', 'year', 'cgpa', 'skills', 'linkedin', 'why', 'months'])
    if (!String(b[k] ?? '').trim()) return s.status(400).json({ error: `Please fill in: ${k.replace('_', ' ')}` });
  if (!phoneOk(b.phone)) return s.status(400).json({ error: 'Enter a valid phone number with country code' });
  const i = await pool.query('SELECT domain,min_months,max_months,stipend_amount,fee_amount FROM internships WHERE id=$1', [b.internship_id]);
  if (!i.rows[0]) return s.status(400).json({ error: 'Internship not found' });
  const months = Math.floor(+b.months), { min_months: lo, max_months: hi } = i.rows[0];
  if (!(months >= lo && months <= hi)) return s.status(400).json({ error: `Choose between ${lo} and ${hi} months for this internship` });
  try {
    const r = await pool.query(`INSERT INTO applications(student_id,internship_id,domain,full_name,email,phone,college,degree,branch,year,cgpa,skills,github,linkedin,why,months,stipend_monthly,internship_fee,interview_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, now()+interval '48 hours') RETURNING id,interview_by`,
      [q.sid, b.internship_id, i.rows[0].domain, b.full_name, b.email, b.phone, b.college, b.degree, b.branch, b.year, String(b.cgpa).trim(), b.skills, b.github || null, b.linkedin, b.why, months, i.rows[0].stipend_amount || 0, i.rows[0].fee_amount || 0]);
    s.json(r.rows[0]);
  } catch (e) { if (e.code === '23505') return s.status(409).json({ error: 'You already applied for this internship. Check My application.' }); throw e; }
}));

// ---- admin ----
app.get('/api/admin/applications', admin, wrap(async (q, s) => {
  const d = q.query.domain;
  s.json((await pool.query(`SELECT a.*, (SELECT x.status FROM aptitude_assignments x WHERE x.application_id=a.id) AS apt_status, (SELECT x.score FROM aptitude_assignments x WHERE x.application_id=a.id) AS apt_score, (SELECT x.total FROM aptitude_assignments x WHERE x.application_id=a.id) AS apt_total, (SELECT COUNT(*) FROM messages m WHERE m.application_id=a.id AND m.sender='student' AND NOT m.seen)::int AS unread FROM applications a ${d ? 'WHERE a.domain=$1' : ''} ORDER BY a.applied_at DESC`, d ? [d] : [])).rows);
}));
app.get('/api/admin/stats', admin, wrap(async (_, s) =>
  s.json((await pool.query('SELECT domain, COUNT(*)::int AS count FROM applications GROUP BY domain ORDER BY count DESC')).rows)));
const STATUSES = ['New', 'Interview scheduled', 'Selected', 'Rejected'];
// Update any of: status, admin_message, project_title, project_details, start_date + duration_days (admin decides the time period)
app.patch('/api/admin/applications/:id', admin, wrap(async (q, s) => {
  const b = q.body, id = q.params.id, sets = [], v = [];
  const put = (col, val) => { v.push(val); sets.push(`${col}=$${v.length}`); };
  if ('status' in b) { if (!STATUSES.includes(b.status)) return s.status(400).json({ error: 'Invalid status' }); put('status', b.status); }
  if ('admin_message' in b) put('admin_message', b.admin_message || null);
  for (const k of ['project_title', 'project_details']) if (k in b) put(k, String(b[k] || '').trim().slice(0, 4000) || null);
  if (b.start_date || b.duration_days) {
    const days = Math.min(Math.floor(+b.duration_days), 730);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.start_date || '') || !(days > 0)) return s.status(400).json({ error: 'Enter a start date and duration in days' });
    put('start_date', b.start_date); put('duration_days', days);
    put('end_date', new Date(Date.parse(b.start_date) + (days - 1) * 864e5).toISOString().slice(0, 10));
  }
  const prev = (await pool.query('SELECT status,project_title,payment_status FROM applications WHERE id=$1', [id])).rows[0];
  if (!prev) return s.status(404).json({ error: 'Application not found' });
  if (b.status === 'Interview scheduled' && ['Requested', 'UTR submitted'].includes(prev.payment_status)) return s.status(400).json({ error: 'Registration fee is not marked as paid yet. Verify the payment first.' });
  if (b.status === 'Interview scheduled' && prev.status !== 'Interview scheduled') return s.status(400).json({ error: 'Use the Interview schedule form to set the date and time first.' });
  if (b.status === 'Selected' && prev.status !== 'Selected') {
    const ap = (await pool.query('SELECT status FROM aptitude_assignments WHERE application_id=$1', [id])).rows[0];
    if (ap && ap.status !== 'Submitted') return s.status(400).json({ error: 'The student has not submitted the aptitude test yet.' });
    if (!['Interview scheduled', 'Selected'].includes(prev.status)) return s.status(400).json({ error: 'Schedule and complete the interview before selecting this candidate.' });
  }
  if (!sets.length) return s.json({ ok: true });
  v.push(id); await pool.query(`UPDATE applications SET ${sets.join(',')}, updated_at=now() WHERE id=$${v.length}`, v);
  const say = t => pool.query("INSERT INTO messages(application_id,sender,body) VALUES($1,'admin',$2)", [id, t]);
  if (b.status === 'Selected' && prev.status !== 'Selected') await say('🎉 Congratulations! You have been selected. Your project and time period will appear on the "My project" page.');
  if (b.project_title && !prev.project_title) await say(`Your project has been assigned: ${b.project_title}. Open "My project" (My application page) to see the details and add your daily progress.`);
  s.json({ ok: true });
}));

// ---- registration fee (UPI) + interview schedule ----
const sayTo = (id, t) => pool.query("INSERT INTO messages(application_id,sender,body) VALUES($1,'admin',$2)", [id, t]);
const upiOk = u => /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(u || '');
// 1) admin asks the student to pay the registration fee (amount + UPI id)
app.post('/api/admin/applications/:id/fee', admin, wrap(async (q, s) => {
  const amount = Math.round(+q.body.amount * 100) / 100, upi = String(q.body.upi_id || '').trim(), payee = String(q.body.payee || (await getSite()).company).trim().slice(0, 60);
  if (!(amount > 0) || amount > 100000) return s.status(400).json({ error: 'Enter a valid fee amount' });
  if (!upiOk(upi)) return s.status(400).json({ error: 'Enter a valid UPI ID, e.g. name@okaxis' });
  const cur = (await pool.query('SELECT payment_status FROM applications WHERE id=$1', [q.params.id])).rows[0];
  if (!cur) return s.status(404).json({ error: 'Application not found' });
  if (cur.payment_status === 'Paid') return s.status(400).json({ error: 'Payment already marked as done' });
  await pool.query("UPDATE applications SET fee_amount=$1,fee_upi_id=$2,fee_payee=$3,payment_status='Requested',utr=NULL,utr_submitted_at=NULL,payment_note=NULL,updated_at=now() WHERE id=$4", [amount, upi, payee, q.params.id]);
  await sayTo(q.params.id, `💳 Please pay the registration fee of ₹${amount}. Open \"My application\" and tap Pay, then enter your UTR number after paying.`);
  s.json({ ok: true });
}));
// 3) admin checks the UTR against the bank/UPI app and approves or rejects it
app.post('/api/admin/applications/:id/payment', admin, wrap(async (q, s) => {
  const ok = q.body.action === 'approve', note = String(q.body.note || '').trim().slice(0, 300) || null;
  if (!ok && q.body.action !== 'reject') return s.status(400).json({ error: 'Invalid action' });
  const r = await pool.query(ok ? "UPDATE applications SET payment_status='Paid',paid_at=now(),payment_note=NULL,updated_at=now() WHERE id=$1 AND payment_status='UTR submitted' RETURNING id"
    : "UPDATE applications SET payment_status='Requested',utr=NULL,payment_note=$2,updated_at=now() WHERE id=$1 AND payment_status='UTR submitted' RETURNING id", ok ? [q.params.id] : [q.params.id, note || 'UTR did not match. Please check and enter it again.']);
  if (!r.rowCount) return s.status(400).json({ error: 'No submitted UTR to review' });
  await sayTo(q.params.id, ok ? '✅ Your registration fee payment is confirmed. We will share your interview schedule soon.' : `❌ We could not match your UTR. ${note || 'Please check it and enter it again.'}`);
  s.json({ ok: true });
}));
// 4) admin sets the interview schedule (date/time, duration, mode, link, notes)
app.post('/api/admin/applications/:id/interview', admin, wrap(async (q, s) => {
  const b = q.body, at = new Date(b.at), dur = Math.floor(+b.duration_min) || 30;
  if (isNaN(at)) return s.status(400).json({ error: 'Choose the interview date and time' });
  if (dur < 5 || dur > 480) return s.status(400).json({ error: 'Duration must be 5 to 480 minutes' });
  const cur = (await pool.query('SELECT payment_status FROM applications WHERE id=$1', [q.params.id])).rows[0];
  if (!cur) return s.status(404).json({ error: 'Application not found' });
  if (['Requested', 'UTR submitted'].includes(cur.payment_status)) return s.status(400).json({ error: 'Registration fee is not marked as paid yet' });
  if (at.getTime() < Date.now() - 6e4) return s.status(400).json({ error: 'Interview time must be in the future' });
  const apt = (await pool.query('SELECT status FROM aptitude_assignments WHERE application_id=$1', [q.params.id])).rows[0];
  if (apt && apt.status !== 'Submitted') return s.status(400).json({ error: 'Wait until the student submits the aptitude test' });
  const cs = (await pool.query('SELECT status FROM applications WHERE id=$1', [q.params.id])).rows[0].status;
  if (['Rejected', 'Selected'].includes(cs)) return s.status(400).json({ error: `Application is already ${cs}` });
  const mode = String(b.mode || 'Online').slice(0, 30), link = String(b.link || '').trim().slice(0, 500) || null, notes = String(b.notes || '').trim().slice(0, 1000) || null;
  await pool.query("UPDATE applications SET interview_at=$1,interview_duration_min=$2,interview_mode=$3,interview_link=$4,interview_notes=$5,status='Interview scheduled',updated_at=now() WHERE id=$6", [at, dur, mode, link, notes, q.params.id]);
  await sayTo(q.params.id, `📅 Interview scheduled: ${at.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST (${dur} min, ${mode}).${link ? ' Link: ' + link : ''}`);
  s.json({ ok: true });
}));
// 2) student submits the UTR after paying
app.post('/api/student/applications/:id/utr', authed, mine, wrap(async (q, s) => {
  const utr = String(q.body.utr || '').replace(/\s/g, '');
  if (!/^\d{12}$/.test(utr)) return s.status(400).json({ error: 'UTR / UPI reference must be exactly 12 digits' });
  try {
    const r = await pool.query("UPDATE applications SET utr=$1,utr_submitted_at=now(),payment_status='UTR submitted',payment_note=NULL,updated_at=now() WHERE id=$2 AND payment_status='Requested' RETURNING id", [utr, q.params.id]);
    if (!r.rowCount) return s.status(400).json({ error: 'No payment is pending for this application' });
  } catch (e) { if (e.code === '23505') return s.status(409).json({ error: 'This UTR was already used on another application' }); throw e; }
  s.json({ ok: true });
}));


// ---- delete an application (e.g. after rejecting). Chat messages and test results are removed with it. ----
app.delete('/api/admin/applications/:id', admin, wrap(async (q, s) => {
  const r = await pool.query('DELETE FROM applications WHERE id=$1 RETURNING id', [q.params.id]);
  r.rowCount ? s.json({ ok: true }) : s.status(404).json({ error: 'Application not found' });
}));

// ---- internships: admin can add, edit, close and delete ----
const cleanJob = b => {
  const j = { title: txt(b.title, 120), domain: txt(b.domain, 80), mode: txt(b.mode, 30), skills: txt(b.skills, 300), description: txt(b.description, 1500), open: b.open !== false };
  if (!j.title || !j.domain) throw bad('Title and domain are required');
  j.min_months = Math.floor(+b.min_months); j.max_months = Math.floor(+b.max_months);
  if (!(j.min_months >= 1 && j.max_months >= j.min_months && j.max_months <= 24)) throw bad('Months: minimum must be at least 1 and not more than the maximum (max 24)');
  j.stipend_amount = Math.floor(+b.stipend_amount || 0);
  if (j.stipend_amount < 0 || j.stipend_amount > 1000000) throw bad('Stipend must be between 0 and 10,00,000');
  j.fee_amount = Math.floor(+b.fee_amount || 0);
  if (j.fee_amount < 0 || j.fee_amount > 100000) throw bad('Fee must be between 0 and 1,00,000');
  j.fee_label = txt(b.fee_label, 60) || null; j.fee_note = txt(b.fee_note, 600) || null;
  j.stipend = j.stipend_amount ? '₹' + j.stipend_amount.toLocaleString('en-IN') + '/month' : '';
  j.duration = j.min_months === j.max_months ? `${j.min_months} month${j.min_months > 1 ? 's' : ''}` : `${j.min_months}-${j.max_months} months`;
  return j;
};
app.get('/api/admin/internships', admin, wrap(async (_, s) => s.json((await pool.query('SELECT i.*, (SELECT COUNT(*) FROM applications a WHERE a.internship_id=i.id)::int AS applications FROM internships i ORDER BY i.id')).rows)));
app.post('/api/admin/internships', admin, wrap(async (q, s) => {
  const j = cleanJob(q.body);
  s.json((await pool.query('INSERT INTO internships(title,domain,duration,mode,stipend,description,skills,open,min_months,max_months,stipend_amount,fee_amount,fee_label,fee_note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *', [j.title, j.domain, j.duration, j.mode, j.stipend, j.description, j.skills, j.open, j.min_months, j.max_months, j.stipend_amount, j.fee_amount, j.fee_label, j.fee_note])).rows[0]);
}));
app.put('/api/admin/internships/:id', admin, wrap(async (q, s) => {
  const j = cleanJob(q.body);
  const r = await pool.query('UPDATE internships SET title=$1,domain=$2,duration=$3,mode=$4,stipend=$5,description=$6,skills=$7,open=$8,min_months=$9,max_months=$10,stipend_amount=$11,fee_amount=$12,fee_label=$13,fee_note=$14 WHERE id=$15 RETURNING *', [j.title, j.domain, j.duration, j.mode, j.stipend, j.description, j.skills, j.open, j.min_months, j.max_months, j.stipend_amount, j.fee_amount, j.fee_label, j.fee_note, q.params.id]);
  r.rowCount ? s.json(r.rows[0]) : s.status(404).json({ error: 'Internship not found' });
}));
app.delete('/api/admin/internships/:id', admin, wrap(async (q, s) => {
  const n = (await pool.query('SELECT COUNT(*)::int n FROM applications WHERE internship_id=$1', [q.params.id])).rows[0].n;
  if (n) throw bad(`${n} application(s) belong to this internship, so it cannot be deleted. Close it instead to hide it from the website.`);
  await pool.query('DELETE FROM internships WHERE id=$1', [q.params.id]); s.json({ ok: true });
}));

// ---- gallery: photos added by the admin (title, category, location + image) ----
app.get('/api/gallery', wrap(async (_, s) => s.json((await pool.query('SELECT id,category,title,location,image FROM gallery_items ORDER BY id DESC')).rows)));
app.post('/api/admin/gallery', admin, wrap(async (q, s) => {
  const title = txt(q.body.title, 120); if (!title) throw bad('Give the photo a title');
  const image = saveImage(q.body.image);
  s.json((await pool.query('INSERT INTO gallery_items(category,title,location,image) VALUES($1,$2,$3,$4) RETURNING *', [txt(q.body.category, 40) || 'General', title, txt(q.body.location, 120) || null, image])).rows[0]);
}));
app.put('/api/admin/gallery/:id', admin, wrap(async (q, s) => {
  const cur = (await pool.query('SELECT image FROM gallery_items WHERE id=$1', [q.params.id])).rows[0]; if (!cur) return s.status(404).json({ error: 'Photo not found' });
  const title = txt(q.body.title, 120); if (!title) throw bad('Give the photo a title');
  const image = q.body.image ? saveImage(q.body.image) : cur.image;
  const r = await pool.query('UPDATE gallery_items SET category=$1,title=$2,location=$3,image=$4 WHERE id=$5 RETURNING *', [txt(q.body.category, 40) || 'General', title, txt(q.body.location, 120) || null, image, q.params.id]);
  if (image !== cur.image) rmImage(cur.image); s.json(r.rows[0]);
}));
app.delete('/api/admin/gallery/:id', admin, wrap(async (q, s) => {
  const r = await pool.query('DELETE FROM gallery_items WHERE id=$1 RETURNING image', [q.params.id]);
  if (r.rowCount) rmImage(r.rows[0].image); s.json({ ok: true });
}));

// ---- leadership: admin adds, edits and deletes team members ----
app.get('/api/leaders', wrap(async (_, s) => s.json((await pool.query('SELECT id,name,role,bio,image,position FROM leaders ORDER BY position, id')).rows)));
const cleanLeader = b => { const l = { name: txt(b.name, 80), role: txt(b.role, 100), bio: txt(b.bio, 500) || null, position: Math.max(0, Math.min(999, Math.floor(+b.position) || 0)) }; if (!l.name || !l.role) throw bad('Name and role are required'); return l; };
app.post('/api/admin/leaders', admin, wrap(async (q, s) => {
  const l = cleanLeader(q.body), image = q.body.image ? saveImage(q.body.image) : null;
  s.json((await pool.query('INSERT INTO leaders(name,role,bio,image,position) VALUES($1,$2,$3,$4,$5) RETURNING *', [l.name, l.role, l.bio, image, l.position])).rows[0]);
}));
app.put('/api/admin/leaders/:id', admin, wrap(async (q, s) => {
  const cur = (await pool.query('SELECT image FROM leaders WHERE id=$1', [q.params.id])).rows[0]; if (!cur) return s.status(404).json({ error: 'Leader not found' });
  const l = cleanLeader(q.body); let image = cur.image;
  if (q.body.image) image = saveImage(q.body.image); else if (q.body.remove_image) image = null;
  const r = await pool.query('UPDATE leaders SET name=$1,role=$2,bio=$3,image=$4,position=$5 WHERE id=$6 RETURNING *', [l.name, l.role, l.bio, image, l.position, q.params.id]);
  if (image !== cur.image) rmImage(cur.image); s.json(r.rows[0]);
}));
app.delete('/api/admin/leaders/:id', admin, wrap(async (q, s) => {
  const r = await pool.query('DELETE FROM leaders WHERE id=$1 RETURNING image', [q.params.id]);
  if (r.rowCount) rmImage(r.rows[0].image); s.json({ ok: true });
}));


// ---- site settings (About / contact details edited by admin) ----
const SITE_DEFAULT = { company: 'Cyveronix', tagline: 'Security-first software, built in India since 2015.', address: 'Plot 42, Okhla Industrial Estate, Phase III, New Delhi, Delhi 110020, India', phone: '+91 98765 43210', email: 'hello@cyveronix.in', careers_email: 'careers@cyveronix.in', hours: 'Mon–Sat, 10:00 AM – 6:30 PM IST', about: '{company} is headquartered in New Delhi and was founded in 2015. Our engineers, analysts and designers build security products, run projects for Indian fintech, healthcare and education companies, and help college students learn by building real products.' };
const SITE_KEYS = Object.keys(SITE_DEFAULT);
const getSite = async () => { const r = await pool.query("SELECT value FROM site_settings WHERE key='site'"); return { ...SITE_DEFAULT, ...(r.rows[0]?.value || {}) }; };
app.get('/api/site', wrap(async (_, s) => s.json(await getSite())));
app.put('/api/admin/site', admin, wrap(async (q, s) => {
  const cur = await getSite(), n = {};
  for (const k of SITE_KEYS) n[k] = String(q.body[k] ?? cur[k]).trim().slice(0, k === 'about' ? 2000 : 300);
  if (!/^\S+@\S+\.\S+$/.test(n.email) || !/^\S+@\S+\.\S+$/.test(n.careers_email)) return s.status(400).json({ error: 'Enter valid email addresses' });
  if (!n.company || !n.address || !n.phone) return s.status(400).json({ error: 'Company name, address and phone are required' });
  await pool.query("INSERT INTO site_settings(key,value) VALUES('site',$1) ON CONFLICT (key) DO UPDATE SET value=$1", [n]);
  s.json(n);
}));

// ---- aptitude tests: admin builds them, sends to a student, student takes it ----
const cleanQ = b => {
  const text = String(b.question || '').trim().slice(0, 1000), opts = (Array.isArray(b.options) ? b.options : []).map(x => String(x || '').trim().slice(0, 300));
  const correct = Math.floor(+b.correct);
  if (!text) return { error: 'Write the question' };
  if (opts.length !== 4 || opts.some(x => !x)) return { error: 'Fill all 4 options' };
  if (!(correct >= 0 && correct < 4)) return { error: 'Choose the correct option' };
  return { text, opts, correct };
};
app.get('/api/admin/tests', admin, wrap(async (_, s) => s.json((await pool.query(
  `SELECT t.*, (SELECT COUNT(*) FROM aptitude_questions q WHERE q.test_id=t.id)::int AS questions,
   (SELECT COUNT(*) FROM aptitude_assignments x WHERE x.test_id=t.id)::int AS sent FROM aptitude_tests t ORDER BY t.id DESC`)).rows)));
app.post('/api/admin/tests', admin, wrap(async (q, s) => {
  const title = String(q.body.title || '').trim().slice(0, 120), dur = Math.floor(+q.body.duration_min) || 30, pass = Math.floor(+q.body.pass_percent) || 50;
  if (!title) return s.status(400).json({ error: 'Give the test a title' });
  if (dur < 5 || dur > 240) return s.status(400).json({ error: 'Duration must be 5 to 240 minutes' });
  if (pass < 1 || pass > 100) return s.status(400).json({ error: 'Pass mark must be 1 to 100 %' });
  s.json((await pool.query('INSERT INTO aptitude_tests(title,instructions,duration_min,pass_percent) VALUES($1,$2,$3,$4) RETURNING *', [title, String(q.body.instructions || '').slice(0, 1500) || null, dur, pass])).rows[0]);
}));
app.patch('/api/admin/tests/:id', admin, wrap(async (q, s) => {
  const b = q.body, dur = Math.floor(+b.duration_min) || 30, pass = Math.floor(+b.pass_percent) || 50;
  if (!String(b.title || '').trim()) return s.status(400).json({ error: 'Give the test a title' });
  if (dur < 5 || dur > 240 || pass < 1 || pass > 100) return s.status(400).json({ error: 'Check duration (5-240) and pass mark (1-100)' });
  const r = await pool.query('UPDATE aptitude_tests SET title=$1,instructions=$2,duration_min=$3,pass_percent=$4 WHERE id=$5 RETURNING *', [b.title.trim().slice(0, 120), String(b.instructions || '').slice(0, 1500) || null, dur, pass, q.params.id]);
  r.rowCount ? s.json(r.rows[0]) : s.status(404).json({ error: 'Test not found' });
}));
app.delete('/api/admin/tests/:id', admin, wrap(async (q, s) => {
  if ((await pool.query('SELECT 1 FROM aptitude_assignments WHERE test_id=$1', [q.params.id])).rowCount) return s.status(400).json({ error: 'This test was already sent to students and cannot be deleted. Edit it instead.' });
  await pool.query('DELETE FROM aptitude_tests WHERE id=$1', [q.params.id]); s.json({ ok: true });
}));
app.get('/api/admin/tests/:id/questions', admin, wrap(async (q, s) => s.json((await pool.query('SELECT * FROM aptitude_questions WHERE test_id=$1 ORDER BY position,id', [q.params.id])).rows)));
const locked = async id => (await pool.query('SELECT 1 FROM aptitude_assignments WHERE test_id=$1', [id])).rowCount > 0;
app.post('/api/admin/tests/:id/questions', admin, wrap(async (q, s) => {
  const c = cleanQ(q.body); if (c.error) return s.status(400).json(c);
  if (await locked(q.params.id)) return s.status(400).json({ error: 'This test is already sent to students. Create a copy as a new test to change questions.' });
  s.json((await pool.query('INSERT INTO aptitude_questions(test_id,question,options,correct,position) VALUES($1,$2,$3,$4,(SELECT COALESCE(MAX(position),0)+1 FROM aptitude_questions WHERE test_id=$1)) RETURNING *', [q.params.id, c.text, JSON.stringify(c.opts), c.correct])).rows[0]);
}));
app.put('/api/admin/questions/:qid', admin, wrap(async (q, s) => {
  const c = cleanQ(q.body); if (c.error) return s.status(400).json(c);
  const t = (await pool.query('SELECT test_id FROM aptitude_questions WHERE id=$1', [q.params.qid])).rows[0];
  if (!t) return s.status(404).json({ error: 'Question not found' });
  if (await locked(t.test_id)) return s.status(400).json({ error: 'This test is already sent to students and is locked.' });
  s.json((await pool.query('UPDATE aptitude_questions SET question=$1,options=$2,correct=$3 WHERE id=$4 RETURNING *', [c.text, JSON.stringify(c.opts), c.correct, q.params.qid])).rows[0]);
}));
app.delete('/api/admin/questions/:qid', admin, wrap(async (q, s) => {
  const t = (await pool.query('SELECT test_id FROM aptitude_questions WHERE id=$1', [q.params.qid])).rows[0];
  if (!t) return s.json({ ok: true });
  if (await locked(t.test_id)) return s.status(400).json({ error: 'This test is already sent to students and is locked.' });
  await pool.query('DELETE FROM aptitude_questions WHERE id=$1', [q.params.qid]); s.json({ ok: true });
}));
app.post('/api/admin/tests/:id/duplicate', admin, wrap(async (q, s) => {
  const t = (await pool.query('SELECT * FROM aptitude_tests WHERE id=$1', [q.params.id])).rows[0];
  if (!t) return s.status(404).json({ error: 'Test not found' });
  const n = (await pool.query('INSERT INTO aptitude_tests(title,instructions,duration_min,pass_percent) VALUES($1,$2,$3,$4) RETURNING *', [t.title + ' (copy)', t.instructions, t.duration_min, t.pass_percent])).rows[0];
  await pool.query('INSERT INTO aptitude_questions(test_id,question,options,correct,position) SELECT $1,question,options,correct,position FROM aptitude_questions WHERE test_id=$2', [n.id, t.id]);
  s.json(n);
}));
// send a test to a student (only after the registration fee is paid, if a fee was requested)
app.post('/api/admin/applications/:id/aptitude', admin, wrap(async (q, s) => {
  const a = (await pool.query('SELECT status,payment_status FROM applications WHERE id=$1', [q.params.id])).rows[0];
  if (!a) return s.status(404).json({ error: 'Application not found' });
  if (['Requested', 'UTR submitted'].includes(a.payment_status)) return s.status(400).json({ error: 'Registration fee is not marked as paid yet' });
  if (['Rejected', 'Selected'].includes(a.status)) return s.status(400).json({ error: `Application is already ${a.status}` });
  const t = (await pool.query('SELECT t.*,(SELECT COUNT(*) FROM aptitude_questions WHERE test_id=t.id)::int n FROM aptitude_tests t WHERE id=$1', [q.body.test_id])).rows[0];
  if (!t) return s.status(400).json({ error: 'Choose a test' });
  if (t.n < 1) return s.status(400).json({ error: 'This test has no questions yet' });
  const ex = (await pool.query('SELECT status FROM aptitude_assignments WHERE application_id=$1', [q.params.id])).rows[0];
  if (ex) return s.status(400).json({ error: ex.status === 'Submitted' ? 'Student already submitted the test' : 'A test is already sent to this student' });
  await pool.query('INSERT INTO aptitude_assignments(application_id,test_id) VALUES($1,$2)', [q.params.id, t.id]);
  await pool.query("UPDATE applications SET updated_at=now() WHERE id=$1", [q.params.id]);
  await sayTo(q.params.id, `📝 An aptitude test "${t.title}" (${t.n} questions, ${t.duration_min} min) has been sent to you. Open "My application" and tap Start test.`);
  s.json({ ok: true });
}));
app.delete('/api/admin/applications/:id/aptitude', admin, wrap(async (q, s) => {
  const r = await pool.query("DELETE FROM aptitude_assignments WHERE application_id=$1 AND status<>'Submitted' RETURNING 1", [q.params.id]);
  r.rowCount ? s.json({ ok: true }) : s.status(400).json({ error: 'Nothing to withdraw (not sent or already submitted)' });
}));
// admin sees the result + every answer of one student
app.get('/api/admin/applications/:id/aptitude', admin, wrap(async (q, s) => {
  const x = (await pool.query('SELECT x.*,t.title,t.pass_percent,t.duration_min FROM aptitude_assignments x JOIN aptitude_tests t ON t.id=x.test_id WHERE x.application_id=$1', [q.params.id])).rows[0];
  if (!x) return s.json(null);
  const qs = (await pool.query('SELECT id,question,options,correct FROM aptitude_questions WHERE test_id=$1 ORDER BY position,id', [x.test_id])).rows;
  s.json({ ...x, review: qs.map(k => ({ ...k, picked: x.answers?.[k.id] ?? null })) });
}));
// student: open the test (questions without answers). The timer starts on first open.
const myApt = async (q, s) => {
  const x = (await pool.query(`SELECT x.*,t.title,t.instructions,t.duration_min FROM aptitude_assignments x JOIN aptitude_tests t ON t.id=x.test_id JOIN applications a ON a.id=x.application_id WHERE x.application_id=$1 AND a.student_id=$2`, [q.params.id, q.sid])).rows[0];
  if (!x) { s.status(404).json({ error: 'No aptitude test has been sent to you yet' }); return null; }
  return x;
};
app.get('/api/student/applications/:id/aptitude', authed, wrap(async (q, s) => {
  const x = await myApt(q, s); if (!x) return;
  const n = (await pool.query('SELECT COUNT(*)::int n FROM aptitude_questions WHERE test_id=$1', [x.test_id])).rows[0].n;
  s.json({ title: x.title, instructions: x.instructions, duration_min: x.duration_min, count: n, status: x.status });
}));
app.post('/api/student/applications/:id/aptitude/start', authed, wrap(async (q, s) => {
  const x = await myApt(q, s); if (!x) return;
  if (x.status === 'Submitted') return s.status(400).json({ error: 'You have already submitted this test' });
  if (!x.started_at) await pool.query('UPDATE aptitude_assignments SET started_at=now(),status=\'Started\' WHERE application_id=$1', [q.params.id]);
  const st = x.started_at || new Date(), endsAt = new Date(+new Date(st) + x.duration_min * 6e4);
  const qs = (await pool.query('SELECT id,question,options FROM aptitude_questions WHERE test_id=$1 ORDER BY position,id', [x.test_id])).rows;
  s.json({ title: x.title, instructions: x.instructions, ends_at: endsAt, now: new Date(), questions: qs });
}));
app.post('/api/student/applications/:id/aptitude/submit', authed, wrap(async (q, s) => {
  const x = await myApt(q, s); if (!x) return;
  if (x.status === 'Submitted') return s.status(400).json({ error: 'You have already submitted this test' });
  if (!x.started_at) return s.status(400).json({ error: 'Start the test first' });
  const qs = (await pool.query('SELECT id,correct FROM aptitude_questions WHERE test_id=$1', [x.test_id])).rows, ans = {}; let score = 0;
  for (const k of qs) { const v = q.body.answers?.[k.id]; if (Number.isInteger(v) && v >= 0 && v < 4) { ans[k.id] = v; if (v === k.correct) score++; } }
  const late = Date.now() > +new Date(x.started_at) + x.duration_min * 6e4 + 60e3; // 1 minute grace
  await pool.query("UPDATE aptitude_assignments SET status='Submitted',submitted_at=now(),answers=$1,score=$2,total=$3,late=$4 WHERE application_id=$5 AND status<>'Submitted'", [ans, score, qs.length, late, q.params.id]);
  await pool.query("UPDATE applications SET updated_at=now() WHERE id=$1", [q.params.id]);
  s.json({ ok: true }); // no score is returned to the student
}));

// ---- chat between admin and student (saved in the database) ----
const msgList = who => wrap(async (q, s) => {
  await pool.query('UPDATE messages SET seen=true WHERE application_id=$1 AND sender<>$2 AND NOT seen', [q.params.id, who]);
  s.json((await pool.query('SELECT id,sender,body,created_at FROM messages WHERE application_id=$1 ORDER BY id', [q.params.id])).rows);
});
const msgSend = who => wrap(async (q, s) => {
  const t = String(q.body.body || '').trim().slice(0, 2000);
  if (!t) return s.status(400).json({ error: 'Type a message first' });
  const r = await pool.query('INSERT INTO messages(application_id,sender,body) VALUES($1,$2,$3) RETURNING id,sender,body,created_at', [q.params.id, who, t]);
  s.json(r.rows[0]);
});
app.get('/api/student/applications/:id/messages', authed, mine, msgList('student'));
app.post('/api/student/applications/:id/messages', authed, mine, msgSend('student'));
app.get('/api/admin/applications/:id/messages', admin, msgList('admin'));
app.post('/api/admin/applications/:id/messages', admin, msgSend('admin'));

// ---- auto-setup of the new chat + project columns (safe to run every time) ----
let dbErr = '';
app.get('/api/health', (_, s) => s.json({ ok: true, version: 'v5-admin-gallery', db: !dbErr, error: dbErr }));
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages(id SERIAL PRIMARY KEY, application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      sender TEXT NOT NULL CHECK (sender IN ('admin','student')), body TEXT NOT NULL, seen BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now());
    CREATE INDEX IF NOT EXISTS messages_app ON messages(application_id, id);
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS project_title TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS project_details TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS duration_days INT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS end_date DATE;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'None';
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2);
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS fee_upi_id TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS fee_payee TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS utr TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS utr_submitted_at TIMESTAMPTZ;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_note TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_at TIMESTAMPTZ;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_duration_min INT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_mode TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_link TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_notes TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS one_utr ON applications(utr) WHERE utr IS NOT NULL;
    CREATE TABLE IF NOT EXISTS site_settings(key TEXT PRIMARY KEY, value JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS aptitude_tests(id SERIAL PRIMARY KEY, title TEXT NOT NULL, instructions TEXT, duration_min INT NOT NULL DEFAULT 30, pass_percent INT NOT NULL DEFAULT 50, created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS aptitude_questions(id SERIAL PRIMARY KEY, test_id INT NOT NULL REFERENCES aptitude_tests(id) ON DELETE CASCADE, question TEXT NOT NULL, options JSONB NOT NULL, correct INT NOT NULL, position INT DEFAULT 0);
    CREATE TABLE IF NOT EXISTS aptitude_assignments(application_id INT PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE, test_id INT NOT NULL REFERENCES aptitude_tests(id),
      status TEXT NOT NULL DEFAULT 'Sent', sent_at TIMESTAMPTZ DEFAULT now(), started_at TIMESTAMPTZ, submitted_at TIMESTAMPTZ, answers JSONB, score INT, total INT, late BOOLEAN DEFAULT false);
    ALTER TABLE internships ADD COLUMN IF NOT EXISTS min_months INT NOT NULL DEFAULT 1;
    ALTER TABLE internships ADD COLUMN IF NOT EXISTS max_months INT NOT NULL DEFAULT 6;
    ALTER TABLE internships ADD COLUMN IF NOT EXISTS stipend_amount INT;
    UPDATE internships SET stipend_amount = COALESCE(NULLIF(regexp_replace(split_part(replace(COALESCE(stipend,''),',',''),'/',1),'[^0-9]','','g'),'')::int, 0) WHERE stipend_amount IS NULL;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS months INT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS stipend_monthly INT;
    ALTER TABLE internships ADD COLUMN IF NOT EXISTS fee_amount INT NOT NULL DEFAULT 0;
    ALTER TABLE internships ADD COLUMN IF NOT EXISTS fee_label TEXT;
    ALTER TABLE internships ADD COLUMN IF NOT EXISTS fee_note TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS internship_fee INT;
    CREATE TABLE IF NOT EXISTS gallery_items(id SERIAL PRIMARY KEY, category TEXT NOT NULL DEFAULT 'General', title TEXT NOT NULL, location TEXT, image TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS leaders(id SERIAL PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, bio TEXT, image TEXT, position INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now());`);
  if (!(await pool.query('SELECT 1 FROM aptitude_tests LIMIT 1')).rowCount) {
    const t = (await pool.query("INSERT INTO aptitude_tests(title,instructions,duration_min,pass_percent) VALUES('General Aptitude Test','Answer all questions. Each has one correct answer. The test auto-closes when time is over. You will not see your score; our team will contact you.',20,50) RETURNING id")).rows[0].id;
    const Q = [['A train 150 m long passes a pole in 15 seconds. What is its speed?', ['8 m/s', '10 m/s', '12 m/s', '15 m/s'], 1], ['If 20% of a number is 45, the number is:', ['180', '200', '225', '250'], 2], ['Find the next number: 2, 6, 12, 20, 30, ?', ['38', '40', '42', '44'], 2], ['Which one is different from the others?', ['Python', 'Java', 'Linux', 'C++'], 2], ['A can finish a job in 10 days, B in 15 days. Together they finish in:', ['5 days', '6 days', '7.5 days', '8 days'], 1], ['Simple interest on ₹5,000 at 8% per year for 3 years is:', ['₹1,000', '₹1,200', '₹1,400', '₹1,500'], 1], ['CAT : DOG :: 3 : ?', ['3', '4', '5', 'Cannot say'], 0], ['Which protocol is used to securely browse websites?', ['HTTP', 'FTP', 'HTTPS', 'SMTP'], 2]];
    for (let i = 0; i < Q.length; i++) await pool.query('INSERT INTO aptitude_questions(test_id,question,options,correct,position) VALUES($1,$2,$3,$4,$5)', [t, Q[i][0], JSON.stringify(Q[i][1]), Q[i][2], i + 1]);
  }
  console.log('Database ready');
} catch (e) { dbErr = e.message; console.error('Database setup failed:', e.message); }
const port = process.env.PORT || 5000;
app.listen(port, () => console.log('API running on port ' + port)).on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? `\nPort ${port} is already in use: an OLD server is still running.\nClose every PowerShell window running the server (or press Ctrl+C in it), then run  npm start  again.\n` : e); process.exit(1); });