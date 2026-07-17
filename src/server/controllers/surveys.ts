import { Router } from "express";
import { getDB, saveDB, flushDBWrites } from "../utils/db";
import { validate } from "../middleware/validate";
import { requireManagerOrAdmin, requireAnyAuthenticated } from "../middleware/auth";
import { createSurveySchema, updateSurveySchema, archiveQuerySchema, followupSchema } from "../schemas";
import { triggerWhatsAppApology } from "../utils/whatsapp";
import { computeSatisfactionPercentage } from "../utils/satisfaction";
import type { Answer, Survey } from "../types";

export const surveysRouter = Router();

// Apply authentication to all survey routes by default.
surveysRouter.use(requireAnyAuthenticated);

// ----- Archive (must precede "/:id") -----
surveysRouter.get("/archive", validate({ query: archiveQuerySchema }), (req, res) => {
  const db = getDB();
  const { clinicType, interviewType, satisfaction, search, startDate, endDate, page, limit } =
    req.query as unknown as { clinicType?: string; interviewType?: string; satisfaction?: string; search?: string; startDate?: string; endDate?: string; page: number; limit: number };

  let filtered = [...db.surveys];
  if (clinicType && clinicType !== "جميع العيادات" && clinicType !== "الكل") {
    filtered = filtered.filter((s) => s.clinicType === clinicType);
  }
  if (interviewType && interviewType !== "الكل" && interviewType !== "جميع المقابلات") {
    filtered = filtered.filter((s) => s.interviewType === interviewType);
  }
  if (satisfaction && satisfaction !== "الكل") {
    if (["Satisfied", "راضٍ", "راضٍ جداً"].includes(satisfaction)) {
      filtered = filtered.filter((s) => s.isSatisfied === true);
    } else if (["Unsatisfied", "غير راضٍ", "مستاء"].includes(satisfaction)) {
      filtered = filtered.filter((s) => s.isSatisfied === false);
    }
  }
  if (search && typeof search === "string" && search.trim() !== "") {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.patientName.toLowerCase().includes(q) ||
        s.medicalNumber.toLowerCase().includes(q) ||
        s.doctorName.toLowerCase().includes(q) ||
        s.phoneNumber.toLowerCase().includes(q),
    );
  }
  if (startDate) filtered = filtered.filter((s) => new Date(s.createdAt) >= new Date(startDate));
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter((s) => new Date(s.createdAt) <= end);
  }

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * limit, safePage * limit);

  const augmented = paginated.map((s) => {
    const ans = db.answers.filter((a) => a.surveyId === s.id);
    return { ...s, satisfactionPercentage: computeSatisfactionPercentage(ans) };
  });

  res.json({
    surveys: augmented,
    pagination: { currentPage: safePage, totalPages, totalCount, limit },
  });
});

// ----- Create survey -----
surveysRouter.post("/", validate({ body: createSurveySchema }), async (req, res) => {
  const body = req.body;
  const db = getDB();

  // The agentId MUST be the authenticated user unless they are admin (admins
  // can attribute on behalf). Fixes attribution spoofing (#3).
  const auth = req.auth!;
  let agentId = body.agentId;
  if (auth.role !== "Admin") {
    agentId = auth.uid; // force attribution to the caller
  }
  const agent = db.users.find((u) => u.id === agentId);
  if (!agent) {
    res.status(400).json({ error: "موظف غير مسجل. يرجى تحديد موظف صحيح." });
    return;
  }

  // Compose international phone number when country code present (#8 fix).
  const barePhone = String(body.phoneNumber).replace(/[^0-9]/g, "");
  const phoneBody = body.phoneCountryCode ? `${body.phoneCountryCode}${barePhone}` : barePhone;

  const newSurveyId = db.surveys.length ? Math.max(...db.surveys.map((s) => s.id)) + 1 : 1;
  const newSurvey: Survey = {
    id: newSurveyId,
    agentId,
    agentName: agent.name,
    patientName: body.patientName,
    medicalNumber: body.medicalNumber,
    roomNumber: body.roomNumber ?? "غير محدد",
    phoneNumber: phoneBody,
    doctorName: body.doctorName,
    enterDate: body.enterDate ? new Date(body.enterDate).toISOString() : new Date().toISOString(),
    interviewType: body.interviewType,
    clinicType: body.clinicType,
    isSatisfied: body.isSatisfied,
    recommend: body.recommend,
    createdAt: new Date().toISOString(),
  };

  const baseAnswerId = db.answers.length ? Math.max(...db.answers.map((a) => a.id)) + 1 : 1;
  const answers: Answer[] = body.answers.map((ans, i) => ({
    id: baseAnswerId + i,
    surveyId: newSurveyId,
    questionId: ans.questionId,
    score: ans.score,
  }));

  // Atomic-ish write sequence: mutate in-memory then persist once.
  db.surveys.unshift(newSurvey);
  db.answers.push(...answers);
  saveDB(db);
  await flushDBWrites();

  if (!newSurvey.isSatisfied || newSurvey.recommend === "No") {
    void triggerWhatsAppApology(newSurvey);
  }

  res.status(201).json({
    message: "تم حفظ التقييم بنجاح وإرسال التنبيهات اللازمة.",
    survey: { ...newSurvey, satisfactionPercentage: computeSatisfactionPercentage(answers) },
  });
});

