# Cyveronix website (India edition, New Delhi)
1. Create DB:  `createdb cyveronix && psql cyveronix -f server/schema.sql`
2. Server:  `cd server && cp .env.example .env` (edit DATABASE_URL + ADMIN_PASSWORD), then `npm install && npm start`
3. Client:  `cd client && npm install && npm run dev`  -> open http://localhost:5173
Admin page (secret address, no link on the site): http://localhost:5173/#/<your-secret-admin-path> then enter ADMIN_PASSWORD. Applicants are stored in the `applications` table.
Gallery pictures are illustrated placeholders; to use real photos add `img: "/photos/name.jpg"` to items in `client/src/Gallery.jsx` and put files in `client/public/photos/`.
Real photos: copy your images into client/public/photos/ using the names in client/public/photos/README.txt. The Cyveronix logo is added automatically.

## Student accounts (new)
- Students must register/log in to apply, then see their status under "My application".
- Existing database? Run `psql cyveronix -f server/upgrade.sql`. New database? `schema.sql` already includes it.
- Add `JWT_SECRET` (any long random text) to `server/.env`.
- In the admin page, open a row to change the status and write a message; the student sees both.
- Resume: the file is only picked in the browser (2 MB, PDF/Word). It is NOT uploaded or saved anywhere.

