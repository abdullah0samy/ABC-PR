import { Router } from "express";
import { getDB, saveDB } from "../utils/db";
import { validate } from "../middleware/validate";
import { requireAnyAuthenticated, requireAdmin } from "../middleware/auth";
import { createQuestionSchema } from "../schemas";
import type { Question } from "../types";

export const templatesRouter = Router();
export const questionsRouter = Router();

templatesRouter.get("/", requireAnyAuthenticated, (_req, res) => {
  res.json(getDB().templates);
});

questionsRouter.get("/", requireAnyAuthenticated, (_req, res) => {
  res.json(getDB().questions);
});

questionsRouter.post("/", requireAdmin, validate({ body: createQuestionSchema }), (req, res) => {
  const { templateId, text, category, priority } = req.body;
  const db = getDB();
  if (!db.templates.some((t) => t.id === templateId)) {
    res.status(400).json({ error: "رقم القالب غير صحيح." });
    return;
  }
  const newQuestion: Question = {
    id: db.questions.length ? Math.max(...db.questions.map((q) => q.id)) + 1 : 1,
    templateId,
    text,
    category,
    priority,
    createdAt: new Date().toISOString(),
  };
  db.questions.push(newQuestion);
  saveDB(db);
  res.status(201).json(newQuestion);
});

questionsRouter.delete("/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const db = getDB();
  db.questions = db.questions.filter((q) => q.id !== id);
  saveDB(db);
  res.json({ message: "تم حذف السؤال بنجاح." });
});
