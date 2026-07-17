import { pool } from "../db/pool";
import type { Answer } from "../types";

function rowToAnswer(row: Record<string, unknown>): Answer {
  return {
    id: row.id as number,
    surveyId: row.survey_id as number,
    questionId: row.question_id as number,
    score: row.score as number,
  };
}

export const answerRepo = {
  async findBySurveyId(surveyId: number): Promise<Answer[]> {
    const res = await pool.query(
      "SELECT * FROM answers WHERE survey_id = $1 ORDER BY id",
      [surveyId],
    );
    return res.rows.map(rowToAnswer);
  },

  async createBulk(
    client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
    surveyId: number,
    answers: { questionId: number; score: number }[],
  ): Promise<Answer[]> {
    const created: Answer[] = [];
    for (let i = 0; i < answers.length; i++) {
      const res = await client.query(
        `INSERT INTO answers (survey_id, question_id, score)
         VALUES ($1, $2, $3) RETURNING *`,
        [surveyId, answers[i].questionId, answers[i].score],
      ) as { rows: Record<string, unknown>[] };
      created.push(rowToAnswer(res.rows[0]));
    }
    return created;
  },

  async createBulkSimple(surveyId: number, answers: { questionId: number; score: number }[]): Promise<Answer[]> {
    const created: Answer[] = [];
    for (const a of answers) {
      const res = await pool.query(
        `INSERT INTO answers (survey_id, question_id, score)
         VALUES ($1, $2, $3) RETURNING *`,
        [surveyId, a.questionId, a.score],
      );
      created.push(rowToAnswer(res.rows[0]));
    }
    return created;
  },

  async deleteBySurveyId(surveyId: number): Promise<void> {
    await pool.query("DELETE FROM answers WHERE survey_id = $1", [surveyId]);
  },
};