## Registration fee (UPI) + interview schedule (new)
Flow: student applies -> admin opens the applicant and clicks **Request registration fee** (amount + your UPI ID) -> student sees the fee in *My application* and taps **Pay with Google Pay** -> student enters the 12-digit **UTR** -> admin sees the UTR, matches it in Google Pay/bank history and clicks **Payment done** (or **Doesn't match**) -> admin then sets the **Interview schedule** (date/time, duration, mode, link, notes).
- Interview scheduling is blocked until the fee is marked paid (only for applicants who were asked to pay).
- Database columns are created automatically when the server starts. For manual setup run the new section of `server/upgrade.sql`.
- The Pay button opens Google Pay on Android/iPhone. On a computer the student copies the UPI ID and pays from their phone.


## v4 changes (India edition + aptitude + admin upgrade)
- **Indian company profile**: head office in Okhla, New Delhi (sample address), Indian offices/cities, ₹ amounts, IST times, +91 default phone with 10-digit validation. The address, phone and email shown are **sample placeholders** — change them in the admin panel before going live.
- **Admin panel** (`/#/<your-secret-admin-path>`) now has 3 tabs:
  1. **Applicants** – search/filter, a *Stage* and *Next action* column, and an **Open** button that slides in a full detail panel (fee, aptitude, interview, decision, project, chat).
  2. **Aptitude tests** – create tests, set time and pass mark, add/edit/delete multiple-choice questions (4 options + correct answer), duplicate tests. A test that has been sent to students is locked (use *Duplicate*) so results stay fair.
  3. **About & contact** – edit company name, address, phone, emails, office hours and About text. They update the footer, Home and About pages instantly.
- **Hiring flow** (enforced by the server): Apply → admin requests fee (UPI) → student submits UTR → admin confirms → admin sends aptitude test → student takes timed test and sees only *"submitted, we will notify you"* (no score) → admin sees score, pass/fail and every answer → admin schedules interview (must be a future time, only after the test) → admin **Selects** (only after interview) or **Rejects** (any stage, with optional message) → selected students get the project/time-period flow as before.
- Bug fixed: the server could crash on start (`mine` was used before it was defined), which made admin pages and chat fail.
- New tables are created automatically on server start (`site_settings`, `aptitude_tests`, `aptitude_questions`, `aptitude_assignments`). A sample "General Aptitude Test" is added the first time.
- Security note: `server/.env` contains your real-looking admin password. Change `ADMIN_PASSWORD` and `JWT_SECRET` before deploying, and do not share the zip publicly.


## v5 changes (new home page, admin panel upgrade, gallery/leadership/internship management)
- **Home page redesigned.** The drawn building picture and the "Est. 2015 · New Delhi" badge are gone. New hero with a security-dashboard visual, cleaner service/product/result cards, and a new story timeline.
- **Gallery is now managed from the admin panel.** All built-in/placeholder pictures and the old `client/public/photos` folder are removed. Admin → **Gallery** → choose an image, add title, category and location. Photos appear on Home, About and the Gallery page. Edit or delete any photo later. The gallery section stays hidden until you add a photo.
- **Leadership from the admin panel.** Admin → **Leadership** → add name, role, short bio, optional photo and display order. Edit or delete anytime. Hidden on the Home page until you add someone.
- **Internships from the admin panel.** Admin → **Internships** → add, edit, close/reopen or delete. An internship that already has applications cannot be deleted (close it instead), so no student data is lost.
- **Reject and delete applications.** In an applicant's panel you can **Reject** at any stage (the student is notified), then **Delete application** to remove it completely (chat, payment details and test result too). Deleting lets that student apply again.
- **Admin panel UI**: sidebar layout, full-screen (no website header/footer), KPI cards, better tables and forms, stays signed in for the browser session.
- **My application page redesigned**: 5-step progress bar and a clear "Your next step" box.
- Uploaded photos are saved in `server/uploads/` (created automatically). **Back this folder up** with your database, and keep it when you redeploy. JPG, PNG and WebP up to 5 MB; large photos are resized in the browser before upload.
- New tables (`gallery_items`, `leaders`) are created automatically when the server starts. No new npm packages are needed. Run `npm install` again in `client` and `server` as usual.
- Security: change `ADMIN_PASSWORD` and `JWT_SECRET` in `server/.env` before going live.


## v6 changes
- **Leadership cards are small now**: round 96 px photo (or initials) instead of a big square picture.
- **Company name from the admin panel**: Admin → *About & contact* → *Company name*. It changes everywhere at once: header, footer, page title, Home, About, Careers, Gallery, chat, payment/aptitude/project pages and the admin sidebar. In the About text you can write `{company}` to insert the name automatically.
- **Live security overview on the home page**: the fixed "99.99%" panel is replaced by a live panel (sample data) that updates every 2 seconds: threats blocked counter, uptime, response time, moving bar graph and a feed of new events ("Brute-force attempt blocked", etc.). It is demo data, not a real monitoring feed.
- **Apply form**: CGPA and LinkedIn are now mandatory, GitHub stays optional, the Availability field is removed, a **months** selector is added, and the **stipend** for the internship is shown on top of the form (with the total for the chosen months).
- **Internships in the admin panel**: *Minimum months*, *Maximum months* and *Stipend per month (₹)* replace the old free-text duration/stipend. Students can only pick months in that range. The stipend is saved with each application at the time of applying.
- Applicant details in the admin panel show the chosen months and stipend; the project time period defaults to months × 30 days.
- New database columns are added automatically when the server starts (also listed at the end of `server/upgrade.sql`). Existing stipends such as "₹8,000/mo" are converted to numbers automatically.

## v7 changes
- **Apply page**: the stipend / internship length / total boxes are removed. It shows a one-time **Certification fee** that the admin sets per internship (Admin > Internships > *Certification fee*). The fee is not multiplied by months. Enter 0 to hide it. The fee is saved with each application and pre-fills the *Request registration fee* box in the applicant panel.
- **Aptitude test**: the camera must be allowed and is switched on during the test (live preview in the corner). **Nothing is recorded, captured or uploaded.** The camera switches off when the test is submitted.
- **Home page**: the panel label now says just **Live** (no "sample data").

## v8 changes
- **Fee title and fee text are editable by admin.** Admin → Internships → Add/Edit → *Fee title* (default "Certification fee") and *Fee text*. Write `{fee}` in the text where the amount should appear. Leave them empty to use the standard wording.
- The fee amount is a single flat amount per internship (Admin → Internships → *Certification fee*). It is **not** multiplied by months: 1, 2 or 3 months all pay the same fee.
- Two new columns (`fee_label`, `fee_note`) are added automatically when the server starts (also listed at the end of `server/upgrade.sql`). **Restart the server after deploying.**