// ----- Single survey detail (with computed satisfaction %, N+1 fixed) -----
surveysRouter.get("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const db = getDB();
  const survey = db.surveys.find((s) => s.id === id);
  if (!survey) {
    res.status(404).json({ error: "لم يتم العثور على التقييم المطلوب." });
    return;
  }
  // Build a per-question lookup once — eliminates O(A×Q) N+1 join.
  const questionById = new Map(db.questions.map((q) => [q.id, q]));
  const surveyAnswers = db.answers.filter((a) => a.surveyId === id);
  const detailedAnswers = surveyAnswers.map((ans) => {
    const q = questionById.get(ans.questionId);
    return {
      id: ans.id,
      questionId: ans.questionId,
      questionText: q ? q.text : "سؤال مجهول",
      category: q ? q.category : "أخرى",
      priority: q ? q.priority : "Medium",
      score: ans.score,
    };
  });
  res.json({
    survey: { ...survey, satisfactionPercentage: computeSatisfactionPercentage(surveyAnswers) },
    answers: detailedAnswers,
  });
});

// ----- Update survey (PUT) — fixed mass-assignment (#4) via allowlist schema -----
surveysRouter.put("/:id", validate({ body: updateSurveySchema }), (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const db = getDB();
  const idx = db.surveys.findIndex((s) => s.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "الاستبيان غير موجود." });
    return;
  }
  const updates = req.body;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "لا توجد حقول صالحة للتحديث." });
    return;
  }
  // Remap country code into phoneNumber remap when both provided.
  if (updates.phoneCountryCode && updates.phoneNumber) {
    const bare = String(updates.phoneNumber).replace(/[^0-9]/g, "");
    updates.phoneNumber = `${updates.phoneCountryCode}${bare}`;
    delete updates.phoneCountryCode;
  }
  // Preserve identity-critical fields from being overwritten.
  const updated: Survey = {
    ...db.surveys[idx],
    ...updates,
    id: db.surveys[idx].id,
    createdAt: db.surveys[idx].createdAt,
    agentId: db.surveys[idx].agentId,
    agentName: db.surveys[idx].agentName,
  };
  db.surveys[idx] = updated;
  saveDB(db);
  res.json({ message: "تم تحديث الاستبيان بنجاح.", survey: updated });
});

// ----- Delete survey -----
surveysRouter.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const db = getDB();
  db.surveys = db.surveys.filter((s) => s.id !== id);
  db.answers = db.answers.filter((a) => a.surveyId !== id);
  saveDB(db);
  res.json({ message: "تم حذف الاستبيان بنجاح." });
});

// ----- Follow-up — manager/admin only (was open #7 vector) -----
surveysRouter.post("/:id/followup", requireManagerOrAdmin, validate({ body: followupSchema }), (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const db = getDB();
  const survey = db.surveys.find((s) => s.id === id);
  if (!survey) {
    res.status(404).json({ error: "لم يتم العثور على التقييم المطلوب لمتابعته." });
    return;
  }
  survey.followupStatus = req.body.followupStatus;
  survey.reminderText = req.body.reminderText;
  saveDB(db);
  res.json({ message: "تمت تحديث حالة المتابعة والتذكير بنجاح.", survey });
});
