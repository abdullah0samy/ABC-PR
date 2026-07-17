import { get, post, del } from "./api-client";
import type { Category } from "../types";

export const categoryService = {
  list() {
    return get<Category[]>("/api/categories");
  },

  create(nameEnglish: string, nameArabic: string) {
    return post<Category>("/api/categories", { nameEnglish, nameArabic });
  },

  delete(id: number) {
    return del<{ message: string }>(`/api/categories/${id}`);
  },
};
