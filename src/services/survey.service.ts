import { get, post, put, del } from "./api-client";
import type { Survey, SurveyWithSatisfaction, SurveyWithDetail } from "../types";

export interface ArchiveParams {
  search?: string;
  clinicType?: string;
  interviewType?: string;
  satisfaction?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ArchiveResult {
  surveys: SurveyWithSatisfaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
}

export const surveyService = {
  create(payload: Record<string, unknown>) {
    return post<{ message: string; survey: Survey }>("/api/surveys", payload);
  },

  update(id: number, updates: Partial<Survey>) {
    return put<{ message: string; survey: Survey }>(`/api/surveys/${id}`, updates);
  },

  delete(id: number) {
    return del<{ message: string }>(`/api/surveys/${id}`);
  },

  detail(id: number) {
    return get<SurveyWithDetail>(`/api/surveys/${id}`);
  },

  archive(params: ArchiveParams) {
    return get<ArchiveResult>("/api/surveys/archive", { params: params as Record<string, string | number | boolean | undefined | null> });
  },

  followup(id: number, followupStatus: string, reminderText: string) {
    return post<{ message: string; survey: Survey }>(`/api/surveys/${id}/followup`, { followupStatus, reminderText });
  },
};
