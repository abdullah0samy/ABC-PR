import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Question } from "../types";
import { questionService } from "../services/question.service";

const QUESTIONS_KEY = ["questions"] as const;

export function useQuestions() {
  return useQuery({
    queryKey: QUESTIONS_KEY,
    queryFn: () => questionService.list(),
    staleTime: 30_000,
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (q: Omit<Question, "id" | "createdAt">) => questionService.create(q),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUESTIONS_KEY });
    },
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => questionService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUESTIONS_KEY });
    },
  });
}
