import { Router } from "express";
import { validate } from "../middleware/validate";
import { requireAdmin } from "../middleware/auth";
import { createUserSchema } from "../schemas";
import { userRepo } from "../repositories";
import { hashPassword } from "../utils/db";

export const usersRouter = Router();

usersRouter.get("/", requireAdmin, async (_req, res) => {
  const users = await userRepo.listAll();
  res.json(users);
});

usersRouter.post("/", requireAdmin, validate({ body: createUserSchema }), async (req, res) => {
  const { name, username, password, role } = req.body;
  const existing = await userRepo.findByUsername(username);
  if (existing) {
    res.status(400).json({ error: "اسم المستخدم هذا مسجل بالفعل." });
    return;
  }
  const newUser = await userRepo.create({
    name,
    username,
    password: hashPassword(password),
    role,
  });
  res.status(201).json(newUser);
});

usersRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  const user = await userRepo.findById(id);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  if (user.role === "Admin") {
    const adminCount = await userRepo.countAdmins();
    if (adminCount <= 1) {
      res.status(400).json({ error: "يجب وجود مدير نظام واحد على الأقل." });
      return;
    }
  }
  await userRepo.deleteById(id);
  res.json({ message: "تم حذف المستخدم بنجاح." });
});
