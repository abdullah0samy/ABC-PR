import { pool } from "../db/pool";
import type { Category } from "../types";

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as number,
    nameEnglish: row.name_english as string,
    nameArabic: row.name_arabic as string,
  };
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, nameEnglish: "Medical", nameArabic: "طبي" },
  { id: 2, nameEnglish: "Nursing", nameArabic: "تمريض" },
  { id: 3, nameEnglish: "Hospitality", nameArabic: "ضيافة" },
  { id: 4, nameEnglish: "Security", nameArabic: "أمن" },
];

export { DEFAULT_CATEGORIES };

export const categoryRepo = {
  async listAll(): Promise<Category[]> {
    const res = await pool.query("SELECT * FROM categories ORDER BY id");
    if (res.rows.length === 0) {
      // Seed defaults (mirrors old behavior)
      for (const c of DEFAULT_CATEGORIES) {
        await pool.query(
          `INSERT INTO categories (id, name_english, name_arabic)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [c.id, c.nameEnglish, c.nameArabic],
        );
      }
      return [...DEFAULT_CATEGORIES];
    }
    return res.rows.map(rowToCategory);
  },

  async findByNameEnglish(name: string): Promise<Category | null> {
    const res = await pool.query(
      "SELECT * FROM categories WHERE LOWER(name_english) = LOWER($1)",
      [name],
    );
    return res.rows[0] ? rowToCategory(res.rows[0]) : null;
  },

  async findById(id: number): Promise<Category | null> {
    const res = await pool.query("SELECT * FROM categories WHERE id = $1", [id]);
    return res.rows[0] ? rowToCategory(res.rows[0]) : null;
  },

  async create(nameEnglish: string, nameArabic: string): Promise<Category> {
    const res = await pool.query(
      `INSERT INTO categories (name_english, name_arabic)
       VALUES ($1, $2) RETURNING *`,
      [nameEnglish, nameArabic],
    );
    return rowToCategory(res.rows[0]);
  },

  async deleteById(id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM categories WHERE id = $1", [id]);
    return (res.rowCount ?? 0) > 0;
  },

  async count(): Promise<number> {
    const res = await pool.query("SELECT COUNT(*)::int AS cnt FROM categories");
    return res.rows[0].cnt;
  },
};
