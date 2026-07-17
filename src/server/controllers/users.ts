import { Router } from "express";
import { getDB, saveDB, hashPassword, migrateLegacyPasswords } from "../utils/db";
import { validate } from "../middleware/validate";
import { requireAdmin, requireAnyAuthenticated } from "../middleware/auth";
import { createUserSchema } from "../schemas";
import type { User } from "../types";

export const usersRouter = Router();

// Admin can list users; authenticated users also reach this — restrict to admin only.
usersRouter.get("/", requireAdmin, (_req, res) => {
  const db = getDB();
  res.json(db.users.map(({ password, ...u }) => u));
});

// Migration endpoint-ish: ensure existing seed passwords are hashed before they are read.
usersRouter.post("/", requireAdmin, validate({ body: createUserSchema }), (req, res) => {
  const { name, username, password, role } = req.body;
  const db = getDB();
  if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    res.status(400).json({ error: "اسم المستخدم هذا مسجل بالفعل." });
    return;
  }
  const newUser: User = {
    id: db.users.length ? Math.max(...db.users.map((u) => u.id)) + 1 : 1,
    name,
    username,
    password: hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  saveDB(db);
  const { password: _pw, ...publicUser } = newUser;
  res.status(201).json(publicUser);
});

usersRouter.delete("/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const db = getDB();
  // Prevent deleting the only remaining admin to avoid lock-out.
  if (!db.users.some((u) => u.id === id)) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  const remainingAdmins = db.users.filter((u) => u.role === "Admin" && u.id !== id);
  if (remainingAdmins.length === 0 && db.users.find((u) => u.id === id)?.role === "Admin") {
    res.status(400).json({ error: "يجب وجود مدير نظام واحد على الأقل." });
    return;
  }
  db.users = db.users.filter((u) => u.id !== id);
  saveDB(db);
  res.json({ message: "تم حذف المستخدم بنجاح." });
});

// Ensure plaintext seed passwords get migrated at boot.
void migrateLegacyPasswords;
