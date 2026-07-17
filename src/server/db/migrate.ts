import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { pool } from "./pool";
import { logger } from "../utils/logger";
import type { DBData } from "../types";

const SCHEMA_PATH = path.resolve(__dirname, "schema.sql");

/** Ensure schema exists (CREATE TABLE IF NOT EXISTS — safe to run every boot). */
async function applySchema(): Promise<void> {
  const sql = fs.readFileSync(SCHEMA_PATH, "utf-8");
  await pool.query(sql);
  logger.info("PostgreSQL schema applied");
}

/** Check whether the database already has data. */
async function hasData(): Promise<boolean> {
  const res = await pool.query<{ cnt: string }>("SELECT COUNT(*) AS cnt FROM users");
  return parseInt(res.rows[0].cnt, 10) > 0;
}

/** Read the JSON seed file (if it exists) and return a normalized DBData. */
function readJsonSeed(): DBData | null {
  const dbFile = process.env.DB_FILE;
  if (!dbFile) return null;

  const resolved = path.resolve(dbFile);
  if (!fs.existsSync(resolved)) {
    logger.info({ file: resolved }, "JSON seed file not found — skipping import");
    return null;
  }

  try {
    const raw = fs.readFileSync(resolved, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DBData>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      templates: Array.isArray(parsed.templates) ? parsed.templates : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      surveys: Array.isArray(parsed.surveys) ? parsed.surveys : [],
      answers: Array.isArray(parsed.answers) ? parsed.answers : [],
      whatsappLogs: Array.isArray(parsed.whatsappLogs) ? parsed.whatsappLogs : [],
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0
        ? parsed.categories
        : [
            { id: 1, nameEnglish: "Medical", nameArabic: "طبي" },
            { id: 2, nameEnglish: "Nursing", nameArabic: "تمريض" },
            { id: 3, nameEnglish: "Hospitality", nameArabic: "ضيافة" },
            { id: 4, nameEnglish: "Security", nameArabic: "أمن" },
          ],
    };
  } catch (err) {
    logger.error({ err, file: resolved }, "Failed to read JSON seed file");
    return null;
  }
}

