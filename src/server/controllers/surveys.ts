import { Router } from "express";
import { pool } from "../db/pool";
import { validate } from "../middleware/validate";
import { requireManagerOrAdmin, requireAnyAuthenticated } from "../middleware/auth";
import { createSurveySchema, updateSurveySchema, archiveQuerySchema, followupSchema } from "../schemas";
import { triggerWhatsAppApology } from "../utils/whatsapp";
import { computeSatisfactionPercentage } from "../utils/satisfaction";
import { surveyRepo, userRepo, answerRepo } from "../repositories";
import type { Answer } from "../types";

export const surveysRouter = Router();

surveysRouter.use(requireAnyAuthenticated);

// ----- Archive (must precede "/:id") -----
surveysRouter.get("/archive", validate({ query: archiveQuerySchema }), async (req, res) => {
  const { clinicType, interviewType, satisfaction, search, startDate, endDate, page, limit } =
    req.query as unknown as {
      clinicType?: string;
      interviewType?: string;
      satisfaction?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      page: number;
      limit: number;
    };

  const result = await surveyRepo.archive({
    clinicType, interviewType, satisfaction, search, startDate, endDate, page, limit,
  });

  res.json(result);
});

// ----- Create survey -----
surveysRouter.post("/", validate({ body: createSurveySchema }), async (req, res) => {
  const body = req.body;
  const auth = req.auth!;

  let agentId = body.agentId;
  if (auth.role !== "Admin") {
    agentId = auth.uid;
  }

  const agent = await userRepo.findById(agentId);
  if (!agent) {
    res.status(400).json({ error: "موظف غير مسجل. يرجى تحديد موظف صحيح." });
    return;
  }

  const barePhone = String(body.phoneNumber).replace(/[^0-9]/g, "");
  const phoneBody = body.phoneCountryCode ? `${body.phoneCountryCode}${barePhone}` : barePhone;

  const enterDate = body.enterDate ? new Date(body.enterDate).toISOString() : new Date().toISOString();

  // Use a transaction to create survey + answers atomically
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert survey
    const surveyRes = await client.query(
      `INSERT INTO surveys (agent_id, agent_name, patient_name, medical_number,
         room_number, phone_number, doctor_name, enter_date,
         interview_type, clinic_type, is_satisfied, recommend)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        agentId, agent.name, body.patientName, body.medicalNumber,
        body.roomNumber ?? "غير محدد", phoneBody, body.doctorName, enterDate,
        body.interviewType, body.clinicType, body.isSatisfied, body.recommend,
      ],
    );
    const newSurveyRow = surveyRes.rows[0];

    // Insert answers
    const createdAnswers: Answer[] = [];
    for (const ans of body.answers) {
      const ansRes = await client.query(
        `INSERT INTO answers (survey_id, question_id, score)
         VALUES ($1, $2, $3) RETURNING *`,
        [newSurveyRow.id, ans.questionId, ans.score],
      );
      const r = ansRes.rows[0];
      createdAnswers.push({
        id: r.id,
        surveyId: r.survey_id,
        questionId: r.question_id,
        score: r.score,
      });
    }

    await client.query("COMMIT");

    // Build response
    const newSurvey = {
      id: newSurveyRow.id as number,
      agentId: newSurveyRow.agent_id as number,
      agentName: newSurveyRow.agent_name as string,
      patientName: newSurveyRow.patient_name as string,
      medicalNumber: newSurveyRow.medical_number as string,
      roomNumber: newSurveyRow.room_number as string,
      phoneNumber: newSurveyRow.phone_number as string,
      doctorName: newSurveyRow.doctor_name as string,
      enterDate: (newSurveyRow.enter_date as Date).toISOString(),
      interviewType: newSurveyRow.interview_type as "Call" | "In Person",
      clinicType: newSurveyRow.clinic_type as "In-Patient" | "Out-Patient",
      isSatisfied: newSurveyRow.is_satisfied as boolean,
      recommend: newSurveyRow.recommend as "Yes" | "No",
      createdAt: (newSurveyRow.created_at as Date).toISOString(),
    };

    if (!newSurvey.isSatisfied || newSurvey.recommend === "No") {
      void triggerWhatsAppApology(newSurvey as any);
    }

    res.status(201).json({
      message: "تم حفظ التقييم بنجاح وإرسال التنبيهات اللازمة.",
      survey: { ...newSurvey, satisfactionPercentage: computeSatisfactionPercentage(createdAnswers) },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// ----- Single survey detail -----
surveysRouter.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const result = await surveyRepo.detail(id);
  if (!result) {
    res.status(404).json({ error: "لم يتم العثور على التقييم المطلوب." });
    return;
  }

  res.json(result);
});

// ----- Update survey (PUT) -----
surveysRouter.put("/:id", validate({ body: updateSurveySchema }), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const existing = await surveyRepo.findById(id);
  if (!existing) {
    res.status(404).json({ error: "الاستبيان غير موجود." });
    return;
  }

  const updates = req.body;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "لا توجد حقول صالحة للتحديث." });
    return;
  }

  // Remap country code into phoneNumber
  if (updates.phoneCountryCode && updates.phoneNumber) {
    const bare = String(updates.phoneNumber).replace(/[^0-9]/g, "");
    updates.phoneNumber = `${updates.phoneCountryCode}${bare}`;
    delete updates.phoneCountryCode;
  }

  // Preserve identity fields
  delete updates.id;
  delete updates.createdAt;
  delete updates.agentId;
  delete updates.agentName;

  const updated = await surveyRepo.update(id, updates);
  if (!updated) {
    res.status(404).json({ error: "الاستبيان غير موجود." });
    return;
  }

  // Ensure preserved fields
  updated.agentId = existing.agentId;
  updated.agentName = existing.agentName;
  updated.id = existing.id;
  updated.createdAt = existing.createdAt;

  res.json({ message: "تم تحديث الاستبيان بنجاح.", survey: updated });
});

// ----- Delete survey -----
surveysRouter.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM answers WHERE survey_id = $1", [id]);
    await client.query("DELETE FROM surveys WHERE id = $1", [id]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  res.json({ message: "تم حذف الاستبيان بنجاح." });
});

// ----- Follow-up -----
surveysRouter.post("/:id/followup", requireManagerOrAdmin, validate({ body: followupSchema }), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const existing = await surveyRepo.findById(id);
  if (!existing) {
    res.status(404).json({ error: "لم يتم العثور على التقييم المطلوب لمتابعته." });
    return;
  }

  const updated = await surveyRepo.update(id, {
    followupStatus: req.body.followupStatus,
    reminderText: req.body.reminderText,
  });

  res.json({ message: "تمت تحديث حالة المتابعة والتذكير بنجاح.", survey: updated });
});
