// Shared domain types for the backend (also re-usable from build tooling).
// The frontend `src/types.ts` mirrors these independently; keep them in sync.

export type Role = "Admin" | "Manager" | "Agent";

export interface User {
  id: number;
  name: string;
  username: string;
  password: string; // bcrypt hash (server-only — never serialized to client)
  role: Role;
  createdAt: string;
}

/** Public projection of User (no password hash). */
export type PublicUser = Omit<User, "password">;

export interface Template {
  id: number;
  title: "In-Patient" | "Out-Patient";
  isActive: boolean;
  createdAt: string;
}

export type QuestionCategory = "Medical" | "Nursing" | "Hospitality" | "Security";
export type QuestionPriority = "High" | "Medium" | "Low";

export interface Question {
  id: number;
  templateId: number;
  text: string;
  category: QuestionCategory;
  priority: QuestionPriority;
  createdAt: string;
}

export type WhatsAppLogStatus = "مرسلة" | "مستلمة" | "تمت القراءة";

export interface WhatsappLog {
  id: string;
  phoneNumber: string;
  message: string;
  sentAt: string;
  medicalNumber: string;
  status: WhatsAppLogStatus;
  webhookEvent?: string;
  webhookUpdatedAt?: string;
  webhookRawPayload?: string;
}

export interface Survey {
  id: number;
  agentId: number;
  agentName: string;
  patientName: string;
  medicalNumber: string;
  roomNumber: string;
  phoneNumber: string;
  doctorName: string;
  enterDate: string;
  interviewType: "Call" | "In Person";
  clinicType: "In-Patient" | "Out-Patient";
  isSatisfied: boolean;
  recommend: "Yes" | "No";
  createdAt: string;
  followupStatus?: "تم الحل" | "قيد العمل";
  reminderText?: string;
}

export interface Answer {
  id: number;
  surveyId: number;
  questionId: number;
  score: number;
}

export interface Category {
  id: number;
  nameEnglish: string;
  nameArabic: string;
}

export interface DBData {
  users: User[];
  templates: Template[];
  questions: Question[];
  surveys: Survey[];
  answers: Answer[];
  whatsappLogs: WhatsappLog[];
  categories: Category[];
}

export interface DetailedAnswer {
  id: number;
  questionId: number;
  questionText: string;
  category: string;
  priority: string;
  score: number;
}

export interface SurveyWithDetail {
  survey: Survey;
  answers: DetailedAnswer[];
}

export interface DepartmentStat {
  category: string;
  titleArabic: string;
  averageScore: number;
  averagePercent: number;
  totalAnswersCount: number;
}

export interface Analytics {
  overallSatisfactionPercent: number;
  satisfiedCount: number;
  unsatisfiedCount: number;
  totalSurveys: number;
  departmentStats: DepartmentStat[];
  criticalCases: {
    id: number;
    medicalNumber: string;
    patientName: string;
    doctorName: string;
    enterDate: string;
    recommend: string;
    createdAt: string;
    followupStatus?: "تم الحل" | "قيد العمل";
    reminderText?: string;
  }[];
}

/** Augmented at read time so the Excel/PDF export can show satisfaction %. */
export interface SurveyWithSatisfaction extends Survey {
  satisfactionPercentage: number;
}
