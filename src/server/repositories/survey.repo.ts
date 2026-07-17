import { pool } from "../db/pool";
import type {
  Survey,
  SurveyWithSatisfaction,
  SurveyWithDetail,
  DetailedAnswer,
  DepartmentStat,
  Analytics,
} from "../types";
import { computeSatisfactionPercentage } from "../utils/satisfaction";

function rowToSurvey(row: Record<string, unknown>): Survey {
  return {
    id: row.id as number,
    agentId: row.agent_id as number,
    agentName: row.agent_name as string,
    patientName: row.patient_name as string,
    medicalNumber: row.medical_number as string,
    roomNumber: row.room_number as string,
    phoneNumber: row.phone_number as string,
    doctorName: row.doctor_name as string,
    enterDate: (row.enter_date as Date).toISOString(),
    interviewType: row.interview_type as Survey["interviewType"],
    clinicType: row.clinic_type as Survey["clinicType"],
    isSatisfied: row.is_satisfied as boolean,
    recommend: row.recommend as Survey["recommend"],
    createdAt: (row.created_at as Date).toISOString(),
    followupStatus: (row.followup_status as Survey["followupStatus"]) ?? undefined,
    reminderText: (row.reminder_text as string) ?? undefined,
  };
}

export const surveyRepo = {
  async findById(id: number): Promise<Survey | null> {
    const res = await pool.query("SELECT * FROM surveys WHERE id = $1", [id]);
    return res.rows[0] ? rowToSurvey(res.rows[0]) : null;
  },

  async detail(id: number): Promise<{ survey: Survey; answers: DetailedAnswer[] } | null> {
    const surveyRow = await pool.query("SELECT * FROM surveys WHERE id = $1", [id]);
    if (!surveyRow.rows[0]) return null;
    const survey = rowToSurvey(surveyRow.rows[0]);

    const answersRes = await pool.query(
      `SELECT a.id, a.question_id, a.score,
              COALESCE(q.text, 'سؤال مجهول') AS question_text,
              COALESCE(q.category, 'أخرى')   AS category,
              COALESCE(q.priority, 'Medium')  AS priority
       FROM answers a
       LEFT JOIN questions q ON q.id = a.question_id
       WHERE a.survey_id = $1
       ORDER BY a.id`,
      [id],
    );

    const answers: DetailedAnswer[] = answersRes.rows.map((row) => ({
      id: row.id as number,
      questionId: row.question_id as number,
      questionText: row.question_text as string,
      category: row.category as string,
      priority: row.priority as string,
      score: row.score as number,
    }));

    return {
      survey: { ...survey, satisfactionPercentage: computeSatisfactionPercentage(
        answers.map((a) => ({ id: a.id, surveyId: id, questionId: a.questionId, score: a.score })),
      )} as Survey & { satisfactionPercentage: number },
      answers,
    };
  },

  async create(data: {
    agentId: number;
    agentName: string;
    patientName: string;
    medicalNumber: string;
    roomNumber: string;
    phoneNumber: string;
    doctorName: string;
    enterDate: string;
    interviewType: Survey["interviewType"];
    clinicType: Survey["clinicType"];
    isSatisfied: boolean;
    recommend: Survey["recommend"];
  }): Promise<Survey> {
    const res = await pool.query(
      `INSERT INTO surveys (agent_id, agent_name, patient_name, medical_number,
         room_number, phone_number, doctor_name, enter_date,
         interview_type, clinic_type, is_satisfied, recommend)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        data.agentId, data.agentName, data.patientName, data.medicalNumber,
        data.roomNumber, data.phoneNumber, data.doctorName, data.enterDate,
        data.interviewType, data.clinicType, data.isSatisfied, data.recommend,
      ],
    );
    return rowToSurvey(res.rows[0]);
  },

  async update(id: number, fields: Record<string, unknown>): Promise<Survey | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      patientName: "patient_name",
      medicalNumber: "medical_number",
      roomNumber: "room_number",
      phoneNumber: "phone_number",
      doctorName: "doctor_name",
      enterDate: "enter_date",
      interviewType: "interview_type",
      clinicType: "clinic_type",
      isSatisfied: "is_satisfied",
      recommend: "recommend",
      followupStatus: "followup_status",
      reminderText: "reminder_text",
    };

    for (const [key, value] of Object.entries(fields)) {
      const col = fieldMap[key];
      if (col) {
        setClauses.push(`${col} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const res = await pool.query(
      `UPDATE surveys SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return res.rows[0] ? rowToSurvey(res.rows[0]) : null;
  },

  async deleteById(id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM surveys WHERE id = $1", [id]);
    return (res.rowCount ?? 0) > 0;
  },

  async archive(params: {
    clinicType?: string;
    interviewType?: string;
    satisfaction?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }): Promise<{ surveys: SurveyWithSatisfaction[]; pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  }}> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.clinicType && params.clinicType !== "جميع العيادات" && params.clinicType !== "الكل") {
      conditions.push(`s.clinic_type = $${idx}`);
      values.push(params.clinicType);
      idx++;
    }
    if (params.interviewType && params.interviewType !== "الكل" && params.interviewType !== "جميع المقابلات") {
      conditions.push(`s.interview_type = $${idx}`);
      values.push(params.interviewType);
      idx++;
    }
    if (params.satisfaction && params.satisfaction !== "الكل") {
      if (["Satisfied", "راضٍ", "راضٍ جداً"].includes(params.satisfaction)) {
        conditions.push("s.is_satisfied = TRUE");
      } else if (["Unsatisfied", "غير راضٍ", "مستاء"].includes(params.satisfaction)) {
        conditions.push("s.is_satisfied = FALSE");
      }
    }
    if (params.search && params.search.trim() !== "") {
      conditions.push(
        `(LOWER(s.patient_name) LIKE LOWER($${idx}) OR LOWER(s.medical_number) LIKE LOWER($${idx}) OR LOWER(s.doctor_name) LIKE LOWER($${idx}) OR LOWER(s.phone_number) LIKE LOWER($${idx}))`,
      );
      values.push(`%${params.search}%`);
      idx++;
    }
    if (params.startDate) {
      conditions.push(`s.created_at >= $${idx}`);
      values.push(params.startDate);
      idx++;
    }
    if (params.endDate) {
      conditions.push(`s.created_at <= $${idx}::timestamptz + INTERVAL '1 day' - INTERVAL '1 millisecond'`);
      values.push(params.endDate);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count total
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM surveys s ${whereClause}`,
      values,
    );
    const totalCount = countRes.rows[0].cnt;
    const totalPages = Math.max(1, Math.ceil(totalCount / params.limit));
    const safePage = Math.min(params.page, totalPages);
    const offset = (safePage - 1) * params.limit;

    // Fetch page with computed satisfaction %
    const pageRes = await pool.query(
      `SELECT s.*,
              COALESCE(
                ROUND(
                  (SELECT SUM(a.score)::numeric / NULLIF(COUNT(a.id) * 5.0, 0) * 100
                   FROM answers a WHERE a.survey_id = s.id),
                0),
              0) AS satisfaction_percentage
       FROM surveys s
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, params.limit, offset],
    );

    const surveys: SurveyWithSatisfaction[] = pageRes.rows.map((row) => ({
      ...rowToSurvey(row),
      satisfactionPercentage: parseInt(row.satisfaction_percentage as string, 10) || 0,
    }));

    return {
      surveys,
      pagination: { currentPage: safePage, totalPages, totalCount, limit: params.limit },
    };
  },

  async analytics(params: {
    clinicType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Analytics> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.clinicType && params.clinicType !== "جميع العيادات" && params.clinicType !== "الكل") {
      conditions.push(`s.clinic_type = $${idx}`);
      values.push(params.clinicType);
      idx++;
    }
    if (params.startDate) {
      conditions.push(`s.created_at >= $${idx}`);
      values.push(params.startDate);
      idx++;
    }
    if (params.endDate) {
      conditions.push(`s.created_at <= $${idx}::timestamptz + INTERVAL '1 day' - INTERVAL '1 millisecond'`);
      values.push(params.endDate);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Overall stats
    const statsRes = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_satisfied = TRUE)::int AS satisfied_count
       FROM surveys s ${whereClause}`,
      values,
    );
    const total = statsRes.rows[0].total;
    const satisfiedCount = statsRes.rows[0].satisfied_count;

    // Per-category stats
    const catRes = await pool.query(
      `SELECT c.name_english AS category,
              c.name_arabic  AS title_arabic,
              COALESCE(SUM(a.score), 0) AS total_score,
              COUNT(a.id) AS answer_count
       FROM categories c
       LEFT JOIN questions q ON LOWER(q.category) = LOWER(c.name_english)
       LEFT JOIN answers a ON a.question_id = q.id
         AND a.survey_id IN (SELECT id FROM surveys s ${whereClause})
       GROUP BY c.id, c.name_english, c.name_arabic
       ORDER BY c.id`,
      values,
    );

    const departmentStats: DepartmentStat[] = catRes.rows.map((row) => {
      const count = parseInt(row.answer_count, 10);
      const totalScore = parseInt(row.total_score, 10);
      return {
        category: row.category,
        titleArabic: row.title_arabic,
        averageScore: count ? parseFloat((totalScore / count).toFixed(2)) : 0,
        averagePercent: count ? Math.round((totalScore / (count * 5)) * 100) : 0,
        totalAnswersCount: count,
      };
    });

    // Critical cases
    const critRes = await pool.query(
      `SELECT s.id, s.medical_number, s.patient_name, s.doctor_name,
              s.enter_date, s.recommend, s.created_at,
              s.followup_status, s.reminder_text
       FROM surveys s
       ${whereClause ? `${whereClause} AND` : 'WHERE'} s.is_satisfied = FALSE
       ORDER BY s.created_at DESC`,
      values,
    );

    const criticalCases = critRes.rows.map((row) => ({
      id: row.id,
      medicalNumber: row.medical_number,
      patientName: row.patient_name,
      doctorName: row.doctor_name,
      enterDate: (row.enter_date as Date).toISOString(),
      recommend: row.recommend,
      createdAt: (row.created_at as Date).toISOString(),
      followupStatus: ((row.followup_status as string) ?? "قيد العمل") as "تم الحل" | "قيد العمل",
      reminderText: (row.reminder_text as string) ?? "",
    }));

    return {
      overallSatisfactionPercent: total ? Math.round((satisfiedCount / total) * 100) : 0,
      satisfiedCount,
      unsatisfiedCount: total - satisfiedCount,
      totalSurveys: total,
      departmentStats,
      criticalCases,
    };
  },
};