/** Import all data from JSON into PostgreSQL (single transaction). */
async function importJson(data: DBData): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Disable triggers temporarily to allow explicit ID insertion
    await client.query("SET CONSTRAINTS ALL DEFERRED");

    // 1. Users
    for (const u of data.users) {
      await client.query(
        `INSERT INTO users (id, name, username, password, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.name, u.username, u.password, u.role, u.createdAt],
      );
    }

    // 2. Templates
    for (const t of data.templates) {
      await client.query(
        `INSERT INTO templates (id, title, is_active, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.title, t.isActive, t.createdAt],
      );
    }

    // 3. Categories
    for (const c of data.categories) {
      await client.query(
        `INSERT INTO categories (id, name_english, name_arabic)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.nameEnglish, c.nameArabic],
      );
    }

    // 4. Questions
    for (const q of data.questions) {
      await client.query(
        `INSERT INTO questions (id, template_id, text, category, priority, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [q.id, q.templateId, q.text, q.category, q.priority, q.createdAt],
      );
    }

    // 5. Surveys
    for (const s of data.surveys) {
      await client.query(
        `INSERT INTO surveys (id, agent_id, agent_name, patient_name, medical_number,
           room_number, phone_number, doctor_name, enter_date, interview_type,
           clinic_type, is_satisfied, recommend, created_at, followup_status, reminder_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [
          s.id, s.agentId, s.agentName, s.patientName, s.medicalNumber,
          s.roomNumber, s.phoneNumber, s.doctorName, s.enterDate, s.interviewType,
          s.clinicType, s.isSatisfied, s.recommend, s.createdAt,
          s.followupStatus ?? null, s.reminderText ?? null,
        ],
      );
    }

    // 6. Answers
    for (const a of data.answers) {
      await client.query(
        `INSERT INTO answers (id, survey_id, question_id, score)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.surveyId, a.questionId, a.score],
      );
    }

    // 7. WhatsApp logs
    for (const w of data.whatsappLogs) {
      await client.query(
        `INSERT INTO whatsapp_logs (id, phone_number, message, sent_at, medical_number,
           status, webhook_event, webhook_updated_at, webhook_raw_payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [
          w.id, w.phoneNumber, w.message, w.sentAt, w.medicalNumber,
          w.status, w.webhookEvent ?? null, w.webhookUpdatedAt ?? null,
          w.webhookRawPayload ?? null,
        ],
      );
    }

    await client.query("COMMIT");
    logger.info(
      {
        users: data.users.length,
        templates: data.templates.length,
        questions: data.questions.length,
        categories: data.categories.length,
        surveys: data.surveys.length,
        answers: data.answers.length,
        whatsappLogs: data.whatsappLogs.length,
      },
      "JSON data imported into PostgreSQL",
    );
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "JSON→PG import failed — rolled back");
    throw err;
  } finally {
    client.release();
  }
}

/** Reset sequences to MAX(id) for all SERIAL columns. */
async function resetSequences(): Promise<void> {
  const tables = ["users", "templates", "categories", "questions", "surveys", "answers"];
  for (const table of tables) {
    const col = table === "whatsapp_logs" ? "id" : "id";
    const seq = `${table}_${col}_seq`;
    try {
      await pool.query(
        `SELECT setval($1, COALESCE((SELECT MAX(id) FROM ${table}), 1))`,
        [seq],
      );
    } catch {
      // whatsapp_logs uses VARCHAR PK — no sequence to reset
    }
  }
}

/** Seed default data (users, templates, categories) when no JSON file exists. */
async function seedDefaults(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const pw = bcrypt.hashSync("change-me-admin", 12);
    const pwMgr = bcrypt.hashSync("change-me-manager", 12);
    const pwAgent = bcrypt.hashSync("change-me-agent", 12);

    await client.query(
      `INSERT INTO users (name, username, password, role) VALUES
        ($1, $2, $3, 'Admin'),
        ($4, $5, $6, 'Manager'),
        ($7, $8, $9, 'Agent')
       ON CONFLICT (username) DO NOTHING`,
      [
        "عبد الله سامي", "admin", pw,
        "منى خالد", "manager", pwMgr,
        "خالد العتيبي", "agent", pwAgent,
      ],
    );

    await client.query(
      `INSERT INTO templates (title) VALUES ('In-Patient'), ('Out-Patient') ON CONFLICT DO NOTHING`,
    );

    await client.query(
      `INSERT INTO categories (name_english, name_arabic) VALUES
        ('Medical', 'طبي'),
        ('Nursing', 'تمريض'),
        ('Hospitality', 'ضيافة'),
        ('Security', 'أمن')
       ON CONFLICT (name_english) DO NOTHING`,
    );

    await client.query("COMMIT");
    logger.info("Default seed data inserted (users, templates, categories)");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Failed to seed default data");
    throw err;
  } finally {
    client.release();
  }
}

/** Main migration entry point — safe to call on every boot. */
export async function runMigration(): Promise<void> {
  logger.info("Starting PostgreSQL migration...");

  // 1. Apply schema (CREATE TABLE IF NOT EXISTS — idempotent)
  await applySchema();

  // 2. Check if data already exists
  const alreadyMigrated = await hasData();
  if (alreadyMigrated) {
    logger.info("Database already contains data — skipping JSON import");
    return;
  }

  // 3. Try to import from JSON seed file
  const seedData = readJsonSeed();
  if (!seedData) {
    logger.info("No JSON seed file found — seeding default data");
    await seedDefaults();
    await resetSequences();
    return;
  }

  // 4. Import
  await importJson(seedData);

  // 5. Reset sequences
  await resetSequences();

  logger.info("PostgreSQL migration completed successfully");
}
