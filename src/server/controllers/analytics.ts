import { Router } from "express";
import { getDB } from "../utils/db";
import { validate } from "../middleware/validate";
import { requireAnyAuthenticated } from "../middleware/auth";
import { analyticsQuerySchema } from "../schemas";
import { DEFAULT_CATEGORIES } from "./categories";
import type { Analytics, DepartmentStat } from "../types";

export const analyticsRouter = Router();

analyticsRouter.get("/", requireAnyAuthenticated, validate({ query: analyticsQuerySchema }), (req, res) => {
  const db = getDB();
  const { clinicType, startDate, endDate } = req.query as unknown as {
    clinicType?: string;
    startDate?: string;
    endDate?: string;
  };
  let targetSurveys = [...db.surveys];

  if (clinicType && clinicType !== "جميع العيادات" && clinicType !== "الكل") {
    targetSurveys = targetSurveys.filter((s) => s.clinicType === clinicType);
  }
  if (startDate) {
    targetSurveys = targetSurveys.filter((s) => new Date(s.createdAt) >= new Date(startDate));
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    targetSurveys = targetSurveys.filter((s) => new Date(s.createdAt) <= end);
  }

  const total = targetSurveys.length;
  const satisfiedCount = targetSurveys.filter((s) => s.isSatisfied).length;
  const overallSatisfactionPercent = total ? Math.round((satisfiedCount / total) * 100) : 0;

  const activeCategories = db.categories?.length ? db.categories : DEFAULT_CATEGORIES;
  // Index categories by lowercased name for O(1) lookup.
  const categoryByName = new Map(activeCategories.map((c) => [c.nameEnglish.toLowerCase(), c]));

  // Build per-question index once (avoids O(C×Q) scans per category).
  const questionsByCategory = new Map<string, number[]>();
  for (const q of db.questions) {
    const key = q.category.toLowerCase();
    const ids = questionsByCategory.get(key) ?? [];
    ids.push(q.id);
    questionsByCategory.set(key, ids);
  }
  const targetSurveyIdSet = new Set(targetSurveys.map((s) => s.id));

  // Pre-filter answers to those of the target surveys once.
  const targetAnswers = db.answers.filter((a) => targetSurveyIdSet.has(a.surveyId));

  const departmentStats: DepartmentStat[] = activeCategories.map((c) => {
    const catKey = c.nameEnglish.toLowerCase();
    const qIds = new Set(questionsByCategory.get(catKey) ?? []);
    const relevantAnswers = targetAnswers.filter((a) => qIds.has(a.questionId));
    const count = relevantAnswers.length;
    const totalScore = relevantAnswers.reduce((sum, a) => sum + a.score, 0);
    const averageScore = count ? parseFloat((totalScore / count).toFixed(2)) : 0;
    const averagePercent = count ? Math.round((totalScore / (count * 5)) * 100) : 0;
    return {
      category: c.nameEnglish,
      titleArabic: categoryByName.get(catKey)?.nameArabic ?? c.nameEnglish,
      averageScore,
      averagePercent,
      totalAnswersCount: count,
    };
  });

  const criticalCases = targetSurveys
    .filter((s) => !s.isSatisfied)
    .map((s) => ({
      id: s.id,
      medicalNumber: s.medicalNumber,
      patientName: s.patientName,
      doctorName: s.doctorName,
      enterDate: s.enterDate,
      recommend: s.recommend,
      createdAt: s.createdAt,
      followupStatus: s.followupStatus ?? "قيد العمل",
      reminderText: s.reminderText ?? "",
    }));

  const payload: Analytics = {
    overallSatisfactionPercent,
    satisfiedCount,
    unsatisfiedCount: total - satisfiedCount,
    totalSurveys: total,
    departmentStats,
    criticalCases,
  };
  res.json(payload);
});
