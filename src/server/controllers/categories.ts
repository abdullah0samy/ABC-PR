import { Router } from "express";
import { getDB, saveDB } from "../utils/db";
import { validate } from "../middleware/validate";
import { requireAnyAuthenticated, requireAdmin } from "../middleware/auth";
import { createCategorySchema } from "../schemas";
import type { Category } from "../types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, nameEnglish: "Medical", nameArabic: "طبي" },
  { id: 2, nameEnglish: "Nursing", nameArabic: "تمريض" },
  { id: 3, nameEnglish: "Hospitality", nameArabic: "ضيافة" },
  { id: 4, nameEnglish: "Security", nameArabic: "أمن" },
];

export const categoriesRouter = Router();

categoriesRouter.get("/", requireAnyAuthenticated, (_req, res) => {
  const db = getDB();
  if (!db.categories || db.categories.length === 0) {
    db.categories = DEFAULT_CATEGORIES;
    saveDB(db);
  }
  res.json(db.categories);
});

categoriesRouter.post("/", requireAdmin, validate({ body: createCategorySchema }), (req, res) => {
  const { nameArabic, nameEnglish } = req.body;
  const db = getDB();
  if (!db.categories) db.categories = DEFAULT_CATEGORIES;
  if (db.categories.some((c) => c.nameEnglish.toLowerCase() === nameEnglish.toLowerCase())) {
    res.status(400).json({ error: "هذه الفئة مسجلة بالفعل بالاسم الإنجليزي المحدد." });
    return;
  }
  const newCategory: Category = {
    id: db.categories.length ? Math.max(...db.categories.map((c) => c.id)) + 1 : 1,
    nameEnglish,
    nameArabic,
  };
  db.categories.push(newCategory);
  saveDB(db);
  res.status(201).json(newCategory);
});

categoriesRouter.delete("/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const db = getDB();
  if (!db.categories) {
    res.status(404).json({ error: "لا توجد فئات لحذفها." });
    return;
  }
  db.categories = db.categories.filter((c) => c.id !== id);
  saveDB(db);
  res.json({ message: "تم حذف الفئة الإدارية بنجاح." });
});
