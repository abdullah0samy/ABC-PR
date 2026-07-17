-- =====================================================================
-- ABC Hospital Survey System — PostgreSQL Schema
-- =====================================================================

BEGIN;

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    username      VARCHAR(64) NOT NULL UNIQUE,
    password      VARCHAR(256) NOT NULL,
    role          VARCHAR(16) NOT NULL CHECK (role IN ('Admin', 'Manager', 'Agent')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. templates
CREATE TABLE IF NOT EXISTS templates (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(32) NOT NULL CHECK (title IN ('In-Patient', 'Out-Patient')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. categories
CREATE TABLE IF NOT EXISTS categories (
    id            SERIAL PRIMARY KEY,
    name_english  VARCHAR(120) NOT NULL UNIQUE,
    name_arabic   VARCHAR(120) NOT NULL
);

-- 4. questions
CREATE TABLE IF NOT EXISTS questions (
    id            SERIAL PRIMARY KEY,
    template_id   INT NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
    text          VARCHAR(1000) NOT NULL,
    category      VARCHAR(32) NOT NULL CHECK (category IN ('Medical', 'Nursing', 'Hospitality', 'Security')),
    priority      VARCHAR(16) NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. surveys
CREATE TABLE IF NOT EXISTS surveys (
    id              SERIAL PRIMARY KEY,
    agent_id        INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    agent_name      VARCHAR(120) NOT NULL,
    patient_name    VARCHAR(200) NOT NULL,
    medical_number  VARCHAR(120) NOT NULL,
    room_number     VARCHAR(60) NOT NULL DEFAULT 'غير محدد',
    phone_number    VARCHAR(32) NOT NULL,
    doctor_name     VARCHAR(200) NOT NULL,
    enter_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    interview_type  VARCHAR(16) NOT NULL CHECK (interview_type IN ('Call', 'In Person')),
    clinic_type     VARCHAR(16) NOT NULL CHECK (clinic_type IN ('In-Patient', 'Out-Patient')),
    is_satisfied    BOOLEAN NOT NULL,
    recommend       VARCHAR(4) NOT NULL CHECK (recommend IN ('Yes', 'No')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    followup_status VARCHAR(16) CHECK (followup_status IN ('تم الحل', 'قيد العمل') OR followup_status IS NULL),
    reminder_text   VARCHAR(2000)
);

-- 6. answers
CREATE TABLE IF NOT EXISTS answers (
    id            SERIAL PRIMARY KEY,
    survey_id     INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_id   INT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    score         INT NOT NULL CHECK (score >= 1 AND score <= 5)
);

-- 7. whatsapp_logs
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id                    VARCHAR(120) PRIMARY KEY,
    phone_number          VARCHAR(32) NOT NULL,
    message               TEXT NOT NULL,
    sent_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    medical_number        VARCHAR(120) NOT NULL,
    status                VARCHAR(32) NOT NULL CHECK (status IN ('مرسلة', 'مستلمة', 'تمت القراءة')),
    webhook_event         VARCHAR(128),
    webhook_updated_at    TIMESTAMPTZ,
    webhook_raw_payload   TEXT
);

-- =====================================================================
-- Indexes
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_surveys_agent_id ON surveys (agent_id);
CREATE INDEX IF NOT EXISTS idx_surveys_clinic_type ON surveys (clinic_type);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_surveys_is_satisfied ON surveys (is_satisfied);
CREATE INDEX IF NOT EXISTS idx_surveys_medical_number ON surveys (medical_number);
CREATE INDEX IF NOT EXISTS idx_surveys_archive ON surveys (clinic_type, is_satisfied, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_survey_id ON answers (survey_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers (question_id);
CREATE INDEX IF NOT EXISTS idx_answers_survey_question ON answers (survey_id, question_id);
CREATE INDEX IF NOT EXISTS idx_questions_template_id ON questions (template_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions (category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_medical_number ON whatsapp_logs (medical_number);

COMMIT;
