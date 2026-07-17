import { Router } from "express";
import { validate } from "../middleware/validate";
import { requireAnyAuthenticated, requireAdmin } from "../middleware/auth";
import { createQuestionSchema } from "../schemas";
import { templateRepo, questionRepo } from "../repositories";

export const templatesRouter = Router();
export const questionsRouter = Router();

templatesRouter.get("/", requireAnyAuthenticated, async (_req, res) => {
  const templates = await templateRepo.listAll();
  res.json(templates);
});

questionsRouter.get("/", requireAnyAuthenticated, async (_req, res) => {
  const questions = await questionRepo.listAll();
  res.json(questions);
});

questionsRouter.post("/", requireAdmin, validate({ body: createQuestionSchema }), async (req, res) => {
  const { templateId, text, category, priority } = req.body;
  const template = await templateRepo.findById(templateId);
  if (!template) {
    res.status(400).json({ error: "رقم القالب غير صحيح." });
    return;
  }
  const newQuestion = await questionRepo.create({ templateId, text, category, priority });
  res.status(201).json(newQuestion);
});

questionsRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  await questionRepo.deleteById(id);
  res.json({ message: "تم حذف السؤال بنجاح." });
});
