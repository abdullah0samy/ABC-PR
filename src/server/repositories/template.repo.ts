import { pool } from "../db/pool";
import type { Template } from "../types";

function rowToTemplate(row: Record<string, unknown>): Template {
  return {
    id: row.id as number,
    title: row.title as Template["title"],
    isActive: row.is_active as boolean,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export const templateRepo = {
  async listAll(): Promise<Template[]> {
    const res = await pool.query("SELECT * FROM templates ORDER BY id");
    return res.rows.map(rowToTemplate);
  },

  async findById(id: number): Promise<Template | null> {
    const res = await pool.query("SELECT * FROM templates WHERE id = $1", [id]);
    return res.rows[0] ? rowToTemplate(res.rows[0]) : null;
  },
};
