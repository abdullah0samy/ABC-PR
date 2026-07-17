export interface User {
  id: number;
  name: string;
  username: string;
  role: "Admin" | "Manager" | "Agent";
  createdAt: string;
}

export interface Template {
  id: number;
  title: "In-Patient" | "Out-Patient";
  isActive: boolean;
  createdAt: string;
}

export interface Question {
  id: number;
  templateId: number;
  text: string;
  category: "Medical" | "Nursing" | "Hospitality" | "Security";
  priority: "High" | "Medium" | "Low";
  createdAt: string;
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

export interface WhatsappLog {
  id: string;
  phoneNumber: string;
  message: string;
  sentAt: string;
  medicalNumber: string;
  status: "مرسلة" | "مستلمة" | "تمت القراءة";
  webhookEvent?: string;
  webhookUpdatedAt?: string;
  webhookRawPayload?: string;
}

export interface DetailedAnswer {
  id: number;
  questionId: number;
  questionText: string;
  category: string;
  priority: "High" | "Medium" | "Low" | string;
  score: number;
}

export interface SurveyWithDetail {
  survey: Survey;
  answers: DetailedAnswer[];
}

/** Computed at read time from a survey's Answer[] scores (0-100%). */
export interface SurveyWithSatisfaction extends Survey {
  satisfactionPercentage: number;
}

export interface Category {
  id: number;
  nameEnglish: string;
  nameArabic: string;
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
