import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { surveyService } from "../services/survey.service";
import type { Survey } from "../types";

export const ARCHIVE_KEY = ["archive"] as const;

export function useArchive(params: Parameters<typeof surveyService.archive>[0]) {
  return useQuery({
    queryKey: [...ARCHIVE_KEY, params],
    queryFn: () => surveyService.archive(params),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useSurveyDetail(id: number | null) {
  return useQuery({
    queryKey: ["survey-detail", id],
    queryFn: () => surveyService.detail(id!),
    enabled: id !== null,
    staleTime: 30_000,
  });
}

export function useCreateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => surveyService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ARCHIVE_KEY });
    },
  });
}

export function useUpdateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Survey> }) =>
      surveyService.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ARCHIVE_KEY });
    },
  });
}

export function useDeleteSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => surveyService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ARCHIVE_KEY });
    },
  });
}

export function useFollowupSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, followupStatus, reminderText }: { id: number; followupStatus: string; reminderText: string }) =>
      surveyService.followup(id, followupStatus, reminderText),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ARCHIVE_KEY });
    },
  });
}
