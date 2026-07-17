import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { config } from "../config";
import { logger } from "./logger";
import type { DBData, Category } from "../types";

const DB_FILE = config.dbFile;

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, nameEnglish: "Medical", nameArabic: "طبي" },
  { id: 2, nameEnglish: "Nursing", nameArabic: "تمريض" },
  { id: 3, nameEnglish: "Hospitality", nameArabic: "ضيافة" },
  { id: 4, nameEnglish: "Security", nameArabic: "أمن" },
];

const writeQueue: Promise<unknown>[] = [];
let writeChain: Promise<void> = Promise.resolve();

function normalize(parsed: Partial<DBData>): DBData {
  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    templates: Array.isArray(parsed.templates) ? parsed.templates : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    surveys: Array.isArray(parsed.surveys) ? parsed.surveys : [],
    answers: Array.isArray(parsed.answers) ? parsed.answers : [],
    whatsappLogs: Array.isArray(parsed.whatsappLogs) ? parsed.whatsappLogs : [],
    categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES,
  };
}

export function loadDB(): DBData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = normalize(JSON.parse(content));
      return parsed;
    }
  } catch (error) {
    logger.error({ err: error, file: DB_FILE }, "Error loading DB file, falling back to seed");
  }
  // First run: persist seed (via atomic write) then return.
  const seed = buildSeed();
  saveDB(seed);
  return seed;
}

/**
 * Atomic write: write to a sibling temp file then rename. On POSIX, rename is
 * atomic. We serialize writes through a chain to avoid torn JSON between
 * concurrent callers within the same process.
 */
function atomicWrite(data: DBData): void {
  const dir = path.dirname(DB_FILE);
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  try {
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    // Cross-device rename fallback
    try {
      fs.copyFileSync(tmp, DB_FILE);
      fs.unlinkSync(tmp);
    } catch (err2) {
      logger.error({ err: err2 }, "Failed to copy DB temp file");
      try {
        fs.unlinkSync(tmp);
      } catch {
        // ignore
      }
    }
  }
}

/** Synchronous save keeps existing call sites simple; serialized for consistency. */
export function saveDB(data: DBData): void {
  writeChain = writeChain.then(() => atomicWrite(data)).catch((err) => {
    logger.error({ err }, "Error saving DB file");
  });
  // If callers need to await, expose an async variant in the future.
  void writeQueue;
}

/** Awaitable flush helper for tests / critical sequences. */
export async function flushDBWrites(): Promise<void> {
  await writeChain;
}

/** In-memory singleton used across request handlers within a process. */
let db: DBData = loadDB();
export function getDB(): DBData {
  return db;
}
/** Replace the in-memory DB (used by tests for deterministic seeding). */
export function setDB(next: DBData): void {
  db = next;
  saveDB(db);
}

