-- Run this if you already created the database before student accounts were added
CREATE TABLE IF NOT EXISTS students(id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE applications ADD COLUMN IF NOT EXISTS student_id INT REFERENCES students(id);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_message TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS one_app_per_student ON applications(student_id, internship_id);

-- Registration fee (UPI) + interview schedule
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

-- v5: gallery + leadership managed from the admin panel (also created automatically when the server starts)
CREATE TABLE IF NOT EXISTS gallery_items(id SERIAL PRIMARY KEY, category TEXT NOT NULL DEFAULT 'General', title TEXT NOT NULL, location TEXT, image TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS leaders(id SERIAL PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, bio TEXT, image TEXT, position INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now());

-- v6: internship months + stipend controlled by admin (also created automatically when the server starts)
ALTER TABLE internships ADD COLUMN IF NOT EXISTS min_months INT NOT NULL DEFAULT 1;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS max_months INT NOT NULL DEFAULT 6;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS stipend_amount INT;
UPDATE internships SET stipend_amount = COALESCE(NULLIF(regexp_replace(split_part(replace(COALESCE(stipend,''),',',''),'/',1),'[^0-9]','','g'),'')::int, 0) WHERE stipend_amount IS NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS months INT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS stipend_monthly INT;

-- v7: one-time certification fee set by admin for each internship (not multiplied by months)
ALTER TABLE internships ADD COLUMN IF NOT EXISTS fee_amount INT NOT NULL DEFAULT 0;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS internship_fee INT;
