import { pool } from "../db/pool";
import type { Question, QuestionCategory, QuestionPriority } from "../types";

function rowToQuestion(row: Record<string, unknown>): Question {
  return {
    id: row.id as number,
    templateId: row.template_id as number,
    text: row.text as string,
    category: row.category as QuestionCategory,
    priority: row.priority as QuestionPriority,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export const questionRepo = {
  async listAll(): Promise<Question[]> {
    const res = await pool.query("SELECT * FROM questions ORDER BY id");
    return res.rows.map(rowToQuestion);
  },

  async findById(id: number): Promise<Question | null> {
    const res = await pool.query("SELECT * FROM questions WHERE id = $1", [id]);
    return res.rows[0] ? rowToQuestion(res.rows[0]) : null;
  },

  async listByTemplateId(templateId: number): Promise<Question[]> {
    const res = await pool.query(
      "SELECT * FROM questions WHERE template_id = $1 ORDER BY id",
      [templateId],
    );
    return res.rows.map(rowToQuestion);
  },

  async create(data: {
    templateId: number;
    text: string;
    category: QuestionCategory;
    priority: QuestionPriority;
  }): Promise<Question> {
    const res = await pool.query(
      `INSERT INTO questions (template_id, text, category, priority)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.templateId, data.text, data.category, data.priority],
    );
    return rowToQuestion(res.rows[0]);
  },

  async deleteById(id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM questions WHERE id = $1", [id]);
    return (res.rowCount ?? 0) > 0;
  },
};
