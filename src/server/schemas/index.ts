import { z } from "zod";

const role = z.enum(["Admin", "Manager", "Agent"]);
const clinicType = z.enum(["In-Patient", "Out-Patient"]);
const interviewType = z.enum(["Call", "In Person"]);
const recommend = z.enum(["Yes", "No"]);
const questionCategory = z.enum(["Medical", "Nursing", "Hospitality", "Security"]);
const questionPriority = z.enum(["High", "Medium", "Low"]);
const whatsappStatus = z.enum(["مرسلة", "مستلمة", "تمت القراءة"]);
const followupStatus = z.enum(["تم الحل", "قيد العمل"]);

export const loginSchema = z.object({
  username: z.string().trim().min(3, "اسم المستخدم مطلوب").max(64),
  password: z.string().min(1).max(256),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  username: z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9_.@-]+$/, "اسم المستخدم يحتوي خانة غير مسموحة"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").max(256),
  role,
});

export const createQuestionSchema = z.object({
  templateId: z.number().int().positive(),
  text: z.string().trim().min(2, "نص السؤال مطلوب").max(1000),
  category: questionCategory,
  priority: questionPriority,
});

const answerInput = z.object({
  questionId: z.number().int().positive(),
  score: z.number().int().min(1).max(5),
});

export const createSurveySchema = z.object({
  agentId: z.number().int().positive(),
  patientName: z.string().trim().min(1).max(200),
  medicalNumber: z.string().trim().min(1).max(120),
  roomNumber: z.string().trim().max(60).optional().default("غير محدد"),
  phoneNumber: z.string().trim().min(5).max(32),
  // Optional country dialing code prefix (sent by the client).
  phoneCountryCode: z.string().trim().min(1).max(8).optional(),
  doctorName: z.string().trim().min(1).max(200),
  enterDate: z.string().trim().optional(),
  interviewType,
  clinicType,
  isSatisfied: z.boolean(),
  recommend,
  answers: z.array(answerInput).min(1, "يجب تسجيل إجابة واحدة على الأقل"),
});

/** Explicit allowlist for survey updates — fixes mass-assignment #4. */
export const updateSurveySchema = z.object({
  patientName: z.string().trim().min(1).max(200).optional(),
  medicalNumber: z.string().trim().min(1).max(120).optional(),
  roomNumber: z.string().trim().max(60).optional(),
  phoneNumber: z.string().trim().min(5).max(32).optional(),
  phoneCountryCode: z.string().trim().min(1).max(8).optional(),
  doctorName: z.string().trim().min(1).max(200).optional(),
  interviewType: interviewType.optional(),
  clinicType: clinicType.optional(),
  isSatisfied: z.boolean().optional(),
  recommend: recommend.optional(),
  followupStatus: followupStatus.optional(),
  reminderText: z.string().trim().max(2000).optional(),
});

export const createCategorySchema = z.object({
  nameArabic: z.string().trim().min(1).max(120),
  nameEnglish: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9 -]+$/, "الاسم الإنجليزي يجب أن يكون حروف/أرقام"),
});

export const followupSchema = z.object({
  followupStatus,
  reminderText: z.string().trim().max(2000).optional().default(""),
});

export const simulateWebhookSchema = z.object({
  logId: z.string().trim().min(1).max(120),
  status: whatsappStatus,
});

export const archiveQuerySchema = z.object({
  clinicType: z.string().optional(),
  interviewType: z.string().optional(),
  satisfaction: z.string().optional(),
  search: z.string().max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export const analyticsQuerySchema = z.object({
  clinicType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type FollowupInput = z.infer<typeof followupSchema>;
export type SimulateWebhookInput = z.infer<typeof simulateWebhookSchema>;
export type ArchiveQueryInput = z.infer<typeof archiveQuerySchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
