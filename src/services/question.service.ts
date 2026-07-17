import { get, post, del } from "./api-client";
import type { Question } from "../types";

export const questionService = {
  list() {
    return get<Question[]>("/api/questions");
  },

  create(q: Omit<Question, "id" | "createdAt">) {
    return post<Question>("/api/questions", q);
  },

  delete(id: number) {
    return del<{ message: string }>(`/api/questions/${id}`);
  },
};
