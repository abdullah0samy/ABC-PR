import { Router } from "express";
import { signToken } from "../utils/auth";
import { validate } from "../middleware/validate";
import { loginSchema } from "../schemas";
import { userRepo } from "../repositories";
import { verifyPassword } from "../utils/db";
import type { PublicUser } from "../types";

export const authRouter = Router();

authRouter.post("/login", validate({ body: loginSchema }), async (req, res) => {
  const { username, password } = req.body;
  const user = await userRepo.findByUsername(username);
  if (!user || !verifyPassword(password, user.password)) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." });
    return;
  }
  const { password: _pw, ...publicUser } = user;
  const token = signToken(publicUser as PublicUser);
  res.json({ user: publicUser, token });
});
