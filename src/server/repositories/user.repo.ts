import { pool } from "../db/pool";
import type { User, PublicUser } from "../types";

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    name: row.name as string,
    username: row.username as string,
    password: row.password as string,
    role: row.role as User["role"],
    createdAt: (row.created_at as Date).toISOString(),
  };
}

function rowToPublic(row: Record<string, unknown>): PublicUser {
  const u = rowToUser(row);
  return { id: u.id, name: u.name, username: u.username, role: u.role, createdAt: u.createdAt };
}

export const userRepo = {
  async findByUsername(username: string): Promise<User | null> {
    const res = await pool.query(
      "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
      [username],
    );
    return res.rows[0] ? rowToUser(res.rows[0]) : null;
  },

  async findById(id: number): Promise<User | null> {
    const res = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows[0] ? rowToUser(res.rows[0]) : null;
  },

  async listAll(): Promise<PublicUser[]> {
    const res = await pool.query("SELECT * FROM users ORDER BY id");
    return res.rows.map(rowToPublic);
  },

  async create(data: { name: string; username: string; password: string; role: User["role"] }): Promise<PublicUser> {
    const res = await pool.query(
      `INSERT INTO users (name, username, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name, data.username, data.password, data.role],
    );
    return rowToPublic(res.rows[0]);
  },

  async deleteById(id: number): Promise<boolean> {
    const res = await pool.query("DELETE FROM users WHERE id = $1", [id]);
    return (res.rowCount ?? 0) > 0;
  },

  async countAdmins(): Promise<number> {
    const res = await pool.query("SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'Admin'");
    return res.rows[0].cnt;
  },

  async countAll(): Promise<number> {
    const res = await pool.query("SELECT COUNT(*)::int AS cnt FROM users");
    return res.rows[0].cnt;
  },
};
