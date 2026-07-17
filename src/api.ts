// Thin fetch wrapper that attaches the JWT auth token to every request and
// throws on non-2xx so callers can rely on try/catch for error handling.
// Also provides typed getters for the API surface used by App.tsx.

import type {
  Analytics,
  Category,
  Question,
  Survey,
  SurveyWithSatisfaction,
  SurveyWithDetail,
  WhatsappLog,
  User,
  Template,
} from "./types";

const TOKEN_KEY = "nuzul_pr_token";
const USER_KEY = "nuzul_pr_user";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    // Corrupt storage — clear it so the next sign-in is clean (audit #37).
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

export function persistSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "";

export async function apiFetch<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers ?? {});
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const url = typeof input === "string" ? `${API_BASE}${input}` : input;
  const res = await fetch(url, { ...init, headers });
  let data: any = null;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }
  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

// Typed endpoint helpers used across the SPA.
export const api = {
  login: (username: string, password: string) =>
    apiFetch<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  listUsers: () => apiFetch<User[]>("/api/users"),
  listTemplates: () => apiFetch<Template[]>("/api/templates"),
  listQuestions: () => apiFetch<Question[]>("/api/questions"),
  createQuestion: (q: Omit<Question, "id" | "createdAt">) =>
    apiFetch<Question>("/api/questions", { method: "POST", body: JSON.stringify(q) }),
  deleteQuestion: (id: number) =>
    apiFetch<{ message: string }>(`/api/questions/${id}`, { method: "DELETE" }),
  listCategories: () => apiFetch<Category[]>("/api/categories"),
  createCategory: (nameEnglish: string, nameArabic: string) =>
    apiFetch<Category>("/api/categories", {
      method: "POST",
      body: JSON.stringify({ nameEnglish, nameArabic }),
    }),
  deleteCategory: (id: number) =>
    apiFetch<{ message: string }>(`/api/categories/${id}`, { method: "DELETE" }),
  createSurvey: (payload: any) =>
    apiFetch<{ message: string; survey: Survey }>("/api/surveys", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateSurvey: (id: number, updates: Partial<Survey>) =>
    apiFetch<{ message: string; survey: Survey }>(`/api/surveys/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  deleteSurvey: (id: number) =>
    apiFetch<{ message: string }>(`/api/surveys/${id}`, { method: "DELETE" }),
  followupSurvey: (id: number, followupStatus: string, reminderText: string) =>
    apiFetch<{ message: string; survey: Survey }>(`/api/surveys/${id}/followup`, {
      method: "POST",
      body: JSON.stringify({ followupStatus, reminderText }),
    }),
  surveyDetail: (id: number) => apiFetch<SurveyWithDetail>(`/api/surveys/${id}`),
  archive: (params: URLSearchParams) =>
    apiFetch<{ surveys: SurveyWithSatisfaction[]; pagination: { currentPage: number; totalPages: number; totalCount: number; limit: number } }>(
      `/api/surveys/archive?${params.toString()}`,
    ),
  analytics: (params: URLSearchParams) =>
    apiFetch<Analytics>(`/api/analytics?${params.toString()}`),
  whatsappLogs: () => apiFetch<WhatsappLog[]>("/api/whatsapp/logs"),
  simulateWebhook: (logId: string, status: "مرسلة" | "مستلمة" | "تمت القراءة") =>
    apiFetch<{ message: string; log: WhatsappLog }>(
      "/api/whatsapp/simulate-webhook",
      { method: "POST", body: JSON.stringify({ logId, status }) },
    ),
};
