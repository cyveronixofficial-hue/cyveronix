CREATE TABLE IF NOT EXISTS internships(
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, domain TEXT NOT NULL, duration TEXT,
  mode TEXT, stipend TEXT, description TEXT, skills TEXT, open BOOLEAN DEFAULT true,
  min_months INT NOT NULL DEFAULT 1, max_months INT NOT NULL DEFAULT 6, stipend_amount INT, fee_amount INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS students(
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT NOT NULL,
  password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS applications(
  student_id INT REFERENCES students(id), admin_message TEXT, updated_at TIMESTAMPTZ DEFAULT now(),
  id SERIAL PRIMARY KEY, internship_id INT REFERENCES internships(id), domain TEXT NOT NULL,
  full_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, college TEXT NOT NULL,
  degree TEXT, branch TEXT, year TEXT, cgpa TEXT, skills TEXT, github TEXT, linkedin TEXT,
  resume_url TEXT, why TEXT, availability TEXT, months INT, stipend_monthly INT, internship_fee INT, status TEXT DEFAULT 'New',
  applied_at TIMESTAMPTZ DEFAULT now(), interview_by TIMESTAMPTZ);
CREATE UNIQUE INDEX IF NOT EXISTS one_app_per_student ON applications(student_id, internship_id);
INSERT INTO internships(title,domain,duration,mode,stipend,description,skills) VALUES
('Web Development Intern','Web Development','3 months','Remote','₹8,000/mo','Build features for our client dashboards with React and Node.js.','HTML, CSS, JavaScript, React'),
('Cybersecurity Intern','Cybersecurity','3 months','Hybrid','₹10,000/mo','Help the red team with vulnerability assessments and reports.','Networking, Linux, OWASP'),
('AI / ML Intern','AI / Machine Learning','4 months','Remote','₹12,000/mo','Train and evaluate models for threat detection.','Python, scikit-learn, PyTorch'),
('Data Science Intern','Data Science','3 months','Remote','₹8,000/mo','Analyse security telemetry and build dashboards.','Python, SQL, Pandas'),
('Cloud & DevOps Intern','Cloud & DevOps','3 months','Remote','₹9,000/mo','Automate deployments and monitor infrastructure.','Docker, AWS, Git, CI/CD'),
('Mobile App Intern','Mobile App Development','3 months','Remote','₹8,000/mo','Ship features in our React Native companion app.','JavaScript, React Native'),
('UI/UX Design Intern','UI/UX Design','2 months','Remote','₹6,000/mo','Design flows and prototypes for security products.','Figma, Research');