function buildSeed(): DBData {
  const now = new Date().toISOString();
  return {
    users: [
      { id: 1, name: "عبد الله سامي (المدير العام)", username: "admin", password: hashPassword("change-me-admin"), role: "Admin", createdAt: now },
      { id: 2, name: "منى خالد (المدير الإداري)", username: "manager", password: hashPassword("change-me-manager"), role: "Manager", createdAt: now },
      { id: 3, name: "خالد العتيبي (موظف علاقات)", username: "agent", password: hashPassword("change-me-agent"), role: "Agent", createdAt: now },
    ],
    templates: [
      { id: 1, title: "In-Patient", isActive: true, createdAt: now },
      { id: 2, title: "Out-Patient", isActive: true, createdAt: now },
    ],
    categories: DEFAULT_CATEGORIES,
    questions: [
      { id: 1, templateId: 1, text: "ما مدى رضاك عن نظافة الغرفة والمرافق الصحية؟", category: "Hospitality", priority: "High", createdAt: now },
      { id: 2, templateId: 1, text: "كيف تقيم سرعة استجابة التمريض لطلباتك؟", category: "Nursing", priority: "High", createdAt: now },
      { id: 3, templateId: 1, text: "هل شعرت بالوضوح في شرح الطبيب لخطة العلاج الخاصة بك؟", category: "Medical", priority: "High", createdAt: now },
      { id: 4, templateId: 1, text: "كيف تقيم جودة وتنوع الوجبات الغذائية المقدمة؟", category: "Hospitality", priority: "Medium", createdAt: now },
      { id: 5, templateId: 1, text: "كيف كانت معاملة موظفي المداخل والأمن ومساعدتكم؟", category: "Security", priority: "Low", createdAt: now },
      { id: 6, templateId: 2, text: "كيف تقيم سهولة وسرعة حجز موعد العيادة؟", category: "Medical", priority: "Medium", createdAt: now },
      { id: 7, templateId: 2, text: "ما مدى رضاك عن وقت الانتظار قبل الدخول للطبيب؟", category: "Medical", priority: "High", createdAt: now },
      { id: 8, templateId: 2, text: "كيف كانت معاملة التمريض المساعد داخل العيادة؟", category: "Nursing", priority: "High", createdAt: now },
      { id: 9, templateId: 2, text: "كيف تقيم نظافة ممرات العيادات الخارجية وصالات الانتظار؟", category: "Hospitality", priority: "Low", createdAt: now },
      { id: 10, templateId: 2, text: "كيف كانت كفاءة وسهولة صرف وصفتك الطبية من الصيدلية؟", category: "Hospitality", priority: "Medium", createdAt: now },
    ],
    surveys: [
      { id: 1, agentId: 3, agentName: "خالد العتيبي (موظف علاقات)", patientName: "محمد عبد الله القحطاني", medicalNumber: "MRN-45821", roomNumber: "غرفة 402-A", phoneNumber: "966501112222", doctorName: "د. أحمد الشريف", enterDate: "2026-06-01T10:00:00.000Z", interviewType: "In Person", clinicType: "In-Patient", isSatisfied: false, recommend: "No", createdAt: "2026-06-01T10:30:00.000Z" },
      { id: 2, agentId: 3, agentName: "خالد العتيبي (موظف علاقات)", patientName: "سارة يوسف التميمي", medicalNumber: "MRN-45902", roomNumber: "غرفة 305", phoneNumber: "966552223333", doctorName: "د. ليلى فهد", enterDate: "2026-06-02T11:00:00.000Z", interviewType: "Call", clinicType: "In-Patient", isSatisfied: false, recommend: "No", createdAt: "2026-06-02T11:45:00.000Z" },
      { id: 3, agentId: 3, agentName: "خالد العتيبي (موظف علاقات)", patientName: "أحمد محمد العتيبي", medicalNumber: "MRN-88294", roomNumber: "غرفة 402", phoneNumber: "966504445555", doctorName: "د. خالد حسن", enterDate: "2026-06-03T14:00:00.000Z", interviewType: "Call", clinicType: "Out-Patient", isSatisfied: true, recommend: "Yes", createdAt: "2026-06-03T14:15:00.000Z" },
      { id: 4, agentId: 3, agentName: "خالد العتيبي (موظف علاقات)", patientName: "سارة فهد الدوسري", medicalNumber: "MRN-77301", roomNumber: "عيادة باطنية - 12", phoneNumber: "966555556666", doctorName: "د. ليلى فهد", enterDate: "2026-06-03T15:00:00.000Z", interviewType: "In Person", clinicType: "Out-Patient", isSatisfied: true, recommend: "Yes", createdAt: "2026-06-03T15:20:00.000Z" },
      { id: 5, agentId: 3, agentName: "خالد العتيبي (موظف علاقات)", patientName: "خالد عبد الله الزهراني", medicalNumber: "MRN-12093", roomNumber: "الجناح الشرقي - 105", phoneNumber: "966547778888", doctorName: "د. خالد حسن", enterDate: "2026-06-04T08:00:00.000Z", interviewType: "In Person", clinicType: "In-Patient", isSatisfied: false, recommend: "No", createdAt: "2026-06-04T08:40:00.000Z" },
      { id: 6, agentId: 3, agentName: "خالد العتيبي (موظف علاقات)", patientName: "فيصل منصور الحربي", medicalNumber: "MRN-44912", roomNumber: "وحدة سحب الدم", phoneNumber: "966568889999", doctorName: "د. سمير زهران", enterDate: "2026-06-04T09:00:00.000Z", interviewType: "Call", clinicType: "Out-Patient", isSatisfied: true, recommend: "Yes", createdAt: "2026-06-04T09:30:00.000Z" },
    ],
    answers: [
      { id: 1, surveyId: 1, questionId: 1, score: 2 },
      { id: 2, surveyId: 1, questionId: 2, score: 2 },
      { id: 3, surveyId: 1, questionId: 3, score: 3 },
      { id: 4, surveyId: 1, questionId: 4, score: 2 },
      { id: 5, surveyId: 1, questionId: 5, score: 3 },
      { id: 6, surveyId: 2, questionId: 1, score: 1 },
      { id: 7, surveyId: 2, questionId: 2, score: 2 },
      { id: 8, surveyId: 2, questionId: 3, score: 3 },
      { id: 9, surveyId: 2, questionId: 4, score: 2 },
      { id: 10, surveyId: 2, questionId: 5, score: 1 },
      { id: 11, surveyId: 3, questionId: 6, score: 5 },
      { id: 12, surveyId: 3, questionId: 7, score: 4 },
      { id: 13, surveyId: 3, questionId: 8, score: 4 },
      { id: 14, surveyId: 3, questionId: 9, score: 5 },
      { id: 15, surveyId: 3, questionId: 10, score: 5 },
      { id: 16, surveyId: 4, questionId: 6, score: 4 },
      { id: 17, surveyId: 4, questionId: 7, score: 4 },
      { id: 18, surveyId: 4, questionId: 8, score: 5 },
      { id: 19, surveyId: 4, questionId: 9, score: 4 },
      { id: 20, surveyId: 4, questionId: 10, score: 4 },
      { id: 21, surveyId: 5, questionId: 1, score: 2 },
      { id: 22, surveyId: 5, questionId: 2, score: 2 },
      { id: 23, surveyId: 5, questionId: 3, score: 2 },
      { id: 24, surveyId: 5, questionId: 4, score: 1 },
      { id: 25, surveyId: 5, questionId: 5, score: 3 },
      { id: 26, surveyId: 6, questionId: 6, score: 5 },
      { id: 27, surveyId: 6, questionId: 7, score: 5 },
      { id: 28, surveyId: 6, questionId: 8, score: 5 },
      { id: 29, surveyId: 6, questionId: 9, score: 4 },
      { id: 30, surveyId: 6, questionId: 10, score: 5 },
    ],
    whatsappLogs: [],
  };
}

/** Migration: legacy seed stored plaintext passwords ("123"). Rehash them on
 * load so first-time starts produce real bcrypt hashes. */
export function migrateLegacyPasswords(): void {
  const data = getDB();
  let changed = false;
  for (const u of data.users) {
    if (!u.password.startsWith("$2a$") && !u.password.startsWith("$2b$") && !u.password.startsWith("$2y$")) {
      u.password = bcrypt.hashSync(u.password, 12);
      changed = true;
    }
  }
  if (changed) {
    saveDB(data);
    logger.info("Migrated legacy plaintext password hashes to bcrypt");
  }
}

/** Hash a plaintext password using bcrypt (cost factor 12). */
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 12);
}

/** Constant-time bcrypt compare. Returns true on match. */
export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

